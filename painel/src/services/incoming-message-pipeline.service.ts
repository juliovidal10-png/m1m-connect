import {
  openAIProviderService,
} from "@/core/ai/openai-provider.service";
import {
  promptBuilderService,
} from "@/core/ai/prompt-builder.service";
import {
  contextBuilderService,
} from "@/core/context/context-builder.service";
import {
  sectorMenuService,
} from "@/core/router/sector-menu.service";
import {
  routerService,
} from "@/core/router/router.service";
import {
  M1MMessageType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  automaticMessageService,
} from "@/services/automatic-message.service";
import {
  automaticOutgoingRegistryService,
} from "@/services/automatic-outgoing-registry.service";
import {
  conversationSyncService,
} from "@/services/conversation-sync.service";
import {
  humanTakeoverService,
} from "@/services/human-takeover.service";
import {
  messageService,
} from "@/services/message.service";
import {
  outOfHoursService,
} from "@/services/out-of-hours.service";
import {
  sectorAvailabilityService,
} from "@/services/sector-availability.service";

const DEFAULT_INSTANCE =
  process.env.INSTANCE_NAME?.trim() ||
  process.env.DEFAULT_INSTANCE?.trim() ||
  "Financeiro";

type PipelineOptions = {
  dryRun?: boolean;
};

function isUnsupportedConversation(
  remoteJid: string,
) {
  const normalizedRemoteJid =
    remoteJid.trim().toLowerCase();

  return (
    normalizedRemoteJid.endsWith("@g.us") ||
    normalizedRemoteJid.endsWith("@broadcast") ||
    normalizedRemoteJid === "status@broadcast"
  );
}

export const incomingMessagePipelineService = {
  async process(
    rawMessage: unknown,
    instanceName = DEFAULT_INSTANCE,
    options?: PipelineOptions,
  ) {
    const normalizedMessage =
      conversationSyncService.normalizeMessage(
        rawMessage,
      );

    if (!normalizedMessage) {
      return {
        processed: false,
        action:
          "INVALID_MESSAGE" as const,
      };
    }

    if (
      isUnsupportedConversation(
        normalizedMessage.remoteJid,
      )
    ) {
      return {
        processed: false,
        action:
          "UNSUPPORTED_CONVERSATION_IGNORED" as const,
        remoteJid:
          normalizedMessage.remoteJid,
      };
    }

    const companyId =
      getCurrentCompanyId();

    const storedMessage =
      await conversationSyncService.syncIncomingMessage(
        rawMessage,
        instanceName,
      );

    const processingClaimed =
      await messageService.claimProcessing(
        storedMessage.id,
      );

    if (!processingClaimed) {
      return {
        processed: false,
        action:
          "ALREADY_PROCESSING_OR_PROCESSED" as const,
        messageId:
          storedMessage.id,
      };
    }

    try {
      if (normalizedMessage.fromMe) {
        const isAutomatic =
          automaticOutgoingRegistryService.isAutomatic(
            instanceName,
            normalizedMessage.remoteJid,
            normalizedMessage.content ?? "",
            normalizedMessage.evolutionMessageId,
          );

        if (isAutomatic) {
          return {
            processed: true,
            action:
              "AUTOMATIC_OUTGOING_MESSAGE_IGNORED" as const,
            messageId:
              storedMessage.id,
          };
        }

        const takeover =
          await humanTakeoverService.process({
            companyId,
            customerId:
              storedMessage.customerId,
            remoteJid:
              normalizedMessage.remoteJid,
            evolutionMessageId:
              normalizedMessage.evolutionMessageId,
          });

        return {
          processed: true,
          action:
            "HUMAN_TAKEOVER_DETECTED" as const,
          messageId:
            storedMessage.id,
          takeover,
        };
      }

      const router =
        await routerService.execute({
          companyId,
          customerId:
            storedMessage.customerId,
          remoteJid:
            normalizedMessage.remoteJid,
          instanceName,
          messageContent:
            normalizedMessage.content,
          payload:
            rawMessage,
        });

      if (
        router.requiresSectorIdentification
      ) {
        const company =
          await prisma.m1MCompany.findUnique({
            where: {
              id: companyId,
            },
            select: {
              name: true,
            },
          });

        const sectorMenuMessage =
          sectorMenuService.buildMessage(
            router.availableSectors ?? [],
            company?.name,
          );

        if (options?.dryRun) {
          return {
            processed: true,
            action:
              "SECTOR_MENU_SIMULATED" as const,
            messageId:
              storedMessage.id,
            router,
            simulatedMessage:
              sectorMenuMessage,
          };
        }

        await automaticMessageService.sendText({
          companyId,
          customerId:
            storedMessage.customerId,
          attendanceId:
            router.attendanceId,
          instanceName,
          remoteJid:
            normalizedMessage.remoteJid,
          text:
            sectorMenuMessage,
        });

        return {
          processed: true,
          action:
            "SECTOR_MENU_SENT" as const,
          messageId:
            storedMessage.id,
          router,
        };
      }

      if (router.state === "HUMANO") {
        return {
          processed: true,
          action:
            "HUMAN_ATTENDANCE_ACTIVE" as const,
          messageId:
            storedMessage.id,
          router,
        };
      }

      const availability =
        await sectorAvailabilityService.isCompanyOpenNow(
          companyId,
          {
            timeZone:
              "America/Cuiaba",
          },
        );

      if (!availability.isOpen) {
        const outOfHoursMessage =
          await outOfHoursService.getCompanyMessage(
            companyId,
          );

        if (options?.dryRun) {
          return {
            processed: true,
            action:
              "OUT_OF_HOURS_SIMULATED" as const,
            messageId:
              storedMessage.id,
            router,
            availability,
            simulatedMessage:
              outOfHoursMessage,
          };
        }

        await automaticMessageService.sendText({
          companyId,
          customerId:
            storedMessage.customerId,
          attendanceId:
            router.attendanceId,
          instanceName,
          remoteJid:
            normalizedMessage.remoteJid,
          text:
            outOfHoursMessage,
        });

        return {
          processed: true,
          action:
            "OUT_OF_HOURS_SENT" as const,
          messageId:
            storedMessage.id,
          router,
          availability,
        };
      }

      const messageContent =
        normalizedMessage.content?.trim();

      if (
        normalizedMessage.type !==
          M1MMessageType.TEXT ||
        !messageContent ||
        !router.sectorId
      ) {
        return {
          processed: true,
          action:
            "AI_RESPONSE_SKIPPED" as const,
          reason:
            normalizedMessage.type !==
            M1MMessageType.TEXT
              ? "UNSUPPORTED_MESSAGE_TYPE"
              : !messageContent
                ? "EMPTY_MESSAGE"
                : "SECTOR_NOT_DEFINED",
          messageId:
            storedMessage.id,
          router,
          availability,
        };
      }

      const context =
        await contextBuilderService.buildSectorContext(
          companyId,
          router.sectorId,
        );

      const prompt =
        promptBuilderService.build({
          context,
          customerMessage:
            messageContent,
        });

      const aiResponse =
        await openAIProviderService.generateResponse({
          systemPrompt:
            prompt.systemPrompt,
          userPrompt:
            prompt.userPrompt,
        });

      if (options?.dryRun) {
        return {
          processed: true,
          action:
            "AI_RESPONSE_SIMULATED" as const,
          messageId:
            storedMessage.id,
          router,
          availability,
          simulatedMessage:
            aiResponse.text,
          ai: {
            model:
              aiResponse.model,
            responseId:
              aiResponse.responseId,
            inputTokens:
              aiResponse.inputTokens,
            outputTokens:
              aiResponse.outputTokens,
            totalTokens:
              aiResponse.totalTokens,
          },
        };
      }

      await automaticMessageService.sendText({
        companyId,
        customerId:
          storedMessage.customerId,
        attendanceId:
          router.attendanceId,
        instanceName,
        remoteJid:
          normalizedMessage.remoteJid,
        text:
          aiResponse.text,
      });

      return {
        processed: true,
        action:
          "AI_RESPONSE_SENT" as const,
        messageId:
          storedMessage.id,
        router,
        availability,
        ai: {
          model:
            aiResponse.model,
          responseId:
            aiResponse.responseId,
          inputTokens:
            aiResponse.inputTokens,
          outputTokens:
            aiResponse.outputTokens,
          totalTokens:
            aiResponse.totalTokens,
        },
      };
    } catch (error) {
      await messageService.releaseProcessing(
        storedMessage.id,
      );

      throw error;
    }
  },
};

import {
  routerService,
} from "@/core/router/router.service";
import {
  sendTextMessage,
} from "@/lib/evolution";
import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  conversationSyncService,
} from "@/services/conversation-sync.service";
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

    const companyId =
      getCurrentCompanyId();

    const existingMessage =
      await messageService.getMessageByEvolutionId(
        companyId,
        instanceName,
        normalizedMessage.evolutionMessageId,
      );

    if (
      existingMessage?.processedAt
    ) {
      return {
        processed: false,
        action:
          "ALREADY_PROCESSED" as const,
        messageId:
          existingMessage.id,
      };
    }

    const storedMessage =
      await conversationSyncService.syncIncomingMessage(
        rawMessage,
        instanceName,
      );

    if (normalizedMessage.fromMe) {
      if (!storedMessage.processedAt) {
        await messageService.markAsProcessed(
          storedMessage.id,
        );
      }

      return {
        processed: true,
        action:
          "OUTGOING_MESSAGE_IGNORED" as const,
        messageId:
          storedMessage.id,
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

    /*
     * Ainda não enviamos mensagem fora do expediente
     * enquanto o setor não tiver sido identificado.
     *
     * A próxima etapa será ligar a IA ao Router para:
     * 1. recepcionar o cliente;
     * 2. entender o assunto;
     * 3. identificar o setor;
     * 4. encaminhar o atendimento;
     * 5. só então aplicar a regra de expediente.
     */
    if (
      router.requiresSectorIdentification
    ) {
      await messageService.markAsProcessed(
        storedMessage.id,
      );

      return {
        processed: true,
        action:
          "AWAITING_SECTOR_IDENTIFICATION" as const,
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

    if (availability.isOpen) {
      await messageService.markAsProcessed(
        storedMessage.id,
      );

      return {
        processed: true,
        action:
          "COMPANY_OPEN" as const,
        messageId:
          storedMessage.id,
        router,
        availability,
      };
    }

    const outOfHoursMessage =
      await outOfHoursService.getCompanyMessage(
        companyId,
      );

    if (options?.dryRun) {
      await messageService.markAsProcessed(
        storedMessage.id,
      );

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

    await sendTextMessage(
      normalizedMessage.remoteJid,
      outOfHoursMessage,
      instanceName,
    );

    await messageService.markAsProcessed(
      storedMessage.id,
    );

    return {
      processed: true,
      action:
        "OUT_OF_HOURS_SENT" as const,
      messageId:
        storedMessage.id,
      router,
      availability,
    };
  },
};

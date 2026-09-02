import { attendanceService } from "@/services/attendance.service";
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
  M1MAttendanceActorType,
  M1MMessageType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  companyAccessService,
} from "@/services/company-access.service";
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
  paymentReceiptService,
} from "@/services/payment-receipt.service";
import {
  paymentReceiptAnalysisService,
} from "@/services/payment-receipt-analysis.service";
import {
  paymentReceiptMediaService,
} from "@/services/payment-receipt-media.service";
import { receiptStorageService } from "@/services/storage/receipt-storage.service";
import {
  sectorAvailabilityService,
} from "@/services/sector-availability.service";

type PipelineOptions = {
  dryRun?: boolean;
  receiptOnly?: boolean;
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

function normalizeSearchText(
  value: string | null | undefined,
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isFinanceSectorName(
  sectorName: string | null | undefined,
) {
  const normalized =
    normalizeSearchText(sectorName);

  return (
    normalized.includes("financeiro") ||
    normalized.includes("financeira") ||
    normalized.includes("finance")
  );
}

const paymentReceiptHints = [
  "comprovante",
  "recibo",
  "pagamento",
  "pix",
  "transferencia",
  "deposito",
  "boleto pago",
];

function hasPaymentReceiptHint(
  content: string | null | undefined,
) {
  const normalized =
    normalizeSearchText(content);

  if (!normalized) {
    return false;
  }

  return paymentReceiptHints.some(
    (hint) =>
      normalized.includes(hint),
  );
}

function hasPaymentReceiptHintInPayload(
  payload: unknown,
) {
  try {
    const serialized =
      JSON.stringify(payload);

    if (!serialized) {
      return false;
    }

    return hasPaymentReceiptHint(
      serialized,
    );
  } catch {
    return false;
  }
}

function isReceiptMediaType(
  type: M1MMessageType,
) {
  return (
    type === M1MMessageType.IMAGE ||
    type === M1MMessageType.DOCUMENT
  );
}

export const incomingMessagePipelineService = {
  async process(
    rawMessage: unknown,
    instanceName: string,
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

    const normalizedInstanceName =
      instanceName.trim();

    if (!normalizedInstanceName) {
      throw new Error(
        "A instância do WhatsApp não foi identificada.",
      );
    }

    const company =
      await companyRepository.findByWhatsappInstanceName(
        normalizedInstanceName,
      );

    if (!company) {
      return {
        processed: false,
        action:
          "WHATSAPP_INSTANCE_NOT_LINKED" as const,
        instanceName:
          normalizedInstanceName,
      };
    }

    const companyId =
      company.id;

    const companyAccess =
      await companyAccessService.checkCompanyAccess(
        companyId,
      );

    if (!companyAccess.allowed) {
      return {
        processed: false,
        action:
          "COMPANY_ACCESS_BLOCKED" as const,
        companyId,
        subscriptionStatus:
          companyAccess.status,
        accessReason:
          companyAccess.reason,
      };
    }

    const storedMessage =
      await conversationSyncService.syncIncomingMessage(
        rawMessage,
        normalizedInstanceName,
        companyId,
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

    const processPaymentReceiptCandidate =
      async (input: {
        attendanceId:
          string | null;
        responsibleId:
          string | null;
        sectorId:
          string | null;
        sectorName:
          string | null;
      }) => {
        const isEligibleReceiptMedia =
          !options?.dryRun &&
          normalizedMessage.fromMe === false &&
          isReceiptMediaType(
            normalizedMessage.type,
          );

        if (!isEligibleReceiptMedia) {
          return null;
        }

        const hasTrustedReceiptSignal =
          isFinanceSectorName(
            input.sectorName,
          ) ||
          hasPaymentReceiptHint(
            normalizedMessage.content,
          ) ||
          hasPaymentReceiptHintInPayload(
            rawMessage,
          );

        let persistedMediaUrl =
          storedMessage.mediaUrl;

        let persistedFileName =
          normalizedMessage.type ===
          M1MMessageType.DOCUMENT
            ? normalizedMessage.content
            : null;

        let persistedMimeType =
          storedMessage.mimeType;

        try {
          const persistedMedia =
            await paymentReceiptMediaService.persistFromEvolution({
              instanceName:
                normalizedInstanceName,
              message:
                rawMessage,
              messageId:
                storedMessage.id,
              fallbackMimeType:
                storedMessage.mimeType,
              fallbackFileName:
                persistedFileName,
            });

          if (persistedMedia) {
            persistedMediaUrl =
              persistedMedia.mediaUrl;

            persistedFileName =
              persistedMedia.fileName;

            persistedMimeType =
              persistedMedia.mimeType;
          }
        } catch (mediaError) {
          console.warn(
            "[M1M COMPROVANTE] Não foi possível persistir a mídia localmente. Mantendo URL original.",
            mediaError,
          );
        }

        let receiptAnalysis: {
          isPaymentReceipt: boolean;
          amount: number | null;
          paymentMethod: string | null;
          identifiedBank: string | null;
          paidAt: Date | null;
        } = {
          isPaymentReceipt: false,
          amount: null,
          paymentMethod: null,
          identifiedBank: null,
          paidAt: null,
        };

        if (
          persistedMediaUrl && receiptStorageService.isManagedUrl(persistedMediaUrl)
        ) {
          try {
            receiptAnalysis =
              await paymentReceiptAnalysisService.analyzeLocalReceipt({
                mediaUrl:
                  persistedMediaUrl,
                mimeType:
                  persistedMimeType,
                fileName:
                  persistedFileName,
              });

            console.log(
              "[M1M COMPROVANTE] Dados extraídos automaticamente:",
              {
                messageId:
                  storedMessage.id,
                isPaymentReceipt:
                  receiptAnalysis.isPaymentReceipt,
                amount:
                  receiptAnalysis.amount,
                paymentMethod:
                  receiptAnalysis.paymentMethod,
                identifiedBank:
                  receiptAnalysis.identifiedBank,
                paidAt:
                  receiptAnalysis.paidAt,
              },
            );
          } catch (analysisError) {
            console.warn(
              "[M1M COMPROVANTE] Não foi possível analisar automaticamente o comprovante. O registro será criado sem dados financeiros extraídos.",
              analysisError,
            );
          }
        }

        if (
          !hasTrustedReceiptSignal &&
          !receiptAnalysis.isPaymentReceipt
        ) {
          console.log(
            "[M1M COMPROVANTE] Midia recebida analisada e descartada como comprovante:",
            {
              messageId:
                storedMessage.id,
              customerId:
                storedMessage.customerId,
              mimeType:
                persistedMimeType,
            },
          );

          return null;
        }

        const receipt =
          await paymentReceiptService.createReceipt(
            companyId,
            {
              customerId:
                storedMessage.customerId,
              attendanceId:
                input.attendanceId,
              messageId:
                storedMessage.id,
              responsibleId:
                input.responsibleId,
              mediaUrl:
                persistedMediaUrl,
              mimeType:
                persistedMimeType,
              fileName:
                persistedFileName,
              amount:
                receiptAnalysis.amount,
              paymentMethod:
                receiptAnalysis.paymentMethod,
              identifiedBank:
                receiptAnalysis.identifiedBank,
              paidAt:
                receiptAnalysis.paidAt,
              actorType:
                M1MAttendanceActorType.SYSTEM,
              actorId: null,
            },
          );

        console.log(
          "[M1M COMPROVANTE] Comprovante registrado automaticamente:",
          {
            receiptId:
              receipt.id,
            companyId,
            customerId:
              storedMessage.customerId,
            attendanceId:
              input.attendanceId,
            messageId:
              storedMessage.id,
            sectorId:
              input.sectorId,
            sectorName:
              input.sectorName,
            mimeType:
              storedMessage.mimeType,
            mediaUrl:
              persistedMediaUrl,
          },
        );

        return receipt;
      };

    if (options?.receiptOnly) {
      try {
        let attendanceId:
          string | null =
          storedMessage.attendanceId;

        let responsibleId:
          string | null = null;

        let sectorId:
          string | null = null;

        let sectorName:
          string | null = null;

        if (attendanceId) {
          const attendance =
            await prisma.m1MAttendance.findFirst({
              where: {
                id: attendanceId,
                companyId,
              },
              select: {
                responsibleId: true,
                sectorId: true,
              },
            });

          if (attendance) {
            responsibleId =
              attendance.responsibleId;

            sectorId =
              attendance.sectorId;

            if (sectorId) {
              const sector =
                await prisma.m1MSector.findFirst({
                  where: {
                    id: sectorId,
                    companyId,
                  },
                  select: {
                    name: true,
                  },
                });

              sectorName =
                sector?.name ?? null;
            }
          } else {
            attendanceId = null;
          }
        }

        const receipt =
          await processPaymentReceiptCandidate({
            attendanceId,
            responsibleId,
            sectorId,
            sectorName,
          });

        await messageService.markAsProcessed(
          storedMessage.id,
        );

        return {
          processed: true,
          action:
            receipt
              ? "PAYMENT_RECEIPT_RECONCILED" as const
              : "RECEIPT_MEDIA_RECONCILED" as const,
          messageId:
            storedMessage.id,
          receiptId:
            receipt?.id ?? null,
        };
      } catch (error) {
        await messageService.releaseProcessing(
          storedMessage.id,
        );

        throw error;
      }
    }

    try {
      if (normalizedMessage.fromMe) {
        const isAutomatic =
          automaticOutgoingRegistryService.isAutomatic(
            normalizedInstanceName,
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

        // VINCULO TAKEOVER MENSAGEM X ATENDIMENTO
        await messageService.attachMessageToAttendance(
          storedMessage.id,
          takeover.attendanceId,
        );

        const takeoverAttendance =
          await prisma.m1MAttendance.findFirst({
            where: {
              id:
                takeover.attendanceId,
              companyId,
            },
            select: {
              sectorId: true,
              sector: {
                select: {
                  name: true,
                },
              },
            },
          });

        await processPaymentReceiptCandidate({
          attendanceId:
            takeover.attendanceId,
          responsibleId:
            takeover.responsibleId,
          sectorId:
            takeoverAttendance?.sectorId ??
            null,
          sectorName:
            takeoverAttendance?.sector
              ?.name ?? null,
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

      let router =
        await routerService.execute({
          companyId,
          customerId:
            storedMessage.customerId,
          remoteJid:
            normalizedMessage.remoteJid,
      instanceName: normalizedInstanceName,
          messageContent:
            normalizedMessage.content,
          payload:
            rawMessage,
        });

      // NEXT_CONVERSATION_12H

      // Em NEXT_CONVERSATION, depois de 12 horas sem qualquer

      // interacao, a proxima mensagem recebida inicia novo

      // atendimento em IA.

      if (

        router.state === "HUMANO" &&

        router.attendanceId

      ) {

        const humanReturnPolicy =

          await prisma.m1MCompany.findUnique({

            where: {

              id: companyId,

            },

            select: {

              humanReturnMode: true,

            },

          });


        if (

          humanReturnPolicy?.humanReturnMode ===

          "NEXT_CONVERSATION"

        ) {

          const previousMessage =

            await prisma.m1MMessage.findFirst({

              where: {

                companyId,

                customerId:

                  storedMessage.customerId,

                id: {

                  not: storedMessage.id,

                },

                sentAt: {

                  lt: storedMessage.sentAt,

                },

              },

              orderBy: {

                sentAt: "desc",

              },

              select: {

                id: true,

                sentAt: true,

              },

            });


          const inactivityMs =

            previousMessage

              ? storedMessage.sentAt.getTime() -

                previousMessage.sentAt.getTime()

              : 0;


          const twelveHoursInMs =

            12 * 60 * 60 * 1000;


          if (

            previousMessage &&

            inactivityMs >= twelveHoursInMs

          ) {

            await attendanceService

              .finishHumanAttendanceForNextConversation(

                companyId,

                router.attendanceId,

              );


            router =

              await routerService.execute({

                companyId,

                customerId:

                  storedMessage.customerId,

                remoteJid:

                  normalizedMessage.remoteJid,

                instanceName:

                  normalizedInstanceName,

                messageContent:

                  normalizedMessage.content,

                payload:

                  rawMessage,

              });

          }

        }

      }

      // VINCULO ROUTER MENSAGEM X ATENDIMENTO
      if (router.attendanceId) {
        await messageService.attachMessageToAttendance(
          storedMessage.id,
          router.attendanceId,
        );
      }

      let resolvedSectorName =
        router.sectorName;

      if (
        !resolvedSectorName &&
        router.sectorId
      ) {
        const sector =
          await prisma.m1MSector.findFirst({
            where: {
              id: router.sectorId,
              companyId,
            },
            select: {
              name: true,
            },
          });

        resolvedSectorName =
          sector?.name ?? null;
      }

      await processPaymentReceiptCandidate({
        attendanceId:
          router.attendanceId,
        responsibleId:
          router.responsibleId,
        sectorId:
          router.sectorId,
        sectorName:
          resolvedSectorName,
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
      instanceName: normalizedInstanceName,
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

      if (
        router.sectorSelectionSource &&
        router.sectorName
      ) {
        const sectorConfirmationMessage =
          `Perfeito! Vamos seguir por aqui com o ${router.sectorName}. Me conta o que voc\u00ea precisa que eu te ajudo.`;

        if (options?.dryRun) {
          return {
            processed: true,
            action:
              "SECTOR_CONFIRMATION_SIMULATED" as const,
            messageId:
              storedMessage.id,
            router,
            simulatedMessage:
              sectorConfirmationMessage,
          };
        }

        await automaticMessageService.sendText({
          companyId,
          customerId:
            storedMessage.customerId,
          attendanceId:
            router.attendanceId,
          instanceName:
            normalizedInstanceName,
          remoteJid:
            normalizedMessage.remoteJid,
          text:
            sectorConfirmationMessage,
          sourceMessageId:
            storedMessage.id,
        });

        return {
          processed: true,
          action:
            "SECTOR_CONFIRMATION_SENT" as const,
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
      instanceName: normalizedInstanceName,
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
    instanceName: normalizedInstanceName,
        remoteJid:
          normalizedMessage.remoteJid,
        text:
          aiResponse.text,
      sourceMessageId:
          storedMessage.id,
      });
      if (aiResponse.needsHuman) {
        await attendanceService.requestHumanAttendanceByAI({
          companyId,
          attendanceId:
            router.attendanceId,
          sectorId:
            router.sectorId,
          handoffReason:
            aiResponse.handoffReason,
          subject:
            aiResponse.subject,
          context:
            aiResponse.context,
        });
      }

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
    } finally {
      /*
       * processingStartedAt = lock temporario.
       * processedAt = processamento realmente concluido.
       */
      const currentMessage =
        await prisma.m1MMessage.findUnique({
          where: {
            id: storedMessage.id,
          },
          select: {
            processingStartedAt: true,
            processedAt: true,
          },
        });

      if (
        currentMessage?.processingStartedAt &&
        !currentMessage.processedAt
      ) {
        await messageService.markAsProcessed(
          storedMessage.id,
        );
      }
    }
  },
};

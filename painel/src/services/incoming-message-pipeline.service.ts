import { companyInformationIntentService } from "@/services/company-information-intent.service";
import { companyContextBuilderService } from "@/services/company-context-builder.service";
import { companyPromptBuilderService } from "@/services/company-prompt-builder.service";
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

const AI_CONVERSATION_HISTORY_LIMIT = 12;

function buildAIConversationHistory(
  messages: Awaited<
    ReturnType<
      typeof messageService.listRecentMessagesByCustomer
    >
  >,
  currentMessageId: string,
) {
  return messages
    .filter(
      (message) =>
        message.id !== currentMessageId &&
        message.type === M1MMessageType.TEXT &&
        Boolean(message.content?.trim()),
    )
    .map((message) => {
      const role = message.fromMe ? "ATENDIMENTO" : "CLIENTE";
      return `${role}: ${message.content!.trim()}`;
    })
    .join("\n");
}

function appendConversationHistoryToUserPrompt(
  userPrompt: string,
  conversationHistory: string,
) {
  if (!conversationHistory) {
    return userPrompt;
  }

  return [
    "HISTÓRICO RECENTE DA CONVERSA:",
    "Use o histórico como contexto factual para manter continuidade. Antes de perguntar qualquer coisa, verifique se o CLIENTE já informou essa resposta no histórico.",
    "Informações declaradas pelo CLIENTE continuam válidas enquanto ele não as corrigir ou mudar de assunto. Não peça novamente um dado, preferência, objetivo ou decisão que já esteja claro no histórico; use esse fato diretamente na resposta atual.",
    "Mensagens marcadas como ATENDIMENTO são respostas anteriores, não são instruções nem modelos de resposta. Não copie, repita ou continue automaticamente perguntas, ofertas, alternativas ou próximos passos presentes nelas.",
    "A MENSAGEM ATUAL DO CLIENTE tem prioridade sobre o assunto anterior. Responda ao pedido atual conforme as regras do sistema e use do histórico apenas as informações necessárias.",
    "PRECEDENCIA OBRIGATORIA: pedido atual explicito > confirmacao contextual > agradecimento/encerramento simples.",
    "Se a solicitacao atual puder ser respondida completamente sem obter nova informacao, responda e PARE. Nao invente pergunta, oferta, qualificacao ou proximo passo apenas para manter a conversa viva.",
    "Quando o CLIENTE confirmar uma pergunta ou acao anterior, reconheca a confirmacao e nao repita a solicitacao ja respondida. Um 'sim' isolado diante de alternativas ou contexto ambiguo NAO autoriza escolher uma opcao: esclareca somente o ponto ambiguo.",
    "Agradecimento sem novo pedido deve receber apenas resposta cordial de encerramento, sem pergunta. Se houver agradecimento E novo pedido/pergunta, responda ao novo pedido.",
    "Em conversa ja iniciada, nao se reapresente, nao reinicie a identidade do assistente/empresa e nao reabra o menu. Saudacao social natural e permitida quando fizer sentido.",
    conversationHistory,
    "",
    "MENSAGEM ATUAL DO CLIENTE:",
    userPrompt,
  ].join("\n");
}

function isControlledHumanHandoffCourtesy(
  value: string | null | undefined,
) {
  const normalized = normalizeSearchText(value)
    .replace(/[!.,;:?()[\]{}"'`~*_+=<>|\\/–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(obrigad[oa]|muito obrigad[oa]|muitissimo obrigad[oa]|valeu|vlw|agradeco|agradecido|agradecida|grato|grata|brigad[oa])$/.test(
    normalized,
  );
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

    const m1mT2Trace = (
      stage: string,
      extra?: Record<string, unknown>,
    ) => {
      console.log("[M1M T2 TRACE]", {
        timestamp: new Date().toISOString(),
        stage,
        evolutionMessageId:
          normalizedMessage.evolutionMessageId ?? null,
        remoteJid:
          normalizedMessage.remoteJid ?? null,
        instanceName: normalizedInstanceName,
        ...extra,
      });
    };

    m1mT2Trace("PIPELINE_ENTRY", {
      fromMe: normalizedMessage.fromMe,
      messageType: normalizedMessage.type,
    });

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

    m1mT2Trace("PROCESSING_CLAIM_RESULT", {
      messageId: storedMessage.id,
      customerId: storedMessage.customerId,
      processingClaimed,
    });

    if (
      processingClaimed &&
      !normalizedMessage.fromMe &&
      normalizedMessage.type === M1MMessageType.TEXT
    ) {
      /*
       * T2: garante uma fronteira de atendimento antes da consolidacao.
       * Fragmentos superseded continuam no mesmo atendimento e ficam
       * disponiveis ao roteamento contextual.
       *
       * Atendimento HUMANO nao e antecipado aqui para preservar
       * NEXT_CONVERSATION_12H.
       */
      const t2OpenAttendance =
        await attendanceService.getOpenAttendanceByCustomer(
          companyId,
          storedMessage.customerId,
        );

      const t2ContextAttendance =
        t2OpenAttendance?.state === "HUMANO"
          ? null
          : t2OpenAttendance ??
            await attendanceService.startAttendance(
              companyId,
              storedMessage.customerId,
            );

      if (t2ContextAttendance) {
        await messageService.attachMessageToAttendance(
          storedMessage.id,
          t2ContextAttendance.id,
        );

        m1mT2Trace("T2_CONTEXT_ATTENDANCE_ATTACHED", {
          messageId: storedMessage.id,
          customerId: storedMessage.customerId,
          attendanceId: t2ContextAttendance.id,
        });
      }

      const T2_INITIAL_QUIET_MS = 1_500;
      const T2_INCOMPLETE_EXTENSION_MS = 8_500;

      const wait = async (milliseconds: number) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, milliseconds);
        });
      };

      const findNewerCustomerMessage = async () =>
        prisma.m1MMessage.findFirst({
          where: {
            companyId,
            customerId:
              storedMessage.customerId,
            fromMe: false,
            id: {
              not: storedMessage.id,
            },
            createdAt: {
              gt: storedMessage.createdAt,
            },
          },
          select: {
            id: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      const supersedeCurrentMessage = async (
        newerMessageId: string,
        stage: string,
      ) => {
        m1mT2Trace(stage, {
          messageId: storedMessage.id,
          customerId: storedMessage.customerId,
          newerMessageId,
        });

        await messageService.markAsProcessed(
          storedMessage.id,
        );

        return {
          processed: true,
          action:
            "CONSECUTIVE_MESSAGE_SUPERSEDED" as const,
          messageId:
            storedMessage.id,
        };
      };

      await wait(T2_INITIAL_QUIET_MS);

      const newerCustomerMessage =
        await findNewerCustomerMessage();

      if (newerCustomerMessage) {
        return supersedeCurrentMessage(
          newerCustomerMessage.id,
          "CONSECUTIVE_MESSAGE_SUPERSEDED",
        );
      }

      const currentText =
        normalizedMessage.content?.trim() ?? "";

      if (currentText) {
        try {
          const recentCustomerMessages =
            (
              await prisma.m1MMessage.findMany({
                where: {
                  companyId,
                  customerId:
                    storedMessage.customerId,
                  fromMe: false,
                  type: M1MMessageType.TEXT,
                  id: {
                    not: storedMessage.id,
                  },
                  createdAt: {
                    lt: storedMessage.createdAt,
                  },
                },
                select: {
                  content: true,
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 6,
              })
            )
              .reverse()
              .map((message) =>
                message.content?.trim() ?? "",
              )
              .filter(Boolean);

          const readiness =
            await openAIProviderService.classifyMessageReadiness({
              recentCustomerMessages,
              currentMessage: currentText,
            });

          m1mT2Trace("MESSAGE_READINESS_DECISION", {
            messageId: storedMessage.id,
            customerId: storedMessage.customerId,
            shouldWaitForContinuation:
              readiness.shouldWaitForContinuation,
            responseId: readiness.responseId,
          });

          if (readiness.shouldWaitForContinuation) {
            await wait(T2_INCOMPLETE_EXTENSION_MS);

            const newerAfterExtension =
              await findNewerCustomerMessage();

            if (newerAfterExtension) {
              return supersedeCurrentMessage(
                newerAfterExtension.id,
                "INCOMPLETE_MESSAGE_SUPERSEDED",
              );
            }

            m1mT2Trace(
              "INCOMPLETE_MESSAGE_EXTENSION_EXPIRED",
              {
                messageId: storedMessage.id,
                customerId:
                  storedMessage.customerId,
              },
            );
          }
        } catch (readinessError) {
          console.warn(
            "[M1M T2] Classificacao de continuidade falhou; seguindo o fluxo normal sem bloquear o atendimento.",
            readinessError,
          );
        }
      }
    }

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

            throw analysisError;
          }
        }

        if (!receiptAnalysis.isPaymentReceipt) {
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

      m1mT2Trace("BEFORE_ROUTER", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
      });

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

      m1mT2Trace("AFTER_ROUTER", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
        routerState: router.state,
        attendanceId: router.attendanceId,
        sectorId: router.sectorId,
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

      const customerAiControl =
        await prisma.m1MCustomer.findFirst({
          where: {
            id: storedMessage.customerId,
            companyId,
          },
          select: {
            aiEnabled: true,
          },
        });

      if (customerAiControl?.aiEnabled === false) {
        return {
          processed: true,
          action:
            "CUSTOMER_AI_DISABLED" as const,
          messageId:
            storedMessage.id,
          router,
        };
      }

      if (
        router.requiresSectorIdentification &&
        normalizedMessage.type ===
          M1MMessageType.TEXT
      ) {
        const institutionalMessage =
          normalizedMessage.content?.trim() ?? "";

        if (
          companyInformationIntentService.isCompanyInformationQuestion(
            institutionalMessage,
          )
        ) {
          const companyContext =
            await companyContextBuilderService.buildCompanyContext(
              companyId,
            );

          const recentCompanyMessages =
            (await messageService.listMessagesByAttendance(
              router.attendanceId,
            )).slice(-AI_CONVERSATION_HISTORY_LIMIT);

          const companyConversationHistory =
            buildAIConversationHistory(
              recentCompanyMessages,
              storedMessage.id,
            );

          const companyConversationCustomer =
            await prisma.m1MCustomer.findFirst({
            where: {
              id: storedMessage.customerId,
              companyId,
            },
            select: {
              name: true,
            },
          });

          const companyPrompt =
            companyPromptBuilderService.build({
              context:
                companyContext,
              customerMessage:
                institutionalMessage,
              customerName:
                companyConversationCustomer?.name?.trim() ||
                null,
              isConversationStart:
                !companyConversationHistory,
            });

          m1mT2Trace("BEFORE_COMPANY_AI", {
            messageId: storedMessage.id,
            customerId: storedMessage.customerId,
            companyId,
          });

          const companyAiResponse =
            await openAIProviderService.generateResponse({
              systemPrompt:
                companyPrompt.systemPrompt,
              userPrompt:
                appendConversationHistoryToUserPrompt(
                  companyPrompt.userPrompt,
                  companyConversationHistory,
                ),
            });

          m1mT2Trace("AFTER_COMPANY_AI", {
            messageId: storedMessage.id,
            customerId: storedMessage.customerId,
            companyId,
            responseId: companyAiResponse.responseId,
            needsHuman: companyAiResponse.needsHuman,
          });

          if (
            !companyAiResponse.needsHuman
          ) {
            if (options?.dryRun) {
              return {
                processed: true,
                action:
                  "COMPANY_INFORMATION_RESPONSE_SIMULATED" as const,
                messageId:
                  storedMessage.id,
                router,
                simulatedMessage:
                  companyAiResponse.text,
                ai: {
                  model:
                    companyAiResponse.model,
                  responseId:
                    companyAiResponse.responseId,
                  inputTokens:
                    companyAiResponse.inputTokens,
                  outputTokens:
                    companyAiResponse.outputTokens,
                  totalTokens:
                    companyAiResponse.totalTokens,
                },
              };
            }

            m1mT2Trace("BEFORE_SEND_COMPANY_INFORMATION", {
              messageId: storedMessage.id,
              customerId: storedMessage.customerId,
              companyId,
            });

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
                companyAiResponse.text,
              sourceMessageId:
                storedMessage.id,
            });

            m1mT2Trace("AFTER_SEND_COMPANY_INFORMATION", {
              messageId: storedMessage.id,
              customerId: storedMessage.customerId,
              companyId,
            });

            return {
              processed: true,
              action:
                "COMPANY_INFORMATION_RESPONSE_SENT" as const,
              messageId:
                storedMessage.id,
              router,
              ai: {
                model:
                  companyAiResponse.model,
                responseId:
                  companyAiResponse.responseId,
                inputTokens:
                  companyAiResponse.inputTokens,
                outputTokens:
                  companyAiResponse.outputTokens,
                totalTokens:
                  companyAiResponse.totalTokens,
              },
            };
          }
        }
      }
      if (
        router.requiresSectorIdentification &&
        normalizedMessage.type === M1MMessageType.TEXT
      ) {
        const conversationalMessage = normalizedMessage.content?.trim() ?? "";

        if (conversationalMessage) {
          const recentConversationalMessages = (
            await messageService.listMessagesByAttendance(router.attendanceId)
          ).slice(-AI_CONVERSATION_HISTORY_LIMIT);

          const conversationalHistory = buildAIConversationHistory(
            recentConversationalMessages,
            storedMessage.id,
          );

          const conversationalCustomer = await prisma.m1MCustomer.findFirst({
            where: {
              id: storedMessage.customerId,
              companyId,
            },
            select: {
              name: true,
            },
          });

          const conversationalIntent =
            await openAIProviderService.classifyConversationIntent({
              currentMessage: conversationalMessage,
              conversationHistory: conversationalHistory,
              customerName: conversationalCustomer?.name?.trim() || null,
            });

          if (
            conversationalIntent.intent === "SOCIAL" ||
            conversationalIntent.intent === "CLOSING"
          ) {
            const replyText = conversationalIntent.replyText;

            if (!replyText) {
              throw new Error("Resposta conversacional ausente.");
            }

            await automaticMessageService.sendText({
              companyId,
              customerId: storedMessage.customerId,
              attendanceId: router.attendanceId,
              instanceName: normalizedInstanceName,
              remoteJid: normalizedMessage.remoteJid,
              text: replyText,
              sourceMessageId: storedMessage.id,
            });

            return {
              processed: true,
              action:
                conversationalIntent.intent === "CLOSING"
                  ? ("CONVERSATION_CLOSING" as const)
                  : ("CONVERSATION_SOCIAL" as const),
              messageId: storedMessage.id,
              router,
              ai: {
                model: conversationalIntent.model,
                responseId: conversationalIntent.responseId,
              },
            };
          }
        }
      }
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
        const menuCustomer =
          await prisma.m1MCustomer.findFirst({
            where: {
              id: storedMessage.customerId,
              companyId,
            },
            select: {
              name: true,
            },
          });

        const rawMessageRecord =
          rawMessage &&
          typeof rawMessage === "object"
            ? (rawMessage as Record<string, unknown>)
            : null;

        const rawPushName =
          typeof rawMessageRecord?.pushName === "string"
            ? rawMessageRecord.pushName.trim()
            : "";

        const menuCustomerName =
          menuCustomer?.name?.trim() ||
          rawPushName ||
          null;

        const sectorMenuMessage =
          sectorMenuService.buildMessage(
            router.availableSectors ?? [],
            company?.name,
            menuCustomerName,
          );
const menuAlreadyShownInCurrentCycle =
          router.attendanceId
            ? await messageService.hasAIMessageWithContentByAttendance(
                router.attendanceId,
                sectorMenuMessage,
              )
            : false;

        const multipleIntentSectorNames =
          router.multipleIntentSelectionRequired
            ? (router.availableSectors ?? [])
                .map(
                  (sector) =>
                    sector.name.trim(),
                )
                .filter(Boolean)
            : [];

        const formattedMultipleIntentSectors =
          multipleIntentSectorNames.length === 2
            ? `${multipleIntentSectorNames[0]} e ${multipleIntentSectorNames[1]}`
            : multipleIntentSectorNames.length > 2
              ? `${multipleIntentSectorNames
                  .slice(0, -1)
                  .join(", ")} e ${
                  multipleIntentSectorNames[
                    multipleIntentSectorNames.length - 1
                  ]
                }`
              : multipleIntentSectorNames[0] ?? "";

        const responseMessage =
          router.multipleIntentSelectionRequired &&
          multipleIntentSectorNames.length > 1
            ? `Entendi que você quer tratar de ${formattedMultipleIntentSectors}. Qual desses assuntos você prefere resolver primeiro?`
            : menuAlreadyShownInCurrentCycle
              ? "Não consegui identificar exatamente o que você precisa. Pode me explicar brevemente?"
              : sectorMenuMessage;

        if (options?.dryRun) {
          return {
            processed: true,
            action:
              "SECTOR_MENU_SIMULATED" as const,
            messageId:
              storedMessage.id,
            router,
            simulatedMessage:
              responseMessage,
          };
        }

        m1mT2Trace("BEFORE_SEND_SECTOR_MENU", {
          messageId: storedMessage.id,
          customerId: storedMessage.customerId,
          companyId,
          routerState: router.state,
        });

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
            responseMessage,
          sourceMessageId:
            storedMessage.id,
        });

        m1mT2Trace("AFTER_SEND_SECTOR_MENU", {
          messageId: storedMessage.id,
          customerId: storedMessage.customerId,
          companyId,
          routerState: router.state,
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
          `Perfeito! Vamos seguir por aqui com o ${router.sectorName}. Me conta como posso te ajudar.`;

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
        const courtesyWindowMs = 5 * 60 * 1000;
        const isPureCourtesy =
          normalizedMessage.type === M1MMessageType.TEXT &&
          isControlledHumanHandoffCourtesy(
            normalizedMessage.content,
          );

        if (
          isPureCourtesy &&
          router.attendanceId &&
          !router.responsibleId
        ) {
          const humanAttendance =
            await prisma.m1MAttendance.findUnique({
              where: {
                id: router.attendanceId,
              },
              select: {
                updatedAt: true,
                responsibleId: true,
              },
            });

          const elapsedSinceHumanTransitionMs =
            humanAttendance
              ? storedMessage.sentAt.getTime() -
                humanAttendance.updatedAt.getTime()
              : Number.POSITIVE_INFINITY;

          const previousInboundAfterHumanTransition =
            humanAttendance &&
            !humanAttendance.responsibleId &&
            elapsedSinceHumanTransitionMs >= 0 &&
            elapsedSinceHumanTransitionMs <= courtesyWindowMs
              ? await prisma.m1MMessage.count({
                  where: {
                    companyId,
                    customerId:
                      storedMessage.customerId,
                    attendanceId:
                      router.attendanceId,
                    fromMe: false,
                    id: {
                      not: storedMessage.id,
                    },
                    sentAt: {
                      gte: humanAttendance.updatedAt,
                      lt: storedMessage.sentAt,
                    },
                  },
                })
              : 1;

          if (
            humanAttendance &&
            !humanAttendance.responsibleId &&
            elapsedSinceHumanTransitionMs >= 0 &&
            elapsedSinceHumanTransitionMs <= courtesyWindowMs &&
            previousInboundAfterHumanTransition === 0
          ) {
            const courtesyMessage =
              "Por nada! 😊 Já encaminhei seu atendimento e nossa equipe dará continuidade por aqui.";

            if (options?.dryRun) {
              return {
                processed: true,
                action:
                  "HUMAN_HANDOFF_COURTESY_SIMULATED" as const,
                messageId:
                  storedMessage.id,
                router,
                simulatedMessage:
                  courtesyMessage,
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
                courtesyMessage,
              sourceMessageId:
                storedMessage.id,
            });

            return {
              processed: true,
              action:
                "HUMAN_HANDOFF_COURTESY_SENT" as const,
              messageId:
                storedMessage.id,
              router,
            };
          }
        }

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

      const recentSectorMessages =
        (await messageService.listMessagesByAttendance(
          router.attendanceId,
        )).slice(-AI_CONVERSATION_HISTORY_LIMIT);

      const sectorConversationHistory =
        buildAIConversationHistory(
          recentSectorMessages,
          storedMessage.id,
        );

      const sectorConversationCustomer =
        await prisma.m1MCustomer.findFirst({
            where: {
              id: storedMessage.customerId,
              companyId,
            },
            select: {
              name: true,
            },
          });

      const prompt =
        promptBuilderService.build({
          context,
          customerMessage:
            messageContent,
          customerName:
            sectorConversationCustomer?.name?.trim() ||
            null,
          isConversationStart:
            !sectorConversationHistory,
        });

      m1mT2Trace("BEFORE_AI", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
        routerState: router.state,
        attendanceId: router.attendanceId,
        sectorId: router.sectorId,
      });

      const aiResponse =
        await openAIProviderService.generateResponse({
          systemPrompt:
            prompt.systemPrompt,
          userPrompt:
            appendConversationHistoryToUserPrompt(
              prompt.userPrompt,
              sectorConversationHistory,
            ),
        });

      m1mT2Trace("AFTER_AI", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
        responseId: aiResponse.responseId,
        needsHuman: aiResponse.needsHuman,
      });

      let customerResponseText =
        aiResponse.text;

      if (
        aiResponse.needsHuman &&
        !availability.isOpen
      ) {
        const outOfHoursSettings =
          await outOfHoursService.getSettings(
            companyId,
            router.sectorId,
          );

        customerResponseText =
          `${aiResponse.text}\n\n${outOfHoursSettings.effectiveMessage}`;
      }

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
            customerResponseText,
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

      m1mT2Trace("BEFORE_SEND_AI_RESPONSE", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
        routerState: router.state,
        attendanceId: router.attendanceId,
        sectorId: router.sectorId,
      });

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
          customerResponseText,
      sourceMessageId:
          storedMessage.id,
      });

      m1mT2Trace("AFTER_SEND_AI_RESPONSE", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
        routerState: router.state,
        attendanceId: router.attendanceId,
        sectorId: router.sectorId,
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

      m1mT2Trace("PIPELINE_END_AI_RESPONSE_SENT", {
        messageId: storedMessage.id,
        customerId: storedMessage.customerId,
        companyId,
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

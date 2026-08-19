import {
  M1MMessageType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  incomingMessagePipelineService,
} from "@/services/incoming-message-pipeline.service";

const NEW_SYNC_WINDOW_MS =
  10 * 60 * 1000;

const STALE_PROCESSING_MS =
  5 * 60 * 1000;

const MAX_MESSAGES_PER_RUN = 20;

export const messageReconciliationService = {
  async reconcileReceiptMediaForConversation(
    companyId: string,
    instanceName: string,
    remoteJid: string,
  ) {
    const now = Date.now();

    const recentlyCreated =
      new Date(
        now - NEW_SYNC_WINDOW_MS,
      );

    const staleBefore =
      new Date(
        now - STALE_PROCESSING_MS,
      );

    const candidates =
      await prisma.m1MMessage.findMany({
        where: {
          companyId,
          instanceName,
          remoteJid,
          fromMe: false,
          processedAt: null,
          type: {
            in: [
              M1MMessageType.IMAGE,
              M1MMessageType.DOCUMENT,
            ],
          },
          OR: [
            {
              processingStartedAt: null,
              createdAt: {
                gte: recentlyCreated,
              },
            },
            {
              processingStartedAt: {
                lt: staleBefore,
              },
            },
          ],
        },
        orderBy: {
          sentAt: "asc",
        },
        take:
          MAX_MESSAGES_PER_RUN,
        select: {
          id: true,
          rawPayload: true,
        },
      });

    let processed = 0;
    let receipts = 0;
    let failed = 0;

    for (
      const candidate of candidates
    ) {
      if (!candidate.rawPayload) {
        continue;
      }

      try {
        const result =
          await incomingMessagePipelineService.process(
            candidate.rawPayload,
            instanceName,
            {
              receiptOnly: true,
            },
          );

        if (result.processed) {
          processed += 1;
        }

        if (
          result.action ===
          "PAYMENT_RECEIPT_RECONCILED"
        ) {
          receipts += 1;
        }
      } catch (error) {
        failed += 1;

        console.warn(
          "[M1M RECONCILIACAO] Falha ao recuperar midia recebida:",
          {
            messageId:
              candidate.id,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        );
      }
    }

    return {
      candidates:
        candidates.length,
      processed,
      receipts,
      failed,
    };
  },
};

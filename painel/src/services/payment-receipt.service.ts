import {
  M1MAttendanceActorType,
  M1MPaymentReceiptEventType,
  M1MPaymentReceiptStatus,
} from "@/generated/prisma/enums";
import type {
  Prisma,
} from "@/generated/prisma/client";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  paymentReceiptRepository,
  type CreatePaymentReceiptData,
  type UpdatePaymentReceiptData,
} from "@/repositories/payment-receipt.repository";
import {
  identityResolverService,
} from "@/services/identity-resolver.service";

type ReceiptActor = {
  actorType: M1MAttendanceActorType;
  actorId?: string | null;
};

type CreateReceiptInput =
  Omit<
    CreatePaymentReceiptData,
    "companyId" | "status"
  > &
  ReceiptActor;

type UpdateReceiptDetailsInput = {
  amount?:
    | Prisma.Decimal
    | number
    | string
    | null;
  paymentMethod?: string | null;
  identifiedBank?: string | null;
  paidAt?: Date | null;
  observations?: string | null;
};

type RejectReceiptInput = {
  rejectionReason: string;
  observations?: string | null;
};

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} Ã© obrigatÃ³rio.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

async function requireCompany(
  companyId: string,
) {
  const normalizedCompanyId =
    requireText(
      companyId,
      "Empresa",
    );

  const company =
    await companyRepository.findById(
      normalizedCompanyId,
    );

  if (!company) {
    throw new Error(
      "Empresa nÃ£o encontrada.",
    );
  }

  return normalizedCompanyId;
}

async function requireReceipt(
  companyId: string,
  receiptId: string,
) {
  const normalizedCompanyId =
    await requireCompany(
      companyId,
    );

  const normalizedReceiptId =
    requireText(
      receiptId,
      "Comprovante",
    );

  const receipt =
    await paymentReceiptRepository.findById(
      normalizedCompanyId,
      normalizedReceiptId,
    );

  if (!receipt) {
    throw new Error(
      "Comprovante nÃ£o encontrado.",
    );
  }

  return {
    companyId:
      normalizedCompanyId,
    receipt,
  };
}

function ensureNotFinished(
  status: M1MPaymentReceiptStatus,
) {
  if (
    status ===
    M1MPaymentReceiptStatus.FINISHED
  ) {
    throw new Error(
      "O comprovante jÃ¡ foi finalizado.",
    );
  }
}

async function updateWithEvent(
  companyId: string,
  receiptId: string,
  data: UpdatePaymentReceiptData,
  event: {
    type: M1MPaymentReceiptEventType;
    actorType: M1MAttendanceActorType;
    actorId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  },
) {
  const updatedReceipt =
    await paymentReceiptRepository.update(
      companyId,
      receiptId,
      data,
    );

  if (!updatedReceipt) {
    throw new Error(
      "Comprovante nÃ£o encontrado.",
    );
  }

  await paymentReceiptRepository.createEvent({
    receiptId,
    type:
      event.type,
    actorType:
      event.actorType,
    actorId:
      event.actorId ?? null,
    metadata:
      event.metadata ?? null,
  });

  return updatedReceipt;
}

export const paymentReceiptService = {
  async createReceipt(
    companyId: string,
    input: CreateReceiptInput,
  ) {
    const normalizedCompanyId =
      await requireCompany(
        companyId,
      );

    const customerId =
      requireText(
        input.customerId,
        "Cliente",
      );

    if (input.messageId) {
      const existingReceipt =
        await paymentReceiptRepository.findByMessageId(
          normalizedCompanyId,
          input.messageId,
        );

      if (existingReceipt) {
        return existingReceipt;
      }
    }

    const receipt =
      await paymentReceiptRepository.create({
        companyId:
          normalizedCompanyId,
        customerId,
        attendanceId:
          input.attendanceId ?? null,
        messageId:
          input.messageId ?? null,
        responsibleId:
          input.responsibleId ?? null,
        status:
          M1MPaymentReceiptStatus.RECEIVED,
        mediaUrl:
          input.mediaUrl,
        mimeType:
          input.mimeType,
        fileName:
          input.fileName,
        amount:
          input.amount,
        paymentMethod:
          input.paymentMethod,
        identifiedBank:
          input.identifiedBank,
        paidAt:
          input.paidAt,
        observations:
          input.observations,
        rejectionReason:
          input.rejectionReason,
      });

    await paymentReceiptRepository.createEvent({
      receiptId:
        receipt.id,
      type:
        M1MPaymentReceiptEventType.RECEIVED,
      actorType:
        input.actorType,
      actorId:
        input.actorId ?? null,
      metadata: {
        messageId:
          input.messageId ?? null,
        mediaUrl:
          normalizeOptionalText(
            input.mediaUrl,
          ),
        mimeType:
          normalizeOptionalText(
            input.mimeType,
          ),
        fileName:
          normalizeOptionalText(
            input.fileName,
          ),
      },
    });

    return receipt;
  },

  async listReceipts(
    companyId: string,
    status?: M1MPaymentReceiptStatus,
    customerId?: string,
  ) {
    const normalizedCompanyId =
      await requireCompany(
        companyId,
      );

    const receipts =
      await paymentReceiptRepository.listByCompany(
        normalizedCompanyId,
        status,
        customerId,
      );

    return identityResolverService
      .enrichCustomerIdentityList(
        receipts,
      );
  },

  async getReceipt(
    companyId: string,
    receiptId: string,
  ) {
    const {
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    return identityResolverService
      .enrichCustomerIdentity(
        receipt,
      );
  },

  async updateDetails(
    companyId: string,
    receiptId: string,
    input: UpdateReceiptDetailsInput,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        amount:
          input.amount,
        paymentMethod:
          input.paymentMethod,
        identifiedBank:
          input.identifiedBank,
        paidAt:
          input.paidAt,
        observations:
          input.observations,
      },
      {
        type:
          M1MPaymentReceiptEventType.NOTE_ADDED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
        metadata: {
          observations:
            normalizeOptionalText(
              input.observations,
            ),
          paymentMethod:
            normalizeOptionalText(
              input.paymentMethod,
            ),
          identifiedBank:
            normalizeOptionalText(
              input.identifiedBank,
            ),
        },
      },
    );
  },

  async classifyReceipt(
    companyId: string,
    receiptId: string,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    if (
      receipt.status ===
      M1MPaymentReceiptStatus.CLASSIFIED
    ) {
      return receipt;
    }

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.CLASSIFIED,
        classifiedAt:
          new Date(),
      },
      {
        type:
          M1MPaymentReceiptEventType.CLASSIFIED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
      },
    );
  },

  async startReview(
    companyId: string,
    receiptId: string,
    responsibleId: string,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    const normalizedResponsibleId =
      requireText(
        responsibleId,
        "ResponsÃ¡vel",
      );

    if (
      receipt.status ===
        M1MPaymentReceiptStatus.UNDER_REVIEW &&
      receipt.responsibleId ===
        normalizedResponsibleId
    ) {
      return receipt;
    }

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.UNDER_REVIEW,
        responsibleId:
          normalizedResponsibleId,
        reviewStartedAt:
          new Date(),
      },
      {
        type:
          M1MPaymentReceiptEventType.REVIEW_STARTED,
        actorType:
          M1MAttendanceActorType.USER,
        actorId:
          normalizedResponsibleId,
      },
    );
  },

  async approveReceipt(
    companyId: string,
    receiptId: string,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    if (
      receipt.status ===
      M1MPaymentReceiptStatus.APPROVED
    ) {
      return receipt;
    }

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.APPROVED,
        approvedAt:
          new Date(),
        rejectedAt:
          null,
        rejectionReason:
          null,
      },
      {
        type:
          M1MPaymentReceiptEventType.APPROVED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
      },
    );
  },

  async rejectReceipt(
    companyId: string,
    receiptId: string,
    input: RejectReceiptInput,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    const rejectionReason =
      requireText(
        input.rejectionReason,
        "Motivo da recusa",
      );

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.REJECTED,
        rejectedAt:
          new Date(),
        approvedAt:
          null,
        rejectionReason,
        observations:
          input.observations,
      },
      {
        type:
          M1MPaymentReceiptEventType.REJECTED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
        metadata: {
          rejectionReason,
          observations:
            normalizeOptionalText(
              input.observations,
            ),
        },
      },
    );
  },

  async awaitNewReceipt(
    companyId: string,
    receiptId: string,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.AWAITING_NEW_RECEIPT,
      },
      {
        type:
          M1MPaymentReceiptEventType.AWAITING_NEW_RECEIPT,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
      },
    );
  },

  async markCustomerNotified(
    companyId: string,
    receiptId: string,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    ensureNotFinished(
      receipt.status,
    );

    if (
      receipt.status ===
        M1MPaymentReceiptStatus.CUSTOMER_NOTIFIED &&
      receipt.customerNotifiedAt
    ) {
      return receipt;
    }

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.CUSTOMER_NOTIFIED,
        customerNotifiedAt:
          new Date(),
      },
      {
        type:
          M1MPaymentReceiptEventType.CUSTOMER_NOTIFIED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
      },
    );
  },

  async finishReceipt(
    companyId: string,
    receiptId: string,
    actor: ReceiptActor,
  ) {
    const {
      companyId:
        normalizedCompanyId,
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    if (
      receipt.status ===
      M1MPaymentReceiptStatus.FINISHED
    ) {
      return receipt;
    }

    return updateWithEvent(
      normalizedCompanyId,
      receipt.id,
      {
        status:
          M1MPaymentReceiptStatus.FINISHED,
        finishedAt:
          new Date(),
      },
      {
        type:
          M1MPaymentReceiptEventType.FINISHED,
        actorType:
          actor.actorType,
        actorId:
          actor.actorId ?? null,
      },
    );
  },

  async listEvents(
    companyId: string,
    receiptId: string,
  ) {
    const {
      receipt,
    } =
      await requireReceipt(
        companyId,
        receiptId,
      );

    return paymentReceiptRepository.listEvents(
      receipt.id,
    );
  },
};


import { prisma } from "@/lib/prisma";

export type PaymentSettingsData = {
  companyId: string;
  acceptsPix?: boolean;
  acceptsCash?: boolean;
  acceptsCreditCard?: boolean;
  acceptsDebitCard?: boolean;
  acceptsBankSlip?: boolean;
  acceptsBankTransfer?: boolean;
  pixKeyType?: string | null;
  pixKey?: string | null;
  pixHolderName?: string | null;
  pixHolderDocument?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: string | null;
  maxInstallments?: number | null;
  installmentInterest?: string | null;
  paymentDeadline?: string | null;
  receiptInstructions?: string | null;
  billingRules?: string | null;
  additionalInformation?: string | null;
};

export type PaymentSettingsUpdateData =
  Omit<
    PaymentSettingsData,
    "companyId"
  >;

function normalizeOptionalText(
  value?: string | null,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeOptionalInteger(
  value?: number | null,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "A quantidade máxima de parcelas deve ser um número inteiro maior ou igual a zero.",
    );
  }

  return value;
}

function buildUpdateData(
  data: PaymentSettingsUpdateData,
) {
  const updateData: {
    acceptsPix?: boolean;
    acceptsCash?: boolean;
    acceptsCreditCard?: boolean;
    acceptsDebitCard?: boolean;
    acceptsBankSlip?: boolean;
    acceptsBankTransfer?: boolean;
    pixKeyType?: string | null;
    pixKey?: string | null;
    pixHolderName?: string | null;
    pixHolderDocument?: string | null;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    bankAccountType?: string | null;
    maxInstallments?: number | null;
    installmentInterest?: string | null;
    paymentDeadline?: string | null;
    receiptInstructions?: string | null;
    billingRules?: string | null;
    additionalInformation?: string | null;
  } = {};

  if (
    data.acceptsPix !==
    undefined
  ) {
    updateData.acceptsPix =
      data.acceptsPix;
  }

  if (
    data.acceptsCash !==
    undefined
  ) {
    updateData.acceptsCash =
      data.acceptsCash;
  }

  if (
    data.acceptsCreditCard !==
    undefined
  ) {
    updateData.acceptsCreditCard =
      data.acceptsCreditCard;
  }

  if (
    data.acceptsDebitCard !==
    undefined
  ) {
    updateData.acceptsDebitCard =
      data.acceptsDebitCard;
  }

  if (
    data.acceptsBankSlip !==
    undefined
  ) {
    updateData.acceptsBankSlip =
      data.acceptsBankSlip;
  }

  if (
    data.acceptsBankTransfer !==
    undefined
  ) {
    updateData.acceptsBankTransfer =
      data.acceptsBankTransfer;
  }

  if (
    data.pixKeyType !==
    undefined
  ) {
    updateData.pixKeyType =
      normalizeOptionalText(
        data.pixKeyType,
      );
  }

  if (
    data.pixKey !==
    undefined
  ) {
    updateData.pixKey =
      normalizeOptionalText(
        data.pixKey,
      );
  }

  if (
    data.pixHolderName !==
    undefined
  ) {
    updateData.pixHolderName =
      normalizeOptionalText(
        data.pixHolderName,
      );
  }

  if (
    data.pixHolderDocument !==
    undefined
  ) {
    updateData.pixHolderDocument =
      normalizeOptionalText(
        data.pixHolderDocument,
      );
  }

  if (
    data.bankName !==
    undefined
  ) {
    updateData.bankName =
      normalizeOptionalText(
        data.bankName,
      );
  }

  if (
    data.bankAgency !==
    undefined
  ) {
    updateData.bankAgency =
      normalizeOptionalText(
        data.bankAgency,
      );
  }

  if (
    data.bankAccount !==
    undefined
  ) {
    updateData.bankAccount =
      normalizeOptionalText(
        data.bankAccount,
      );
  }

  if (
    data.bankAccountType !==
    undefined
  ) {
    updateData.bankAccountType =
      normalizeOptionalText(
        data.bankAccountType,
      );
  }

  if (
    data.maxInstallments !==
    undefined
  ) {
    updateData.maxInstallments =
      normalizeOptionalInteger(
        data.maxInstallments,
      );
  }

  if (
    data.installmentInterest !==
    undefined
  ) {
    updateData.installmentInterest =
      normalizeOptionalText(
        data.installmentInterest,
      );
  }

  if (
    data.paymentDeadline !==
    undefined
  ) {
    updateData.paymentDeadline =
      normalizeOptionalText(
        data.paymentDeadline,
      );
  }

  if (
    data.receiptInstructions !==
    undefined
  ) {
    updateData.receiptInstructions =
      normalizeOptionalText(
        data.receiptInstructions,
      );
  }

  if (
    data.billingRules !==
    undefined
  ) {
    updateData.billingRules =
      normalizeOptionalText(
        data.billingRules,
      );
  }

  if (
    data.additionalInformation !==
    undefined
  ) {
    updateData.additionalInformation =
      normalizeOptionalText(
        data.additionalInformation,
      );
  }

  return updateData;
}

export const paymentSettingsRepository = {
  async findByCompanyId(
    companyId: string,
  ) {
    return prisma.m1MPaymentSettings.findUnique({
      where: {
        companyId,
      },
    });
  },

  async create(
    data: PaymentSettingsData,
  ) {
    return prisma.m1MPaymentSettings.create({
      data: {
        companyId:
          data.companyId,
        acceptsPix:
          data.acceptsPix ?? false,
        acceptsCash:
          data.acceptsCash ?? false,
        acceptsCreditCard:
          data.acceptsCreditCard ?? false,
        acceptsDebitCard:
          data.acceptsDebitCard ?? false,
        acceptsBankSlip:
          data.acceptsBankSlip ?? false,
        acceptsBankTransfer:
          data.acceptsBankTransfer ?? false,
        pixKeyType:
          normalizeOptionalText(
            data.pixKeyType,
          ),
        pixKey:
          normalizeOptionalText(
            data.pixKey,
          ),
        pixHolderName:
          normalizeOptionalText(
            data.pixHolderName,
          ),
        pixHolderDocument:
          normalizeOptionalText(
            data.pixHolderDocument,
          ),
        bankName:
          normalizeOptionalText(
            data.bankName,
          ),
        bankAgency:
          normalizeOptionalText(
            data.bankAgency,
          ),
        bankAccount:
          normalizeOptionalText(
            data.bankAccount,
          ),
        bankAccountType:
          normalizeOptionalText(
            data.bankAccountType,
          ),
        maxInstallments:
          normalizeOptionalInteger(
            data.maxInstallments,
          ),
        installmentInterest:
          normalizeOptionalText(
            data.installmentInterest,
          ),
        paymentDeadline:
          normalizeOptionalText(
            data.paymentDeadline,
          ),
        receiptInstructions:
          normalizeOptionalText(
            data.receiptInstructions,
          ),
        billingRules:
          normalizeOptionalText(
            data.billingRules,
          ),
        additionalInformation:
          normalizeOptionalText(
            data.additionalInformation,
          ),
      },
    });
  },

  async update(
    companyId: string,
    data: PaymentSettingsUpdateData,
  ) {
    return prisma.m1MPaymentSettings.update({
      where: {
        companyId,
      },
      data:
        buildUpdateData(
          data,
        ),
    });
  },

  async upsert(
    data: PaymentSettingsData,
  ) {
    const existingSettings =
      await this.findByCompanyId(
        data.companyId,
      );

    if (!existingSettings) {
      return this.create(
        data,
      );
    }

    return this.update(
      data.companyId,
      {
        acceptsPix:
          data.acceptsPix,
        acceptsCash:
          data.acceptsCash,
        acceptsCreditCard:
          data.acceptsCreditCard,
        acceptsDebitCard:
          data.acceptsDebitCard,
        acceptsBankSlip:
          data.acceptsBankSlip,
        acceptsBankTransfer:
          data.acceptsBankTransfer,
        pixKeyType:
          data.pixKeyType,
        pixKey:
          data.pixKey,
        pixHolderName:
          data.pixHolderName,
        pixHolderDocument:
          data.pixHolderDocument,
        bankName:
          data.bankName,
        bankAgency:
          data.bankAgency,
        bankAccount:
          data.bankAccount,
        bankAccountType:
          data.bankAccountType,
        maxInstallments:
          data.maxInstallments,
        installmentInterest:
          data.installmentInterest,
        paymentDeadline:
          data.paymentDeadline,
        receiptInstructions:
          data.receiptInstructions,
        billingRules:
          data.billingRules,
        additionalInformation:
          data.additionalInformation,
      },
    );
  },
};

import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  paymentSettingsRepository,
  type PaymentSettingsData,
  type PaymentSettingsUpdateData,
} from "@/repositories/payment-settings.repository";

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

function normalizeBoolean(
  value: unknown,
) {
  return value === true;
}

function normalizeOptionalInteger(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalizedValue =
    Number(value);

  if (
    !Number.isInteger(
      normalizedValue,
    ) ||
    normalizedValue < 0
  ) {
    throw new Error(
      "A quantidade máxima de parcelas deve ser um número inteiro maior ou igual a zero.",
    );
  }

  return normalizedValue;
}

function normalizeSettingsData(
  input: PaymentSettingsUpdateData,
): PaymentSettingsUpdateData {
  return {
    acceptsPix:
      normalizeBoolean(
        input.acceptsPix,
      ),
    acceptsCash:
      normalizeBoolean(
        input.acceptsCash,
      ),
    acceptsCreditCard:
      normalizeBoolean(
        input.acceptsCreditCard,
      ),
    acceptsDebitCard:
      normalizeBoolean(
        input.acceptsDebitCard,
      ),
    acceptsBankSlip:
      normalizeBoolean(
        input.acceptsBankSlip,
      ),
    acceptsBankTransfer:
      normalizeBoolean(
        input.acceptsBankTransfer,
      ),
    pixKeyType:
      input.pixKeyType,
    pixKey:
      input.pixKey,
    pixHolderName:
      input.pixHolderName,
    pixHolderDocument:
      input.pixHolderDocument,
    bankName:
      input.bankName,
    bankAgency:
      input.bankAgency,
    bankAccount:
      input.bankAccount,
    bankAccountType:
      input.bankAccountType,
    maxInstallments:
      normalizeOptionalInteger(
        input.maxInstallments,
      ),
    installmentInterest:
      input.installmentInterest,
    paymentDeadline:
      input.paymentDeadline,
    receiptInstructions:
      input.receiptInstructions,
    billingRules:
      input.billingRules,
    additionalInformation:
      input.additionalInformation,
  };
}

export const paymentSettingsService = {
  async getPaymentSettings(
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
        "Empresa não encontrada.",
      );
    }

    return paymentSettingsRepository.findByCompanyId(
      normalizedCompanyId,
    );
  },

  async savePaymentSettings(
    companyId: string,
    input: PaymentSettingsUpdateData,
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
        "Empresa não encontrada.",
      );
    }

    const normalizedData =
      normalizeSettingsData(
        input,
      );

    const data:
      PaymentSettingsData = {
        companyId:
          normalizedCompanyId,
        ...normalizedData,
      };

    return paymentSettingsRepository.upsert(
      data,
    );
  },
};

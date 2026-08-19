"use client";

import {
  useEffect,
  useState,
} from "react";

type PaymentSettingsProps = {
  onBack: () => void;
};

type PaymentSettings = {
  id: string;
  companyId: string;
  acceptsPix: boolean;
  acceptsCash: boolean;
  acceptsCreditCard: boolean;
  acceptsDebitCard: boolean;
  acceptsBankSlip: boolean;
  acceptsBankTransfer: boolean;
  pixKeyType: string | null;
  pixKey: string | null;
  pixHolderName: string | null;
  pixHolderDocument: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  bankAccountType: string | null;
  maxInstallments: number | null;
  installmentInterest: string | null;
  paymentDeadline: string | null;
  receiptInstructions: string | null;
  billingRules: string | null;
  additionalInformation: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentFormData = {
  acceptsPix: boolean;
  acceptsCash: boolean;
  acceptsCreditCard: boolean;
  acceptsDebitCard: boolean;
  acceptsBankSlip: boolean;
  acceptsBankTransfer: boolean;
  pixKeyType: string;
  pixKey: string;
  pixHolderName: string;
  pixHolderDocument: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  maxInstallments: string;
  installmentInterest: string;
  paymentDeadline: string;
  receiptInstructions: string;
  billingRules: string;
  additionalInformation: string;
};

const emptyForm: PaymentFormData = {
  acceptsPix: false,
  acceptsCash: false,
  acceptsCreditCard: false,
  acceptsDebitCard: false,
  acceptsBankSlip: false,
  acceptsBankTransfer: false,
  pixKeyType: "",
  pixKey: "",
  pixHolderName: "",
  pixHolderDocument: "",
  bankName: "",
  bankAgency: "",
  bankAccount: "",
  bankAccountType: "",
  maxInstallments: "",
  installmentInterest: "",
  paymentDeadline: "",
  receiptInstructions: "",
  billingRules: "",
  additionalInformation: "",
};

function toFormData(
  settings: PaymentSettings | null,
): PaymentFormData {
  return {
    acceptsPix:
      settings?.acceptsPix ?? false,
    acceptsCash:
      settings?.acceptsCash ?? false,
    acceptsCreditCard:
      settings?.acceptsCreditCard ?? false,
    acceptsDebitCard:
      settings?.acceptsDebitCard ?? false,
    acceptsBankSlip:
      settings?.acceptsBankSlip ?? false,
    acceptsBankTransfer:
      settings?.acceptsBankTransfer ?? false,
    pixKeyType:
      settings?.pixKeyType ?? "",
    pixKey:
      settings?.pixKey ?? "",
    pixHolderName:
      settings?.pixHolderName ?? "",
    pixHolderDocument:
      settings?.pixHolderDocument ?? "",
    bankName:
      settings?.bankName ?? "",
    bankAgency:
      settings?.bankAgency ?? "",
    bankAccount:
      settings?.bankAccount ?? "",
    bankAccountType:
      settings?.bankAccountType ?? "",
    maxInstallments:
      settings?.maxInstallments !==
        null &&
      settings?.maxInstallments !==
        undefined
        ? String(
            settings.maxInstallments,
          )
        : "",
    installmentInterest:
      settings?.installmentInterest ?? "",
    paymentDeadline:
      settings?.paymentDeadline ?? "",
    receiptInstructions:
      settings?.receiptInstructions ?? "",
    billingRules:
      settings?.billingRules ?? "",
    additionalInformation:
      settings?.additionalInformation ?? "",
  };
}

export default function PaymentSettings({
  onBack,
}: PaymentSettingsProps) {
  const [form, setForm] =
    useState<PaymentFormData>(
      emptyForm,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/payment-settings",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            | PaymentSettings
            | null
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            data &&
            typeof data === "object" &&
            "error" in data &&
            data.error
              ? data.error
              : "Não foi possível carregar as configurações de pagamento.",
          );
        }

        setForm(
          toFormData(
            data as PaymentSettings | null,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar as configurações de pagamento.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, []);

  function updateField<
    Field extends keyof PaymentFormData,
  >(
    field: Field,
    value: PaymentFormData[Field],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
    setSuccess(null);
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const maxInstallments =
      form.maxInstallments.trim();

    if (
      maxInstallments &&
      (
        !Number.isInteger(
          Number(maxInstallments),
        ) ||
        Number(maxInstallments) < 0
      )
    ) {
      setError(
        "Informe uma quantidade válida de parcelas.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/payment-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ...form,
                maxInstallments:
                  maxInstallments
                    ? Number(
                        maxInstallments,
                      )
                    : null,
              }),
          },
        );

      const data =
        (await response.json()) as
          | PaymentSettings
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data &&
          data.error
            ? data.error
            : "Não foi possível salvar as configurações de pagamento.",
        );
      }

      setForm(
        toFormData(
          data as PaymentSettings,
        ),
      );

      setSuccess(
        "Configurações de pagamento salvas com sucesso.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar as configurações de pagamento.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderTextField(
    label: string,
    field: keyof PaymentFormData,
    placeholder: string,
    type = "text",
  ) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-black/70">
          {label}
        </span>

        <input
          type={type}
          value={
            typeof form[field] ===
            "string"
              ? form[field]
              : ""
          }
          placeholder={placeholder}
          onChange={(event) =>
            updateField(
              field,
              event.target.value as never,
            )
          }
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        />
      </label>
    );
  }

  function renderTextarea(
    label: string,
    field: keyof PaymentFormData,
    placeholder: string,
    rows = 4,
  ) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-black/70">
          {label}
        </span>

        <textarea
          value={
            typeof form[field] ===
            "string"
              ? form[field]
              : ""
          }
          rows={rows}
          placeholder={placeholder}
          onChange={(event) =>
            updateField(
              field,
              event.target.value as never,
            )
          }
          className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        />
      </label>
    );
  }

  const paymentOptions: Array<{
    field:
      | "acceptsPix"
      | "acceptsCash"
      | "acceptsCreditCard"
      | "acceptsDebitCard"
      | "acceptsBankSlip"
      | "acceptsBankTransfer";
    label: string;
  }> = [
    {
      field:
        "acceptsPix",
      label:
        "PIX",
    },
    {
      field:
        "acceptsCash",
      label:
        "Dinheiro",
    },
    {
      field:
        "acceptsCreditCard",
      label:
        "Cartão de crédito",
    },
    {
      field:
        "acceptsDebitCard",
      label:
        "Cartão de débito",
    },
    {
      field:
        "acceptsBankSlip",
      label:
        "Boleto",
    },
    {
      field:
        "acceptsBankTransfer",
      label:
        "Transferência bancária",
    },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700"
      >
        ← Voltar para configurações
      </button>

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 lg:p-8">
          <p className="text-sm font-semibold text-teal-600">
            Informações comerciais
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Pagamentos
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Cadastre as formas de pagamento, dados bancários e orientações que a IA deve informar aos clientes.
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 lg:p-8">
            <div className="animate-pulse space-y-5">
              <div className="h-24 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="p-6 lg:p-8"
          >
            <section>
              <h3 className="text-base font-bold">
                Formas de pagamento aceitas
              </h3>

              <p className="mt-1 text-sm text-black/45">
                Marque somente as opções realmente disponíveis para os clientes.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paymentOptions.map(
                  (option) => (
                    <label
                      key={
                        option.field
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-teal-200"
                    >
                      <input
                        type="checkbox"
                        checked={
                          form[
                            option.field
                          ]
                        }
                        onChange={(event) =>
                          updateField(
                            option.field,
                            event.target
                              .checked,
                          )
                        }
                        className="h-4 w-4 accent-teal-600"
                      />

                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </section>

            <section className="mt-8 border-t border-black/5 pt-8">
              <h3 className="text-base font-bold">
                Dados do PIX
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {renderTextField(
                  "Tipo da chave",
                  "pixKeyType",
                  "Ex.: CNPJ, CPF, telefone, e-mail ou aleatória",
                )}

                {renderTextField(
                  "Chave PIX",
                  "pixKey",
                  "Informe a chave PIX",
                )}

                {renderTextField(
                  "Nome do favorecido",
                  "pixHolderName",
                  "Nome ou razão social",
                )}

                {renderTextField(
                  "CPF/CNPJ do favorecido",
                  "pixHolderDocument",
                  "000.000.000-00 ou 00.000.000/0001-00",
                )}
              </div>
            </section>

            <section className="mt-8 border-t border-black/5 pt-8">
              <h3 className="text-base font-bold">
                Dados bancários
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {renderTextField(
                  "Banco",
                  "bankName",
                  "Nome do banco",
                )}

                {renderTextField(
                  "Agência",
                  "bankAgency",
                  "Ex.: 0001",
                )}

                {renderTextField(
                  "Conta",
                  "bankAccount",
                  "Número da conta",
                )}

                {renderTextField(
                  "Tipo de conta",
                  "bankAccountType",
                  "Ex.: Conta corrente",
                )}
              </div>
            </section>

            <section className="mt-8 border-t border-black/5 pt-8">
              <h3 className="text-base font-bold">
                Parcelamento e condições
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {renderTextField(
                  "Máximo de parcelas",
                  "maxInstallments",
                  "Ex.: 6",
                  "number",
                )}

                {renderTextField(
                  "Juros e condições",
                  "installmentInterest",
                  "Ex.: Sem juros até 3x",
                )}
              </div>

              <div className="mt-5">
                {renderTextarea(
                  "Prazo para pagamento",
                  "paymentDeadline",
                  "Ex.: Pagamento em até 3 dias após a confirmação do pedido.",
                )}
              </div>
            </section>

            <section className="mt-8 border-t border-black/5 pt-8">
              <h3 className="text-base font-bold">
                Orientações financeiras
              </h3>

              <div className="mt-4 grid gap-5">
                {renderTextarea(
                  "Orientações sobre comprovantes",
                  "receiptInstructions",
                  "Ex.: Envie o comprovante nesta conversa para análise do financeiro.",
                )}

                {renderTextarea(
                  "Regras de faturamento",
                  "billingRules",
                  "Ex.: Faturamento sujeito à aprovação cadastral.",
                )}

                {renderTextarea(
                  "Informações adicionais",
                  "additionalInformation",
                  "Inclua outras condições ou orientações importantes.",
                )}
              </div>
            </section>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <div className="mt-8 flex justify-end border-t border-black/5 pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Salvando..."
                  : "Salvar configurações de pagamento"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

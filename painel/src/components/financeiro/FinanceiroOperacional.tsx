"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

type ReceiptStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_NEW_RECEIPT"
  | "CUSTOMER_NOTIFIED"
  | "FINISHED";

type PaymentReceipt = {
  id: string;
  customerId: string;
  status: ReceiptStatus;
  mediaUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  amount: string | number | null;
  paymentMethod: string | null;
  identifiedBank: string | null;
  paidAt: string | null;
  observations: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  responsible: {
    id: string;
    name: string;
    displayName: string | null;
  } | null;
  customer: {
    id: string;
    customerCode: number | null;
    remoteJid: string;
    name: string | null;
    phone: string | null;
    displayName?: string | null;
    displayPhone?: string | null;
    company: string | null;
    city: string | null;
  };
};

type FinanceFilter =
  | "ACTIVE"
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FINISHED"
  | "ALL";

const filters: Array<{
  value: FinanceFilter;
  label: string;
}> = [
  {
    value: "ACTIVE",
    label: "Ativos",
  },
  {
    value: "RECEIVED",
    label: "Recebidos",
  },
  {
    value: "UNDER_REVIEW",
    label: "Em análise",
  },
  {
    value: "APPROVED",
    label: "Aprovados",
  },
  {
    value: "REJECTED",
    label: "Rejeitados",
  },
  {
    value: "FINISHED",
    label: "Finalizados",
  },
  {
    value: "ALL",
    label: "Todos",
  },
];

function formatCustomerCode(
  value?: number | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Sem código";
  }

  return `Cliente #${String(
    value,
  ).padStart(6, "0")}`;
}

function formatMoney(
  value: string | number | null,
) {
  if (
    value === null ||
    value === ""
  ) {
    return "Não informado";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    Number.isNaN(
      numericValue,
    )
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(numericValue);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

function getCustomerName(
  receipt: PaymentReceipt,
) {
  return (
    receipt.customer.displayName?.trim() ||
    receipt.customer.name?.trim() ||
    receipt.customer.displayPhone?.trim() ||
    receipt.customer.phone?.trim() ||
    "Cliente sem nome"
  );
}

function getStatusLabel(
  status: ReceiptStatus,
) {
  const labels: Record<
    ReceiptStatus,
    string
  > = {
    RECEIVED: "Recebido",
    CLASSIFIED: "Classificado",
    UNDER_REVIEW: "Em análise",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    AWAITING_NEW_RECEIPT:
      "Aguardando novo",
    CUSTOMER_NOTIFIED:
      "Cliente avisado",
    FINISHED: "Finalizado",
  };

  return labels[status];
}

function isActiveStatus(
  status: ReceiptStatus,
) {
  return status !== "FINISHED";
}

export default function FinanceiroOperacional() {
  const [
    receipts,
    setReceipts,
  ] = useState<
    PaymentReceipt[]
  >([]);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<FinanceFilter>(
    "ACTIVE",
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const loadReceipts =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/payment-receipts",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar os comprovantes.",
          );
        }

        setReceipts(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o Financeiro.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const totals =
    useMemo(
      () => ({
        active:
          receipts.filter(
            (receipt) =>
              isActiveStatus(
                receipt.status,
              ),
          ).length,
        received:
          receipts.filter(
            (receipt) =>
              receipt.status ===
              "RECEIVED",
          ).length,
        review:
          receipts.filter(
            (receipt) =>
              receipt.status ===
              "UNDER_REVIEW",
          ).length,
        approved:
          receipts.filter(
            (receipt) =>
              receipt.status ===
              "APPROVED",
          ).length,
        rejected:
          receipts.filter(
            (receipt) =>
              receipt.status ===
              "REJECTED",
          ).length,
        finished:
          receipts.filter(
            (receipt) =>
              receipt.status ===
              "FINISHED",
          ).length,
        all:
          receipts.length,
      }),
      [receipts],
    );

  const filteredReceipts =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR",
          );

      const codeSearch =
        normalized
          .replace(
            /^cliente\s*#?/i,
            "",
          )
          .replace(/^#/, "")
          .trim();

      const numericCode =
        /^\d+$/.test(
          codeSearch,
        )
          ? Number.parseInt(
              codeSearch,
              10,
            )
          : null;

      return receipts
        .filter(
          (receipt) => {
            const matchesFilter =
              activeFilter ===
                "ALL" ||
              (activeFilter ===
                "ACTIVE" &&
                isActiveStatus(
                  receipt.status,
                )) ||
              receipt.status ===
                activeFilter;

            if (!matchesFilter) {
              return false;
            }

            if (!normalized) {
              return true;
            }

            if (
              numericCode !==
              null
            ) {
              return (
                receipt.customer
                  .customerCode ===
                numericCode
              );
            }

            return [
              getCustomerName(
                receipt,
              ),
              receipt.customer
                .displayPhone,
              receipt.customer.phone,
              receipt.customer.company,
              receipt.customer.city,
              receipt.paymentMethod,
              receipt.identifiedBank,
              receipt.observations,
            ].some((value) =>
              value
                ?.toLocaleLowerCase(
                  "pt-BR",
                )
                .includes(
                  normalized,
                ),
            );
          },
        )
        .sort(
          (first, second) =>
            new Date(
              second.createdAt,
            ).getTime() -
            new Date(
              first.createdAt,
            ).getTime(),
        );
    }, [
      activeFilter,
      receipts,
      search,
    ]);

  async function runAction(
    receipt: PaymentReceipt,
    action:
      | "START_REVIEW"
      | "APPROVE"
      | "REJECT"
      | "AWAIT_NEW_RECEIPT"
      | "FINISH",
  ) {
    if (actionId) {
      return;
    }

    let rejectionReason:
      | string
      | undefined;

    if (action === "REJECT") {
      const reason =
        window.prompt(
          "Informe o motivo da rejeição:",
        );

      if (!reason?.trim()) {
        return;
      }

      rejectionReason =
        reason.trim();
    }

    setActionId(
      receipt.id,
    );
    setError("");

    try {
      const response =
        await fetch(
          `/api/payment-receipts/${receipt.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
                actorType:
                  "USER",
                actorId:
                  "julio",
                responsibleId:
                  "julio",
                rejectionReason,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível atualizar o comprovante.",
        );
      }

      await loadReceipts();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao atualizar o comprovante.",
      );
    } finally {
      setActionId(null);
    }
  }

  const filterCounts: Record<
    FinanceFilter,
    number
  > = {
    ACTIVE: totals.active,
    RECEIVED: totals.received,
    UNDER_REVIEW:
      totals.review,
    APPROVED:
      totals.approved,
    REJECTED:
      totals.rejected,
    FINISHED:
      totals.finished,
    ALL: totals.all,
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/35">
            Operação financeira
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#171717]">
            Financeiro Operacional
          </h1>

          <p className="mt-2 text-sm leading-6 text-black/50">
            Analise comprovantes, acompanhe status e abra o cliente sem sair da fila financeira.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {filters
            .filter(
              (filter) =>
                filter.value !==
                "ALL",
            )
            .map((filter) => {
              const active =
                activeFilter ===
                filter.value;

              return (
                <button
                  key={
                    filter.value
                  }
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      filter.value,
                    )
                  }
                  className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-black/5 bg-white text-[#171717] hover:border-black/15"
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                      active
                        ? "text-white/55"
                        : "text-black/35"
                    }`}
                  >
                    {filter.label}
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      filterCounts[
                        filter.value
                      ]
                    }
                  </p>
                </button>
              );
            })}
        </section>

        <section className="mt-5 rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-black/5 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map(
                (filter) => {
                  const active =
                    activeFilter ===
                    filter.value;

                  return (
                    <button
                      key={
                        filter.value
                      }
                      type="button"
                      onClick={() =>
                        setActiveFilter(
                          filter.value,
                        )
                      }
                      className={`h-9 rounded-xl border px-3 text-xs font-bold transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black/55 hover:border-black/20"
                      }`}
                    >
                      {filter.label}{" "}
                      {
                        filterCounts[
                          filter.value
                        ]
                      }
                    </button>
                  );
                },
              )}
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por cliente, código, banco ou pagamento"
              className="h-10 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 lg:max-w-md"
            />
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-sm font-medium text-black/45">
              Carregando comprovantes...
            </div>
          ) : filteredReceipts.length ===
            0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-[#171717]">
                Nenhum comprovante encontrado
              </p>

              <p className="mt-1 text-xs text-black/45">
                Ajuste o filtro ou aguarde novos comprovantes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              {filteredReceipts.map(
                (receipt) => (
                  <article
                    key={
                      receipt.id
                    }
                    className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#e93800]">
                          {formatCustomerCode(
                            receipt
                              .customer
                              .customerCode,
                          )}
                        </p>

                        <h2 className="mt-1 text-base font-bold text-[#171717]">
                          {getCustomerName(
                            receipt,
                          )}
                        </h2>

                        <p className="mt-1 text-xs text-black/45">
                          {receipt.customer
                            .displayPhone ||
                            receipt.customer
                              .phone ||
                            "Telefone não informado"}
                        </p>
                      </div>

                      <span className="rounded-full bg-black/[0.045] px-2.5 py-1 text-[10px] font-bold uppercase text-black/55">
                        {getStatusLabel(
                          receipt.status,
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Info
                        label="Valor"
                        value={formatMoney(
                          receipt.amount,
                        )}
                      />

                      <Info
                        label="Forma"
                        value={
                          receipt.paymentMethod ||
                          "Não informada"
                        }
                      />

                      <Info
                        label="Banco"
                        value={
                          receipt.identifiedBank ||
                          "Não informado"
                        }
                      />

                      <Info
                        label="Recebido"
                        value={formatDate(
                          receipt.createdAt,
                        )}
                      />
                    </div>

                    {receipt.observations && (
                      <p className="mt-3 rounded-xl bg-black/[0.025] px-3 py-2 text-xs leading-5 text-black/55">
                        {
                          receipt.observations
                        }
                      </p>
                    )}

                    {receipt.rejectionReason && (
                      <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        Motivo:{" "}
                        {
                          receipt.rejectionReason
                        }
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {receipt.mediaUrl && (
                        <a
                          href={
                            receipt.mediaUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-xl border border-black/10 px-3 text-xs font-bold text-black/60 transition hover:border-[#ff3d00]/25 hover:text-[#e93800]"
                        >
                          Visualizar
                        </a>
                      )}

                      <Link
                        href={`/clientes?remoteJid=${encodeURIComponent(
                          receipt
                            .customer
                            .remoteJid,
                        )}&tab=arquivos`}
                        className="inline-flex h-9 items-center rounded-xl border border-black/10 px-3 text-xs font-bold text-black/60 transition hover:border-[#ff3d00]/25 hover:text-[#e93800]"
                      >
                        Cliente 360°
                      </Link>

                      <Link
                        href={`/?remoteJid=${encodeURIComponent(
                          receipt
                            .customer
                            .remoteJid,
                        )}`}
                        className="inline-flex h-9 items-center rounded-xl border border-black/10 px-3 text-xs font-bold text-black/60 transition hover:border-[#ff3d00]/25 hover:text-[#e93800]"
                      >
                        Conversa
                      </Link>
                    </div>

                    {receipt.status !==
                      "FINISHED" && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
                        {receipt.status ===
                          "RECEIVED" && (
                          <ActionButton
                            label="Iniciar análise"
                            disabled={
                              actionId !==
                              null
                            }
                            onClick={() =>
                              void runAction(
                                receipt,
                                "START_REVIEW",
                              )
                            }
                          />
                        )}

                        <ActionButton
                          label="Aprovar"
                          disabled={
                            actionId !==
                            null
                          }
                          onClick={() =>
                            void runAction(
                              receipt,
                              "APPROVE",
                            )
                          }
                          success
                        />

                        <ActionButton
                          label="Rejeitar"
                          disabled={
                            actionId !==
                            null
                          }
                          onClick={() =>
                            void runAction(
                              receipt,
                              "REJECT",
                            )
                          }
                          danger
                        />

                        <ActionButton
                          label="Solicitar novo"
                          disabled={
                            actionId !==
                            null
                          }
                          onClick={() =>
                            void runAction(
                              receipt,
                              "AWAIT_NEW_RECEIPT",
                            )
                          }
                        />

                        <ActionButton
                          label="Finalizar"
                          disabled={
                            actionId !==
                            null
                          }
                          onClick={() =>
                            void runAction(
                              receipt,
                              "FINISH",
                            )
                          }
                        />
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black/[0.025] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-black/35">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-black/65">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  success = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        success
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : danger
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "border border-black/10 bg-white text-black/60 hover:border-[#ff3d00]/25 hover:text-[#e93800]"
      }`}
    >
      {label}
    </button>
  );
}

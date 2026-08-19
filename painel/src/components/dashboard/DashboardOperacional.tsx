"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

type CustomerRecord = {
  id: string;
  status: string | null;
  responsibleId?: string | null;
};

type ReminderRecord = {
  id: string;
  title: string;
  remindAt: string;
  status: string;
  customer?: {
    name?: string | null;
    displayName?: string | null;
    customerCode?: number | null;
  } | null;
};

type ReceiptRecord = {
  id: string;
  status: string;
  createdAt: string;
};

type DashboardData = {
  customers: CustomerRecord[];
  reminders: ReminderRecord[];
  receipts: ReceiptRecord[];
};

type TrialAccessData = {
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
  trialEndsAt?: string | null;
  accessAllowed?: boolean;
};

type MetricIcon =
  | "agenda"
  | "overdue"
  | "contacts"
  | "ai"
  | "human"
  | "receipt";

function startOfDay(
  value: Date,
) {
  const result =
    new Date(value);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function endOfDay(
  value: Date,
) {
  const result =
    new Date(value);

  result.setHours(
    23,
    59,
    59,
    999,
  );

  return result;
}

function formatTime(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(value);
}

function getRemainingTrialDays(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const endDate =
    new Date(value);

  if (
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return null;
  }

  const difference =
    endDate.getTime() -
    Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (24 * 60 * 60 * 1000),
  );
}

function formatTrialEnd(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const endDate =
    new Date(value);

  if (
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    return null;
  }

  const date =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    ).format(endDate);

  const time =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(endDate);

  return `${date} às ${time}`;
}

function TrialGiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="8"
        width="18"
        height="13"
        rx="2"
      />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8H8.7a2.7 2.7 0 1 1 2.7-2.7V8" />
      <path d="M12 8h3.3A2.7 2.7 0 1 0 12.6 5.3V8" />
    </svg>
  );
}


function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[14px] w-[14px]"
      aria-hidden="true"
    >
      <path d="M20 6v5h-5" />
      <path d="M19.5 11A7.5 7.5 0 1 0 20 15" />
    </svg>
  );
}

function MetricIcon({
  type,
}: {
  type: MetricIcon;
}) {
  const className =
    "h-5 w-5";

  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    className,
    "aria-hidden": true,
  };

  if (type === "agenda") {
    return (
      <svg {...commonProps}>
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="15"
          rx="2"
        />
        <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
      </svg>
    );
  }

  if (type === "overdue") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M12 7v6l4 2" />
      </svg>
    );
  }

  if (type === "contacts") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="8"
          r="3.5"
        />
        <path d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" />
      </svg>
    );
  }

  if (type === "ai") {
    return (
      <svg {...commonProps}>
        <rect
          x="5"
          y="7"
          width="14"
          height="11"
          rx="3"
        />
        <path d="M9 11h.01M15 11h.01M9 15h6M12 4v3M9 4h6" />
      </svg>
    );
  }

  if (type === "human") {
    return (
      <svg {...commonProps}>
        <circle
          cx="12"
          cy="8"
          r="3"
        />
        <path d="M5 20a7 7 0 0 1 14 0M17.5 5.5l1 1 2-2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2"
      />
      <path d="M3.5 9h17M8 14h3M15.5 14h1" />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  description,
  href,
  icon,
  danger = false,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: MetricIcon;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        danger
          ? "border-red-200"
          : "border-black/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-black/[0.035] text-black/60"
          }`}
        >
          <MetricIcon
            type={icon}
          />
        </div>

        <span className="text-xs font-bold text-black/30 transition group-hover:text-[#087B7B]">
          Abrir →
        </span>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          danger
            ? "text-red-600"
            : "text-[#171717]"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-black/45">
        {description}
      </p>
    </Link>
  );
}

export default function DashboardOperacional() {
  const [
    data,
    setData,
  ] = useState<DashboardData>({
    customers: [],
    reminders: [],
    receipts: [],
  });

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState<Date | null>(
    null,
  );

  const [
    trialAccess,
    setTrialAccess,
  ] = useState<TrialAccessData | null>(
    null,
  );

  const loadTrialAccess =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/company/access-status",
            {
              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          setTrialAccess(null);
          return;
        }

        const result =
          (await response.json()) as TrialAccessData;

        setTrialAccess(result);
      } catch {
        setTrialAccess(null);
      }
    }, []);

  const loadDashboard =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const [
          customersResponse,
          remindersResponse,
          receiptsResponse,
        ] = await Promise.all([
          fetch(
            "/api/customers",
            {
              cache:
                "no-store",
            },
          ),
          fetch(
            "/api/reminders",
            {
              cache:
                "no-store",
            },
          ),
          fetch(
            "/api/payment-receipts",
            {
              cache:
                "no-store",
            },
          ),
        ]);

        const [
          customersData,
          remindersData,
          receiptsData,
        ] = await Promise.all([
          customersResponse.json(),
          remindersResponse.json(),
          receiptsResponse.json(),
        ]);

        if (!customersResponse.ok) {
          throw new Error(
            customersData.error ||
              "Não foi possível carregar os contatos.",
          );
        }

        if (!remindersResponse.ok) {
          throw new Error(
            remindersData.error ||
              "Não foi possível carregar a agenda.",
          );
        }

        if (!receiptsResponse.ok) {
          throw new Error(
            receiptsData.error ||
              "Não foi possível carregar os comprovantes.",
          );
        }

        setData({
          customers:
            Array.isArray(
              customersData,
            )
              ? customersData
              : [],
          reminders:
            Array.isArray(
              remindersData,
            )
              ? remindersData
              : [],
          receipts:
            Array.isArray(
              receiptsData,
            )
              ? receiptsData
              : [],
        });

        setLastUpdatedAt(
          new Date(),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o Dashboard Operacional.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadDashboard();
    void loadTrialAccess();

    const intervalId =
      window.setInterval(
        () => {
          void loadDashboard();
          void loadTrialAccess();
        },
        30_000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    loadDashboard,
    loadTrialAccess,
  ]);

  const trialRemainingDays =
    getRemainingTrialDays(
      trialAccess?.trialEndsAt,
    );

  const trialEndLabel =
    formatTrialEnd(
      trialAccess?.trialEndsAt,
    );

  const metrics =
    useMemo(() => {
      const now =
        new Date();

      const todayStart =
        startOfDay(now);

      const todayEnd =
        endOfDay(now);

      const pendingReminders =
        data.reminders.filter(
          (reminder) =>
            reminder.status ===
            "PENDING",
        );

      const agendaToday =
        pendingReminders.filter(
          (reminder) => {
            const remindAt =
              new Date(
                reminder.remindAt,
              );

            return (
              !Number.isNaN(
                remindAt.getTime(),
              ) &&
              remindAt >=
                now &&
              remindAt <=
                todayEnd
            );
          },
        );

      const overdue =
        pendingReminders.filter(
          (reminder) => {
            const remindAt =
              new Date(
                reminder.remindAt,
              );

            return (
              !Number.isNaN(
                remindAt.getTime(),
              ) &&
              remindAt <
                now
            );
          },
        );

      const ai =
        data.customers.filter(
          (customer) =>
            customer.status ===
            "IA",
        ).length;

      const human =
        data.customers.filter(
          (customer) =>
            customer.status ===
            "HUMANO",
        ).length;

      const activeReceipts =
        data.receipts.filter(
          (receipt) =>
            receipt.status !==
            "FINISHED",
        ).length;

      return {
        contacts:
          data.customers.length,
        ai,
        human,
        agendaToday:
          agendaToday.length,
        agendaNextTwoHours:
          agendaToday.filter(
            (reminder) => {
              const remindAt =
                new Date(
                  reminder.remindAt,
                );

              return (
                remindAt >= now &&
                remindAt <=
                  new Date(
                    now.getTime() +
                      2 * 60 * 60 * 1000,
                  )
              );
            },
          ).length,
        overdue:
          overdue.length,
        activeReceipts,
        agendaItems:
          agendaToday
            .sort(
              (first, second) =>
                new Date(
                  first.remindAt,
                ).getTime() -
                new Date(
                  second.remindAt,
                ).getTime(),
            )
            .slice(0, 5),
      };
    }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f7f7f8]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-[#0A9090]" />

          <p className="mt-3 text-sm font-medium text-black/45">
            Carregando operação...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">
        <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_430px_auto] lg:items-center lg:gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/35">
              Visão geral
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#171717]">
              Dashboard Operacional
            </h1>

            <p className="mt-2 text-sm leading-6 text-black/50">
              O que precisa de atenção na empresa agora.
            </p>
          </div>

          <div className="flex justify-start lg:justify-center">
            {trialAccess?.subscriptionStatus ===
              "TRIAL" &&
              trialRemainingDays !== null &&
              trialEndLabel && (
                <div className="w-full rounded-2xl border border-[#0A9090] bg-white px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 text-[#0A9090]">
                      <TrialGiftIcon />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-5 text-[#171717]">
                        Teste grátis:{" "}
                        {trialRemainingDays === 1
                          ? "1 dia restante"
                          : `${trialRemainingDays} dias restantes`}
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-black/50">
                        Seu teste vai até{" "}
                        {trialEndLabel}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center justify-start gap-3 lg:justify-end">
            {lastUpdatedAt && (
              <p className="text-xs text-black/40">
                Atualizado às{" "}
                {formatTime(
                  lastUpdatedAt,
                )}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                void loadDashboard();
                void loadTrialAccess();
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold leading-none text-black/60 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
            >
              <span className="flex items-center justify-center">
                <RefreshIcon />
              </span>
              <span className="leading-none">Atualizar</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Agenda de hoje"
            value={
              metrics.agendaToday
            }
            description={`${metrics.agendaNextTwoHours} nas próximas 2 horas.`}
            href="/agenda?filter=TODAY"
            icon="agenda"
          />

          <MetricCard
            label="Pendências atrasadas"
            value={
              metrics.overdue
            }
            description={metrics.overdue > 0 ? "Precisam de atenção." : "Tudo em dia."}
            href="/agenda?filter=OVERDUE"
            icon="overdue"
            danger={
              metrics.overdue > 0
            }
          />

          <MetricCard
            label="Contatos"
            value={
              metrics.contacts
            }
            description="Clientes cadastrados na empresa."
            href="/clientes?filter=ALL"
            icon="contacts"
          />

          <MetricCard
            label="IA atendendo"
            value={metrics.ai}
            description="Conversas atualmente com a IA."
            href="/clientes?filter=IA"
            icon="ai"
          />

          <MetricCard
            label="Atendimento humano"
            value={
              metrics.human
            }
            description="Conversas atualmente com a equipe."
            href="/clientes?filter=HUMANO"
            icon="human"
          />

          <MetricCard
            label="Comprovantes ativos"
            value={
              metrics.activeReceipts
            }
            description={metrics.activeReceipts > 0 ? "Aguardando conclusão." : "Nenhum pendente."}
            href="/financeiro"
            icon="receipt"
          />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
                  Próximos compromissos
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#171717]">
                  Agenda de hoje
                </h2>
              </div>

              <Link
                href="/agenda?filter=TODAY"
                className="text-xs font-bold text-[#087B7B]"
              >
                Ver agenda →
              </Link>
            </div>

            {metrics.agendaItems.length ===
            0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-black/10 px-5 py-10 text-center">
                <p className="text-sm font-bold text-[#171717]">
                  Nenhum compromisso hoje
                </p>

                <p className="mt-1 text-xs text-black/45">
                  A operação está sem compromissos agendados para esta data.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {metrics.agendaItems.map(
                  (reminder) => (
                    <div
                      key={
                        reminder.id
                      }
                      className="flex items-center gap-4 rounded-xl border border-black/5 px-4 py-3"
                    >
                      <div className="w-14 shrink-0 text-sm font-bold text-[#171717]">
                        {formatTime(
                          new Date(
                            reminder.remindAt,
                          ),
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#171717]">
                          {reminder.title}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-black/45">
                          {reminder.customer
                            ?.displayName ||
                            reminder.customer
                              ?.name ||
                            "Cliente"}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
              Leitura rápida
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#171717]">
              Situação da operação
            </h2>

            <div className="mt-5 space-y-3">
              <OperationalLine
                label="Agenda de hoje"
                value={
                  metrics.agendaToday
                }
                ok={
                  metrics.agendaToday ===
                  0
                }
              />

              <OperationalLine
                label="Pendências atrasadas"
                value={
                  metrics.overdue
                }
                ok={
                  metrics.overdue ===
                  0
                }
              />

              <OperationalLine
                label="Comprovantes ativos"
                value={
                  metrics.activeReceipts
                }
                ok={
                  metrics.activeReceipts ===
                  0
                }
              />

              <OperationalLine
                label="Atendimento humano"
                value={
                  metrics.human
                }
                ok={true}
              />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function OperationalLine({
  label,
  value,
  ok,
}: {
  label: string;
  value: number;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-black/[0.025] px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            ok
              ? "bg-emerald-500"
              : "bg-amber-500"
          }`}
        />

        <span className="text-sm font-medium text-black/60">
          {label}
        </span>
      </div>

      <strong className="text-sm text-[#171717]">
        {value}
      </strong>
    </div>
  );
}

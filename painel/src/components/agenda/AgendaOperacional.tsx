"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AgendaFilter =
  | "TODAY"
  | "TOMORROW"
  | "OVERDUE"
  | "DATE"
  | "ALL";

type AgendaReminder = {
  id: string;
  companyId: string;
  customerId: string;
  title: string;
  description: string | null;
  remindAt: string;
  responsible: string | null;
  status: string;
  completedAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    customerCode: number | null;
    remoteJid: string;
    name: string | null;
    phone: string | null;
    company: string | null;
    city: string | null;
  };
};

type CustomerLookupRecord = {
  id: string;
  customerCode: number | null;
  name: string | null;
  displayName?: string | null;
  phone: string | null;
  remoteJid: string;
};

const filterOptions: Array<{
  value: AgendaFilter;
  label: string;
}> = [
  {
    value: "TODAY",
    label: "Hoje",
  },
  {
    value: "TOMORROW",
    label: "Amanhã",
  },
  {
    value: "OVERDUE",
    label: "Atrasadas",
  },
  {
    value: "DATE",
    label: "Por data",
  },
  {
    value: "ALL",
    label: "Todas",
  },
];

function normalizeAgendaFilter(
  value: string | null,
): AgendaFilter {
  if (
    value === "TODAY" ||
    value === "TOMORROW" ||
    value === "OVERDUE" ||
    value === "DATE" ||
    value === "ALL"
  ) {
    return value;
  }

  return "TODAY";
}

function startOfDay(
  value: Date,
) {
  const result = new Date(value);

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
  const result = new Date(value);

  result.setHours(
    23,
    59,
    59,
    999,
  );

  return result;
}

function isSameDay(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatCustomerCode(
  customerCode?: number | null,
) {
  if (
    customerCode === null ||
    customerCode === undefined
  ) {
    return "Sem código";
  }

  return `Cliente #${String(
    customerCode,
  ).padStart(6, "0")}`;
}

function formatDate(
  value: string,
) {
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
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getCustomerName(
  reminder: AgendaReminder,
) {
  return (
    reminder.customer.name?.trim() ||
    reminder.customer.phone?.trim() ||
    "Cliente sem nome"
  );
}

export default function AgendaOperacional() {
  const searchParams = useSearchParams();

  const [
    reminders,
    setReminders,
  ] = useState<
    AgendaReminder[]
  >([]);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<AgendaFilter>(
    "TODAY",
  );

  const requestedFilter =
    normalizeAgendaFilter(
      searchParams.get("filter"),
    );

  useEffect(() => {
    setActiveFilter(requestedFilter);

    if (requestedFilter !== "DATE") {
      setSelectedDate("");
    }
  }, [requestedFilter]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    completingId,
    setCompletingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    bulkCodes,
    setBulkCodes,
  ] = useState("");

  const [
    bulkTitle,
    setBulkTitle,
  ] = useState("");

  const [
    bulkDescription,
    setBulkDescription,
  ] = useState("");

  const [
    bulkResponsible,
    setBulkResponsible,
  ] = useState("");

  const [
    bulkDate,
    setBulkDate,
  ] = useState("");

  const [
    bulkTime,
    setBulkTime,
  ] = useState("08:00");

  const [
    isCreatingBulk,
    setIsCreatingBulk,
  ] = useState(false);

  const [
    bulkFeedback,
    setBulkFeedback,
  ] = useState("");

  const loadReminders =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/reminders",
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
              "Não foi possível carregar a agenda.",
          );
        }

        setReminders(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar a agenda.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const filteredReminders =
    useMemo(() => {
      const now = new Date();

      const todayStart =
        startOfDay(now);

      const todayEnd =
        endOfDay(now);

      const tomorrow =
        new Date(now);

      tomorrow.setDate(
        tomorrow.getDate() + 1,
      );

      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR",
          );

      const codeSearch =
        normalizedSearch
          .replace(
            /^cliente\s*#?/i,
            "",
          )
          .replace(/^#/, "")
          .trim();

      const isCodeSearch =
        /^\d+$/.test(
          codeSearch,
        );

      return reminders.filter(
        (reminder) => {
          const remindAt =
            new Date(
              reminder.remindAt,
            );

          if (
            Number.isNaN(
              remindAt.getTime(),
            )
          ) {
            return false;
          }

          const matchesFilter =
            activeFilter ===
              "ALL" ||
            (activeFilter ===
              "TODAY" &&
              remindAt >
                now &&
              remindAt <=
                todayEnd) ||
            (activeFilter ===
              "TOMORROW" &&
              isSameDay(
                remindAt,
                tomorrow,
              )) ||
            (activeFilter ===
              "OVERDUE" &&
              remindAt <=
                now) ||
            (activeFilter ===
              "DATE" &&
              selectedDate &&
              isSameDay(
                remindAt,
                new Date(
                  `${selectedDate}T00:00:00`,
                ),
              ));

          if (!matchesFilter) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          if (
            isCodeSearch
          ) {
            return (
              reminder.customer
                .customerCode ===
              Number.parseInt(
                codeSearch,
                10,
              )
            );
          }

          return [
            reminder.title,
            reminder.description,
            reminder.responsible,
            reminder.customer.name,
            reminder.customer.phone,
            reminder.customer.company,
            reminder.customer.city,
          ].some((value) =>
            value
              ?.toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                normalizedSearch,
              ),
          );
        },
      );
    }, [
      activeFilter,
      reminders,
      search,
      selectedDate,
    ]);

  const totals =
    useMemo(() => {
      const now = new Date();
      const todayStart =
        startOfDay(now);
      const todayEnd =
        endOfDay(now);

      const tomorrow =
        new Date(now);

      tomorrow.setDate(
        tomorrow.getDate() + 1,
      );

      return {
        today:
          reminders.filter(
            (reminder) => {
              const date =
                new Date(
                  reminder.remindAt,
                );

              return (
                date >
                  now &&
                date <=
                  todayEnd
              );
            },
          ).length,
        tomorrow:
          reminders.filter(
            (reminder) =>
              isSameDay(
                new Date(
                  reminder.remindAt,
                ),
                tomorrow,
              ),
          ).length,
        overdue:
          reminders.filter(
            (reminder) => {
              const date =
                new Date(
                  reminder.remindAt,
                );

              return (
                !Number.isNaN(
                  date.getTime(),
                ) &&
                date <=
                  now
              );
            },
          ).length,
        all:
          reminders.length,
      };
    }, [reminders]);

  async function completeReminder(
    reminderId: string,
  ) {
    if (completingId) {
      return;
    }

    setCompletingId(
      reminderId,
    );
    setError("");

    try {
      const response =
        await fetch(
          "/api/reminders",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id: reminderId,
                action:
                  "complete",
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível concluir a pendência.",
        );
      }

      setReminders(
        (current) =>
          current.filter(
            (reminder) =>
              reminder.id !==
              reminderId,
          ),
      );
    } catch (
      completeError
    ) {
      setError(
        completeError instanceof
          Error
          ? completeError.message
          : "Erro ao concluir a pendência.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  function parseCustomerCodes(
    value: string,
  ) {
    return Array.from(
      new Set(
        value
          .split(/[\s,;]+/)
          .map((item) =>
            item
              .replace(
                /^cliente\s*#?/i,
                "",
              )
              .replace(/^#/, "")
              .trim(),
          )
          .filter((item) =>
            /^\d+$/.test(item),
          )
          .map((item) =>
            Number.parseInt(
              item,
              10,
            ),
          )
          .filter(
            (item) =>
              Number.isInteger(
                item,
              ) &&
              item > 0,
          ),
      ),
    );
  }

  async function createBulkReminders() {
    if (isCreatingBulk) {
      return;
    }

    const codes =
      parseCustomerCodes(
        bulkCodes,
      );

    if (codes.length === 0) {
      setBulkFeedback(
        "Informe pelo menos um código de cliente válido.",
      );
      return;
    }

    if (!bulkTitle.trim()) {
      setBulkFeedback(
        "Informe o compromisso.",
      );
      return;
    }

    if (!bulkDate) {
      setBulkFeedback(
        "Informe a data.",
      );
      return;
    }

    const remindAt =
      new Date(
        `${bulkDate}T${bulkTime || "08:00"}:00`,
      );

    if (
      Number.isNaN(
        remindAt.getTime(),
      )
    ) {
      setBulkFeedback(
        "Data ou horário inválido.",
      );
      return;
    }

    setIsCreatingBulk(true);
    setBulkFeedback("");
    setError("");

    try {
      const customersResponse =
        await fetch(
          "/api/customers",
          {
            cache: "no-store",
          },
        );

      const customersData =
        await customersResponse.json();

      if (!customersResponse.ok) {
        throw new Error(
          customersData.error ||
            "Não foi possível localizar os clientes.",
        );
      }

      const customers =
        (Array.isArray(
          customersData,
        )
          ? customersData
          : []) as CustomerLookupRecord[];

      const customerByCode =
        new Map<
          number,
          CustomerLookupRecord
        >();

      for (
        const customer of
        customers
      ) {
        if (
          customer.customerCode !==
            null &&
          customer.customerCode !==
            undefined
        ) {
          customerByCode.set(
            customer.customerCode,
            customer,
          );
        }
      }

      const missingCodes =
        codes.filter(
          (code) =>
            !customerByCode.has(
              code,
            ),
        );

      const foundCustomers =
        codes
          .map((code) =>
            customerByCode.get(
              code,
            ),
          )
          .filter(
            (
              customer,
            ): customer is CustomerLookupRecord =>
              Boolean(customer),
          );

      if (
        foundCustomers.length ===
        0
      ) {
        setBulkFeedback(
          `Nenhum cliente encontrado. Códigos não localizados: ${missingCodes.join(
            ", ",
          )}.`,
        );
        return;
      }

      const results =
        await Promise.allSettled(
          foundCustomers.map(
            async (
              customer,
            ) => {
              const response =
                await fetch(
                  "/api/reminders",
                  {
                    method:
                      "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body:
                      JSON.stringify({
                        customerId:
                          customer.id,
                        title:
                          bulkTitle.trim(),
                        description:
                          bulkDescription.trim() ||
                          null,
                        remindAt:
                          remindAt.toISOString(),
                        responsible:
                          bulkResponsible.trim() ||
                          null,
                      }),
                  },
                );

              const data =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  data.error ||
                    "Não foi possível criar o compromisso.",
                );
              }

              return data;
            },
          ),
        );

      const createdCount =
        results.filter(
          (result) =>
            result.status ===
            "fulfilled",
        ).length;

      const failedCount =
        results.length -
        createdCount;

      const feedbackParts = [
        `${createdCount} compromisso${
          createdCount === 1
            ? ""
            : "s"
        } criado${
          createdCount === 1
            ? ""
            : "s"
        }.`,
      ];

      if (
        missingCodes.length >
        0
      ) {
        feedbackParts.push(
          `Não encontrados: ${missingCodes.join(
            ", ",
          )}.`,
        );
      }

      if (failedCount > 0) {
        feedbackParts.push(
          `${failedCount} falharam ao salvar.`,
        );
      }

      setBulkFeedback(
        feedbackParts.join(
          " ",
        ),
      );

      if (createdCount > 0) {
        setBulkCodes("");
        await loadReminders();
      }
    } catch (bulkError) {
      setBulkFeedback(
        bulkError instanceof Error
          ? bulkError.message
          : "Erro ao criar compromissos em lote.",
      );
    } finally {
      setIsCreatingBulk(false);
    }
  }

  const currentFilterTotal =
    activeFilter === "TODAY"
      ? totals.today
      : activeFilter ===
          "TOMORROW"
        ? totals.tomorrow
        : activeFilter ===
            "OVERDUE"
          ? totals.overdue
          : activeFilter ===
              "DATE"
            ? filteredReminders.length
            : totals.all;

  const printablePeriod =
    activeFilter === "TODAY"
      ? "Hoje"
      : activeFilter === "TOMORROW"
        ? "Amanhã"
        : activeFilter === "OVERDUE"
          ? "Pendências atrasadas"
          : activeFilter === "DATE" &&
              selectedDate
            ? new Intl.DateTimeFormat(
                "pt-BR",
                {
                  dateStyle: "long",
                },
              ).format(
                new Date(
                  `${selectedDate}T00:00:00`,
                ),
              )
            : "Todos os compromissos";

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8]">
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          aside,
          nav,
          button,
          input,
          textarea,
          .print-hidden {
            display: none !important;
          }

          main {
            overflow: visible !important;
            background: #ffffff !important;
          }

          article {
            break-inside: avoid;
          }

          @page {
            size: A4 portrait;
            margin: 14mm;
          }
        }
      `}</style>

      <div className="mx-auto hidden w-full max-w-[1500px] print:block">
        <div className="border-b border-black pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">
            M1M Connect
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Relatório da Agenda Operacional
          </h1>

          <p className="mt-1 text-sm">
            Período: {printablePeriod}
          </p>

          <p className="mt-1 text-sm">
            Total: {filteredReminders.length} compromisso{filteredReminders.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8 print:px-0 print:py-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-black/45 transition hover:text-[#e93800]"
            >
              <span aria-hidden="true">←</span>
              Voltar ao Painel
            </Link>

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/35">
              Operação diária
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#171717]">
              Agenda Operacional
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
              Acompanhe retornos, pendências e compromissos vinculados aos clientes.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-black/70 transition hover:border-[#ff3d00]/30 hover:text-[#e93800] print:hidden"
          >
            Imprimir agenda
          </button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
          <SummaryCard
            label="Hoje"
            value={totals.today}
          />

          <SummaryCard
            label="Amanhã"
            value={
              totals.tomorrow
            }
          />

          <SummaryCard
            label="Atrasadas"
            value={
              totals.overdue
            }
            danger={
              totals.overdue > 0
            }
          />

          <SummaryCard
            label="Todas"
            value={totals.all}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
              Lançamento em lote
            </p>

            <h2 className="text-lg font-bold text-[#171717]">
              Adicionar clientes por código
            </h2>

            <p className="text-xs leading-5 text-black/45">
              Informe vários códigos separados por vírgula, espaço ou quebra de linha.
            </p>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr_180px_140px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-black/55">
                Códigos dos clientes
              </span>

              <textarea
                value={bulkCodes}
                onChange={(event) =>
                  setBulkCodes(
                    event.target.value,
                  )
                }
                placeholder="14, 22, 35&#10;ou Cliente #000014"
                rows={4}
                className="w-full resize-y rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2.5 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
              />
            </label>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-black/55">
                  Compromisso
                </span>

                <input
                  value={bulkTitle}
                  onChange={(event) =>
                    setBulkTitle(
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: Ligar para confirmar pedido"
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-black/55">
                  Observação
                </span>

                <input
                  value={
                    bulkDescription
                  }
                  onChange={(event) =>
                    setBulkDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Opcional"
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-black/55">
                  Data
                </span>

                <input
                  type="date"
                  value={bulkDate}
                  onChange={(event) =>
                    setBulkDate(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-black/55">
                  Responsável
                </span>

                <input
                  value={
                    bulkResponsible
                  }
                  onChange={(event) =>
                    setBulkResponsible(
                      event.target.value,
                    )
                  }
                  placeholder="Opcional"
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                />
              </label>
            </div>

            <div className="grid content-start gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-black/55">
                  Horário
                </span>

                <input
                  type="time"
                  value={bulkTime}
                  onChange={(event) =>
                    setBulkTime(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                />
              </label>

              <button
                type="button"
                disabled={
                  isCreatingBulk
                }
                onClick={() =>
                  void createBulkReminders()
                }
                className="h-11 rounded-xl bg-[#ff3d00] px-4 text-sm font-bold text-white transition hover:bg-[#e93800] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isCreatingBulk
                  ? "Adicionando..."
                  : "Adicionar à agenda"}
              </button>
            </div>
          </div>

          {bulkFeedback && (
            <div className="mt-4 rounded-xl bg-black/[0.035] px-4 py-3 text-sm font-medium text-black/65">
              {bulkFeedback}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/5 p-4 print:hidden">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(
                  (filter) => {
                    const active =
                      activeFilter ===
                      filter.value;

                    const count =
                      filter.value ===
                      "TODAY"
                        ? totals.today
                        : filter.value ===
                            "TOMORROW"
                          ? totals.tomorrow
                          : filter.value ===
                              "OVERDUE"
                            ? totals.overdue
                            : filter.value ===
                                "DATE"
                              ? filteredReminders.length
                              : totals.all;

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
                        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                          active
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black/55 hover:border-black/20"
                        }`}
                      >
                        {filter.label}

                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                            active
                              ? "bg-white/15 text-white"
                              : "bg-black/[0.045] text-black/45"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
                {activeFilter === "DATE" && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(
                        event.target.value,
                      )
                    }
                    className="h-10 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
                  />
                )}

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Buscar por cliente, código ou tarefa"
                className="h-10 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
              />
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 print:hidden">
              {error}
            </div>
          )}

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
                  Compromissos
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#171717]">
                  {currentFilterTotal}{" "}
                  {currentFilterTotal ===
                  1
                    ? "item"
                    : "itens"}
                </h2>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-dashed border-black/10 px-5 py-12 text-center text-sm font-medium text-black/40">
                Carregando agenda...
              </div>
            ) : filteredReminders.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-black/10 px-5 py-12 text-center">
                <p className="text-sm font-bold text-[#171717]">
                  Nenhum compromisso encontrado
                </p>

                <p className="mt-1 text-xs text-black/45">
                  Ajuste o filtro ou crie uma pendência dentro do Cliente 360°.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReminders.map(
                  (reminder) => {
                    const remindAt =
                      new Date(
                        reminder.remindAt,
                      );

                    const overdue =
                      !Number.isNaN(
                        remindAt.getTime(),
                      ) &&
                      remindAt <=
                        new Date();

                    return (
                      <article
                        key={
                          reminder.id
                        }
                        className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:items-center ${
                          overdue
                            ? "border-red-200 bg-red-50/55"
                            : "border-black/5 bg-white"
                        }`}
                      >
                        <div className="rounded-xl bg-black/[0.035] px-3 py-2 text-center">
                          <p className="text-lg font-bold text-[#171717]">
                            {formatTime(
                              reminder.remindAt,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] font-semibold uppercase text-black/40">
                            {formatDate(
                              reminder.remindAt,
                            )}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-[#fff3ee] px-2 py-1 text-[10px] font-bold text-[#e93800]">
                              {formatCustomerCode(
                                reminder
                                  .customer
                                  .customerCode,
                              )}
                            </span>

                            {overdue && (
                              <span className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">
                                Atrasada
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 truncate text-base font-bold text-[#171717]">
                            {getCustomerName(
                              reminder,
                            )}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-black/65">
                            {reminder.title}
                          </p>

                          {reminder.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/45">
                              {
                                reminder.description
                              }
                            </p>
                          )}

                          <p className="mt-2 text-xs text-black/40">
                            Responsável:{" "}
                            <strong className="text-black/60">
                              {reminder.responsible ||
                                "Sem responsável"}
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 print:hidden sm:flex-col">
                          <Link
                            href={`/clientes?remoteJid=${encodeURIComponent(
                              reminder
                                .customer
                                .remoteJid,
                            )}&tab=lembretes`}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/60 transition hover:border-[#ff3d00]/25 hover:text-[#e93800]"
                          >
                            Abrir cliente
                          </Link>

                          <Link
                            href={`/?remoteJid=${encodeURIComponent(
                              reminder
                                .customer
                                .remoteJid,
                            )}`}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/60 transition hover:border-[#ff3d00]/25 hover:text-[#e93800]"
                          >
                            Conversa
                          </Link>

                          <button
                            type="button"
                            disabled={
                              completingId !==
                              null
                            }
                            onClick={() =>
                              void completeReminder(
                                reminder.id,
                              )
                            }
                            className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {completingId ===
                            reminder.id
                              ? "Concluindo..."
                              : "Concluir"}
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        danger
          ? "border-red-200"
          : "border-black/5"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-black/35">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          danger
            ? "text-red-600"
            : "text-[#171717]"
        }`}
      >
        {value}
      </p>
    </article>
  );
}

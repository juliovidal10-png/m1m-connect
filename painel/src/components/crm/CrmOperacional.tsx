"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import CustomerPanel from "@/components/chat/CustomerPanel";

type CustomerRecord = {
  id: string;
  customerCode: number | null;
  remoteJid: string;
  displayName: string;
  name: string | null;
  phone: string | null;
  displayPhone: string | null;
  company: string | null;
  city: string | null;
  status: string | null;
  responsible: string | null;
  responsibleId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isGroup: boolean;
  _count: {
    attendances: number;
    messages: number;
    reminders: number;
    paymentReceipts: number;
  };
};

type CrmFilter =
  | "ALL"
  | "IA"
  | "HUMANO"
  | "PENDING"
  | "RECEIPTS";

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

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Sem contato";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

function getInitials(
  name: string,
) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("") || "CL"
  );
}

export default function CrmOperacional() {
  const [
    customers,
    setCustomers,
  ] = useState<
    CustomerRecord[]
  >([]);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<CrmFilter>(
    "ALL",
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<
    CustomerRecord | null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/customers",
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
              "Não foi possível carregar o CRM.",
          );
        }

        setCustomers(
          (
            Array.isArray(data)
              ? data
              : []
          ).filter(
            (
              customer: CustomerRecord,
            ) =>
              !customer.isGroup,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o CRM.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCustomers();
  }, []);

  const totals =
    useMemo(
      () => ({
        all:
          customers.length,
        ia:
          customers.filter(
            (customer) =>
              customer.status ===
              "IA",
          ).length,
        human:
          customers.filter(
            (customer) =>
              customer.status ===
              "HUMANO",
          ).length,
        pending:
          customers.filter(
            (customer) =>
              customer._count
                .reminders > 0,
          ).length,
        receipts:
          customers.filter(
            (customer) =>
              customer._count
                .paymentReceipts >
              0,
          ).length,
      }),
      [customers],
    );

  const filteredCustomers =
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

      return customers
        .filter(
          (customer) => {
            const matchesFilter =
              activeFilter ===
                "ALL" ||
              (activeFilter ===
                "IA" &&
                customer.status ===
                  "IA") ||
              (activeFilter ===
                "HUMANO" &&
                customer.status ===
                  "HUMANO") ||
              (activeFilter ===
                "PENDING" &&
                customer._count
                  .reminders >
                  0) ||
              (activeFilter ===
                "RECEIPTS" &&
                customer._count
                  .paymentReceipts >
                  0);

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
                customer.customerCode ===
                numericCode
              );
            }

            return [
              customer.displayName,
              customer.displayPhone,
              customer.phone,
              customer.company,
              customer.city,
              customer.responsible,
              customer.lastMessagePreview,
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
              second.lastMessageAt ||
                second.createdAt,
            ).getTime() -
            new Date(
              first.lastMessageAt ||
                first.createdAt,
            ).getTime(),
        );
    }, [
      activeFilter,
      customers,
      search,
    ]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f7f7f8]">
        <p className="text-sm font-medium text-black/45">
          Carregando CRM...
        </p>
      </div>
    );
  }

  const filters: Array<{
    value: CrmFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "ALL",
      label: "Todos",
      count: totals.all,
    },
    {
      value: "IA",
      label: "IA",
      count: totals.ia,
    },
    {
      value: "HUMANO",
      label: "Humano",
      count: totals.human,
    },
    {
      value: "PENDING",
      label: "Com pendências",
      count: totals.pending,
    },
    {
      value: "RECEIPTS",
      label: "Com comprovantes em aberto",
      count: totals.receipts,
    },
  ];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/35">
            Gestão de relacionamento
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#171717]">
            CRM Operacional
          </h1>

          <p className="mt-2 text-sm leading-6 text-black/50">
            Clientes, situação atual e próximos pontos de atenção em uma única visão.
          </p>
        </header>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                    {filter.count}
                  </p>
                </button>
              );
            },
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/5 p-4">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar por nome, telefone, empresa, cidade ou código"
              className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
            />
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.map(
              (customer) => (
                <article
                  key={
                    customer.id
                  }
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-[#0A9090]/20 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0F9F9] text-xs font-bold text-[#087B7B]">
                      {getInitials(
                        customer.displayName,
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#087B7B]">
                        {formatCustomerCode(
                          customer.customerCode,
                        )}
                      </p>

                      <h2 className="mt-1 truncate text-base font-bold text-[#171717]">
                        {customer.displayName}
                      </h2>

                      <p className="mt-1 truncate text-xs text-black/45">
                        {customer.displayPhone ||
                          customer.phone ||
                          "Telefone não informado"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        customer.status ===
                        "HUMANO"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-teal-50 text-teal-700"
                      }`}
                    >
                      {customer.status ===
                      "HUMANO"
                        ? "Humano"
                        : "IA"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Info
                      label="Responsável"
                      value={
                        customer.responsible ||
                        "Sem responsável"
                      }
                    />

                    <Info
                      label="Último contato"
                      value={formatDate(
                        customer.lastMessageAt,
                      )}
                    />

                    <Info
                      label="Pendências"
                      value={String(
                        customer._count
                          .reminders,
                      )}
                    />

                    <Info
                      label="Comprovantes"
                      value={String(
                        customer._count
                          .paymentReceipts,
                      )}
                    />
                  </div>

                  {(customer.company ||
                    customer.city) && (
                    <p className="mt-3 truncate text-xs text-black/45">
                      {[
                        customer.company,
                        customer.city,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCustomer(
                          customer,
                        )
                      }
                      className="h-9 rounded-xl bg-black px-3 text-xs font-bold text-white transition hover:bg-black/80"
                    >
                      Cliente 360°
                    </button>

                    <Link
                      href={`/?remoteJid=${encodeURIComponent(
                        customer.remoteJid,
                      )}`}
                      className="inline-flex h-9 items-center rounded-xl border border-black/10 px-3 text-xs font-bold text-black/60 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
                    >
                      Conversa
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(
                          customer,
                        );
                      }}
                      className="h-9 rounded-xl border border-black/10 px-3 text-xs font-bold text-black/60 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
                    >
                      Timeline
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>

          {filteredCustomers.length ===
            0 && (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-[#171717]">
                Nenhum cliente encontrado
              </p>

              <p className="mt-1 text-xs text-black/45">
                Ajuste a busca ou selecione outro filtro.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedCustomer && (
        <CustomerPanel
          isOpen={true}
          onClose={() =>
            setSelectedCustomer(
              null,
            )
          }
          name={
            selectedCustomer.displayName
          }
          phone={
            selectedCustomer.displayPhone ||
            selectedCustomer.phone ||
            ""
          }
          remoteJid={
            selectedCustomer.remoteJid
          }
          lastInteraction={formatDate(
            selectedCustomer.lastMessageAt,
          )}

          conversationHref={`/?remoteJid=${encodeURIComponent(
            selectedCustomer.remoteJid,
          )}`}
          initialTab="atividades"
        />
      )}
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

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import CustomerPanel from "@/components/chat/CustomerPanel";

type CustomerStatus =
  | "IA"
  | "HUMANO"
  | string;

type CustomerRecord = {
  id: string;
  customerCode: number | null;
  remoteJid: string;
  name: string | null;
  displayName: string;
  phone: string | null;
  displayPhone: string | null;
  company: string | null;
  city: string | null;
  status: CustomerStatus;
  responsible: string | null;
  responsibleId: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  isGroup: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  profilePicUrl?: string | null;
  assignedUser: {
    id: string;
    name: string;
    displayName: string | null;
    active: boolean;
  } | null;
  attendances: Array<{
    id: string;
    number: number;
    state: string;
    startedAt: string;
    finishedAt: string | null;
    updatedAt: string;
    responsible: {
      id: string;
      name: string;
      displayName: string | null;
    } | null;
    sector: {
      id: string;
      name: string;
    } | null;
  }>;
  _count: {
    attendances: number;
    messages: number;
    reminders: number;
    paymentReceipts: number;
  };
};

type ChatContactRecord = {
  remoteJid: string;
  profilePicUrl: string | null;
  isGroup: boolean;
};

type FilterValue =
  | "ALL"
  | "IA"
  | "HUMANO"
  | "UNASSIGNED";

const filters: Array<{
  value: FilterValue;
  label: string;
}> = [
  {
    value: "ALL",
    label: "Todos",
  },
  {
    value: "IA",
    label: "IA",
  },
  {
    value: "HUMANO",
    label: "Humano",
  },
  {
    value: "UNASSIGNED",
    label: "Sem responsável",
  },
];

function normalizeCustomerFilter(
  value: string | null,
): FilterValue {
  if (
    value === "ALL" ||
    value === "IA" ||
    value === "HUMANO" ||
    value === "UNASSIGNED"
  ) {
    return value;
  }

  return "ALL";
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function getResponsible(
  customer: CustomerRecord,
) {
  const attendanceResponsible =
    customer.attendances[0]
      ?.responsible;

  return (
    customer.assignedUser
      ?.displayName ||
    customer.assignedUser?.name ||
    customer.responsible ||
    attendanceResponsible?.displayName ||
    attendanceResponsible?.name ||
    "Sem responsável"
  );
}

function formatCustomerCode(
  customerCode?: number | null,
) {
  if (
    customerCode === null ||
    customerCode === undefined
  ) {
    return null;
  }

  return String(
    customerCode,
  ).padStart(6, "0");
}

function getInitials(
  name: string,
) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    parts
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "CT"
  );
}


function StatusBadge({
  status,
}: {
  status: CustomerStatus;
}) {
  const isHuman =
    status === "HUMANO";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "999px",
        border: isHuman
          ? "1px solid #bbf7d0"
          : "1px solid #BFE8E8",
        background: isHuman
          ? "#f0fdf4"
          : "#ECF8F8",
        color: isHuman
          ? "#15803d"
          : "#087B7B",
        padding: "5px 10px",
        fontSize: "10px",
        fontWeight: 700,
        lineHeight: 1,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {isHuman ? "Humano" : "IA"}
    </span>
  );
}

type CustomerPanelTab =
  | "cliente"
  | "cliente"
  | "atividades"
  | "arquivos";

function normalizeCustomerTab(
  value: string | null,
): CustomerPanelTab {
  if (
    value === "cliente" ||
    value === "atividades" ||
    value === "arquivos"
  ) {
    return value;
  }

  return "cliente";
}

export default function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] =
    useState<CustomerRecord[]>([]);

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<FilterValue>("ALL");

  const [currentPage, setCurrentPage] =
    useState(1);

  const pageSize = 10;

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] = useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      setError(null);

      try {
        const [
          customersResponse,
          contactsResponse,
        ] = await Promise.all([
          fetch(
            "/api/customers",
            {
              cache: "no-store",
            },
          ),
          fetch(
            "/api/chat/contacts",
            {
              cache: "no-store",
            },
          ),
        ]);

        const customersData =
          await customersResponse.json();

        const contactsData =
          await contactsResponse.json();

        if (!customersResponse.ok) {
          throw new Error(
            customersData.error ||
              "Não foi possível carregar os contatos.",
          );
        }

        const profilePictures =
          new Map<string, string | null>(
            (
              Array.isArray(contactsData)
                ? (contactsData as ChatContactRecord[])
                : []
            )
              .filter(
                (contact) =>
                  !contact.isGroup,
              )
              .map((contact) => [
                contact.remoteJid,
                contact.profilePicUrl,
              ]),
          );

        const loadedCustomers =
          Array.isArray(customersData)
            ? (
                customersData as CustomerRecord[]
              )
                .filter(
                  (customer) =>
                    !customer.isGroup,
                )
                .map((customer) => ({
                  ...customer,
                  profilePicUrl:
                    profilePictures.get(
                      customer.remoteJid,
                    ) ?? null,
                }))
            : [];

        setCustomers(loadedCustomers);

        setSelectedCustomerId(
          (currentId) =>
            loadedCustomers.some(
              (customer) =>
                customer.id === currentId,
            )
              ? currentId
              : null,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar os contatos.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCustomers();
  }, []);

  const requestedRemoteJid =
    searchParams.get("remoteJid");

  const requestedFilter =
    normalizeCustomerFilter(
      searchParams.get("filter"),
    );

  const requestedTab =
    normalizeCustomerTab(
      searchParams.get("tab"),
    );

  useEffect(() => {
    if (requestedRemoteJid) {
      return;
    }

    setActiveFilter(requestedFilter);
    setCurrentPage(1);
  }, [
    requestedFilter,
    requestedRemoteJid,
  ]);

  useEffect(() => {
    if (
      !requestedRemoteJid ||
      customers.length === 0
    ) {
      return;
    }

    const requestedCustomer =
      customers.find(
        (customer) =>
          customer.remoteJid ===
          requestedRemoteJid,
      );

    if (!requestedCustomer) {
      return;
    }

    setSearch("");
    setActiveFilter("ALL");
    setSelectedCustomerId(
      requestedCustomer.id,
    );
  }, [
    customers,
    requestedRemoteJid,
  ]);

  const filteredCustomers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            "pt-BR",
          );

      return customers.filter(
        (customer) => {
          const matchesFilter =
            activeFilter === "ALL" ||
            (activeFilter === "IA" &&
              customer.status ===
                "IA") ||
            (activeFilter ===
              "HUMANO" &&
              customer.status ===
                "HUMANO") ||
            (activeFilter ===
              "UNASSIGNED" &&
              !customer.responsibleId);

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const codeSearch =
            normalizedSearch
              .replace(/^cliente\s*#?/i, "")
              .replace(/^#/, "")
              .trim();

          const isOnlyCustomerCode =
            /^\d+$/.test(codeSearch);

          if (isOnlyCustomerCode) {
            const numericCode =
              Number.parseInt(
                codeSearch,
                10,
              );

            return (
              customer.customerCode ===
              numericCode
            );
          }

          return [
            customer.displayName,
            customer.displayPhone,
            customer.company,
            customer.city,
            customer.remoteJid,
            getResponsible(customer),
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
      customers,
      search,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeFilter,
    search,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCustomers.length /
          pageSize,
      ),
    );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedCustomers =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        pageSize;

      return filteredCustomers.slice(
        start,
        start + pageSize,
      );
    }, [
      currentPage,
      filteredCustomers,
    ]);

  const selectedCustomer =
    useMemo(() => {
      const selected =
        filteredCustomers.find(
          (customer) =>
            customer.id ===
            selectedCustomerId,
        );

      return selected || null;
    }, [
      filteredCustomers,
      selectedCustomerId,
    ]);

  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8] p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-[1500px] gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="h-[720px] animate-pulse rounded-2xl border border-black/5 bg-white" />
          <div className="h-[720px] animate-pulse rounded-2xl border border-black/5 bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8] p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1500px] rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: 0,
        flex: 1,
        overflowY: "auto",
        background: "#f7f7f8",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1680px",
          margin: "0 auto",
          padding: "14px 16px 16px",
          boxSizing: "border-box",
        }}
      >
        <section
          style={{
            marginTop: 0,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: "18px",
            background: "#ffffff",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom:
                "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <label
              style={{
                height: "48px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border:
                  "1px solid rgba(0,0,0,0.10)",
                borderRadius: "12px",
                background: "#fafafa",
                padding: "0 16px",
                boxSizing: "border-box",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                width="18"
                height="18"
                style={{
                  display: "block",
                  flex: "0 0 auto",
                  color:
                    "rgba(0,0,0,0.38)",
                }}
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar contatos"
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  outline: "none",
                  background:
                    "transparent",
                  fontSize: "14px",
                  color: "#171717",
                  padding: 0,
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              {filters.map(
                (filter) => {
                  const active =
                    activeFilter ===
                    filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() =>
                        setActiveFilter(
                          filter.value,
                        )
                      }
                      style={{
                        height: "36px",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        flex: "0 0 auto",
                        borderRadius:
                          "11px",
                        border: active
                          ? "1px solid #000000"
                          : "1px solid rgba(0,0,0,0.10)",
                        background: active
                          ? "#000000"
                          : "#ffffff",
                        color: active
                          ? "#ffffff"
                          : "rgba(0,0,0,0.62)",
                        padding:
                          "0 14px",
                        fontSize:
                          "11px",
                        fontWeight: active
                          ? 700
                          : 600,
                        cursor:
                          "pointer",
                      }}
                    >
                      {filter.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div
            style={{
              minHeight: "460px",
              maxHeight:
                "calc(100vh - 390px)",
              overflowY: "auto",
            }}
          >
            {filteredCustomers.length ===
            0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Nenhum contato encontrado
                </p>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color:
                      "rgba(0,0,0,0.42)",
                  }}
                >
                  Ajuste a busca ou selecione outro filtro.
                </p>
              </div>
            ) : (
              paginatedCustomers.map(
                (customer) => {
                  const isSelected =
                    selectedCustomer
                      ?.id ===
                    customer.id;

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        setSelectedCustomerId(
                          customer.id,
                        )
                      }
                      style={{
                        width: "100%",
                        minHeight: "92px",
                        display: "grid",
                        gridTemplateColumns:
                          "52px minmax(0, 1fr) auto",
                        alignItems:
                          "center",
                        columnGap: "16px",
                        border: 0,
                        borderBottom:
                          "1px solid rgba(0,0,0,0.06)",
                        background:
                          isSelected
                            ? "#ECF8F8"
                            : "#ffffff",
                        padding:
                          "14px 24px",
                        textAlign:
                          "left",
                        cursor:
                          "pointer",
                        boxSizing:
                          "border-box",
                      }}
                    >
                      {customer.profilePicUrl ? (
                        <img
                          src={
                            customer.profilePicUrl
                          }
                          alt=""
                          style={{
                            width:
                              "48px",
                            height:
                              "48px",
                            borderRadius:
                              "12px",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width:
                              "48px",
                            height:
                              "48px",
                            borderRadius:
                              "12px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              isSelected
                                ? "#0A9090"
                                : "#ECF8F8",
                            color:
                              isSelected
                                ? "#ffffff"
                                : "#087B7B",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                          }}
                        >
                          {getInitials(
                            customer.displayName,
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        {formatCustomerCode(
                          customer.customerCode,
                        ) && (
                          <p
                            style={{
                              margin: 0,
                              fontSize:
                                "10px",
                              fontWeight:
                                700,
                              lineHeight:
                                1.2,
                              letterSpacing:
                                "0.06em",
                              textTransform:
                                "uppercase",
                              color:
                                "#087B7B",
                            }}
                          >
                            Cliente #
                            {formatCustomerCode(
                              customer.customerCode,
                            )}
                          </p>
                        )}

                        <p
                          style={{
                            margin:
                              formatCustomerCode(
                                customer.customerCode,
                              )
                                ? "4px 0 0"
                                : 0,
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                            fontSize:
                              "15px",
                            fontWeight:
                              700,
                            color:
                              "#171717",
                          }}
                        >
                          {
                            customer.displayName
                          }
                        </p>

                        <p
                          style={{
                            margin:
                              "5px 0 0",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                            fontSize:
                              "12px",
                            fontWeight:
                              500,
                            color:
                              "rgba(0,0,0,0.44)",
                          }}
                        >
                          {customer.displayPhone ||
                            "Telefone não informado"}
                        </p>

                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                            fontSize:
                              "12px",
                            color:
                              "rgba(0,0,0,0.48)",
                          }}
                        >
                          {customer.lastMessagePreview ||
                            "Sem mensagem recente"}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          customer.status
                        }
                      />
                    </button>
                  );
                },
              )
            )}
          </div>

          {filteredCustomers.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(240px, 1fr) auto minmax(160px, 1fr)",
                alignItems: "center",
                gap: "32px",
                borderTop:
                  "1px solid rgba(0,0,0,0.08)",
                padding: "18px 24px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color:
                    "rgba(0,0,0,0.54)",
                  whiteSpace: "nowrap",
                }}
              >
                Mostrando{" "}
                <strong
                  style={{
                    color:
                      "rgba(0,0,0,0.78)",
                  }}
                >
                  {(currentPage - 1) *
                    pageSize +
                    1}
                </strong>{" "}
                a{" "}
                <strong
                  style={{
                    color:
                      "rgba(0,0,0,0.78)",
                  }}
                >
                  {Math.min(
                    currentPage *
                      pageSize,
                    filteredCustomers.length,
                  )}
                </strong>{" "}
                de{" "}
                <strong
                  style={{
                    color:
                      "rgba(0,0,0,0.78)",
                  }}
                >
                  {filteredCustomers.length}
                </strong>{" "}
                contatos
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    currentPage === 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1,
                        ),
                    )
                  }
                  style={{
                    width: "34px",
                    height: "34px",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border:
                      "1px solid rgba(0,0,0,0.10)",
                    borderRadius:
                      "9px",
                    background:
                      "#ffffff",
                    color:
                      "rgba(0,0,0,0.58)",
                    opacity:
                      currentPage ===
                      1
                        ? 0.35
                        : 1,
                    cursor:
                      currentPage ===
                      1
                        ? "default"
                        : "pointer",
                  }}
                  aria-label="Página anterior"
                >
                  ‹
                </button>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, index) =>
                    index + 1,
                )
                  .slice(
                    Math.max(
                      0,
                      Math.min(
                        currentPage - 3,
                        totalPages - 5,
                      ),
                    ),
                    Math.max(
                      0,
                      Math.min(
                        currentPage - 3,
                        totalPages - 5,
                      ),
                    ) + 5,
                  )
                  .map((page) => {
                    const active =
                      currentPage ===
                      page;

                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          setCurrentPage(
                            page,
                          )
                        }
                        style={{
                          minWidth:
                            "34px",
                          height:
                            "34px",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          border: active
                            ? "1px solid #000000"
                            : "1px solid rgba(0,0,0,0.10)",
                          borderRadius:
                            "9px",
                          background:
                            active
                              ? "#000000"
                              : "#ffffff",
                          color: active
                            ? "#ffffff"
                            : "rgba(0,0,0,0.64)",
                          padding:
                            "0 10px",
                          fontSize:
                            "12px",
                          fontWeight:
                            active
                              ? 700
                              : 600,
                          cursor:
                            "pointer",
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}

                <button
                  type="button"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.min(
                          totalPages,
                          page + 1,
                        ),
                    )
                  }
                  style={{
                    width: "34px",
                    height: "34px",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border:
                      "1px solid rgba(0,0,0,0.10)",
                    borderRadius:
                      "9px",
                    background:
                      "#ffffff",
                    color:
                      "rgba(0,0,0,0.58)",
                    opacity:
                      currentPage ===
                      totalPages
                        ? 0.35
                        : 1,
                    cursor:
                      currentPage ===
                      totalPages
                        ? "default"
                        : "pointer",
                  }}
                  aria-label="Próxima página"
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  justifySelf: "end",
                  fontSize: "12px",
                  color:
                    "rgba(0,0,0,0.54)",
                  whiteSpace: "nowrap",
                }}
              >
                {pageSize} por página
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedCustomer && (
        <CustomerPanel
          isOpen={true}
          onClose={() => {
            setSelectedCustomerId(null);
            router.replace("/clientes");
          }}
          name={selectedCustomer.displayName}
          phone={
            selectedCustomer.displayPhone ||
            selectedCustomer.phone ||
            ""
          }
          remoteJid={selectedCustomer.remoteJid}
          profilePicUrl={selectedCustomer.profilePicUrl}
          lastInteraction={formatDate(
            selectedCustomer.attendances[0]?.startedAt ||
              selectedCustomer.lastMessageAt,
          )}
          messages={[]}
          conversationHref={`/?remoteJid=${encodeURIComponent(
            selectedCustomer.remoteJid,
          )}`}
          initialTab={requestedTab}
        />
      )}
    </div>
  );

}


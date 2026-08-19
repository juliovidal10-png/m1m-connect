"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SessionResponse = {
  authenticated: boolean;
  configured: boolean;
};

type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED";

type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  segment: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  subscriptionStatus:
    SubscriptionStatus;
  trialEndsAt:
    string | null;
  accessEndsAt:
    string | null;
  onboardingCompleted:
    boolean;
  aiEnabled:
    boolean;
  whatsappInstanceName:
    string | null;
  createdAt:
    string;
  usersCount:
    number;
  admin: {
    id: string;
    name: string;
    displayName:
      string | null;
    email: string;
    active: boolean;
  } | null;
};

type ReceivableDetail = {
  companyId: string;
  companyName: string;
  amountCents: number;
  accessEndsAt:
    string | null;
  subscriptionStatus:
    | "TRIAL"
    | "ACTIVE"
    | "SUSPENDED"
    | "EXPIRED";
};


type FinancialHistoryItem = {
  id: string;
  companyId: string;
  companyName: string;
  kind:
    | "CHARGE"
    | "PAYMENT";
  eventType:
    | "ACTIVATION"
    | "RENEWAL"
    | null;
  amountCents: number;
  date: string;
  accessEndsAt:
    string | null;
  paymentMethod:
    string | null;
  notes:
    string | null;
};


type CompanyDetail = {
  company: {
    id: string;
    name: string;
    slug: string;
    segment: string | null;
    presentation: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    active: boolean;
    subscriptionStatus:
      SubscriptionStatus;
    trialEndsAt:
      string | null;
    accessEndsAt:
      string | null;
    planName:
      string | null;
    subscriptionPriceCents:
      number | null;
    billingCycle:
      "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | null;
    subscriptionStartedAt:
      string | null;
    onboardingCompleted:
      boolean;
    aiEnabled:
      boolean;
    whatsappInstanceName:
      string | null;
    createdAt:
      string;
    updatedAt:
      string;
  };
  users: Array<{
    id: string;
    name: string;
    displayName:
      string | null;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    role: string;
    active: boolean;
  }>;
  sectorsCount: number;
  customersCount: number;
  attendancesCount: number;
  subscriptionEvents: Array<{
    id: string;
    type:
      | "ACTIVATION"
      | "RENEWAL";
    planName:
      string | null;
    amountCents:
      number | null;
    billingCycle:
      | "MONTHLY"
      | "QUARTERLY"
      | "SEMIANNUAL"
      | "ANNUAL"
      | null;
    previousAccessEndsAt:
      string | null;
    newAccessEndsAt:
      string | null;
    createdAt:
      string;
  }>;
  subscriptionPayments: Array<{
    id: string;
    amountCents: number;
    paidAt: string;
    paymentMethod:
      string | null;
    notes:
      string | null;
    createdAt:
      string;
  }>;
};

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.5-3.5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8" />
      <path d="m15 8 2 2" />
      <path d="m17 6 2 2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" />
      <path d="M17 9h2a1 1 0 0 1 1 1v11" />
      <path d="M8 7h5" />
      <path d="M8 11h5" />
      <path d="M8 15h5" />
      <path d="M3 21h18" />
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

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function getRemainingDays(
  value:
    | string
    | null,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const diff =
    date.getTime() -
    Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(
    diff /
      (24 * 60 * 60 * 1000),
  );
}

function isCompanyAttention(
  company: AdminCompany,
) {
  if (
    company.subscriptionStatus ===
      "SUSPENDED" ||
    company.subscriptionStatus ===
      "EXPIRED"
  ) {
    return true;
  }

  if (
    company.subscriptionStatus !==
      "ACTIVE" ||
    !company.accessEndsAt
  ) {
    return false;
  }

  const remainingDays =
    getRemainingDays(
      company.accessEndsAt,
    );

  return (
    remainingDays !== null &&
    remainingDays <= 7
  );
}

function getAccessWarningLabel(
  company: AdminCompany,
) {
  if (
    company.subscriptionStatus !==
      "ACTIVE" ||
    !company.accessEndsAt
  ) {
    return null;
  }

  const remainingDays =
    getRemainingDays(
      company.accessEndsAt,
    );

  if (
    remainingDays === null ||
    remainingDays > 7
  ) {
    return null;
  }

  if (remainingDays === 0) {
    return "Vence hoje";
  }

  if (remainingDays === 1) {
    return "Vence em 1 dia";
  }

  return `Vence em ${remainingDays} dias`;
}

function getStatusLabel(
  status:
    SubscriptionStatus,
) {
  switch (status) {
    case "TRIAL":
      return "Teste grátis";
    case "ACTIVE":
      return "Ativa";
    case "SUSPENDED":
      return "Suspensa";
    case "EXPIRED":
      return "Expirada";
  }
}

function getStatusClasses(
  status:
    SubscriptionStatus,
) {
  switch (status) {
    case "TRIAL":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "SUSPENDED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "EXPIRED":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export default function M1MAdminPage() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    configured,
    setConfigured,
  ] = useState(true);

  const [
    adminKey,
    setAdminKey,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    companies,
    setCompanies,
  ] = useState<
    AdminCompany[]
  >([]);

  const [
    companiesLoading,
    setCompaniesLoading,
  ] = useState(false);

  const [
    companiesError,
    setCompaniesError,
  ] = useState<
    string | null
  >(null);

  const [
    receivedThisMonthCents,
    setReceivedThisMonthCents,
  ] = useState(0);

  const [
    receivableCents,
    setReceivableCents,
  ] = useState(0);

  const [
    receivableDetails,
    setReceivableDetails,
  ] = useState<
    ReceivableDetail[]
  >([]);

  const [
    receivableModalOpen,
    setReceivableModalOpen,
  ] = useState(false);

  const [
    financialHistory,
    setFinancialHistory,
  ] = useState<
    FinancialHistoryItem[]
  >([]);

  const [
    financialHistoryModalOpen,
    setFinancialHistoryModalOpen,
  ] = useState(false);

  const [
    showCreateCompany,
    setShowCreateCompany,
  ] = useState(false);

  const [
    creatingCompany,
    setCreatingCompany,
  ] = useState(false);

  const [
    createCompanyError,
    setCreateCompanyError,
  ] = useState<
    string | null
  >(null);

  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [
    segment,
    setSegment,
  ] = useState("");

  const [
    companyEmail,
    setCompanyEmail,
  ] = useState("");

  const [
    companyPhone,
    setCompanyPhone,
  ] = useState("");

  const [
    companyCity,
    setCompanyCity,
  ] = useState("");

  const [
    companyState,
    setCompanyState,
  ] = useState("");

  const [
    adminName,
    setAdminName,
  ] = useState("");

  const [
    adminDisplayName,
    setAdminDisplayName,
  ] = useState("");

  const [
    adminEmail,
    setAdminEmail,
  ] = useState("");

  const [
    adminPhone,
    setAdminPhone,
  ] = useState("");

  const [
    adminPassword,
    setAdminPassword,
  ] = useState("");

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState<
    string | null
  >(null);

  const [
    companyDetail,
    setCompanyDetail,
  ] = useState<
    CompanyDetail | null
  >(null);

  const [
    companyDetailLoading,
    setCompanyDetailLoading,
  ] = useState(false);

  const [
    companyDetailError,
    setCompanyDetailError,
  ] = useState<
    string | null
  >(null);

  const [
    accessActionLoading,
    setAccessActionLoading,
  ] = useState(false);

  const [
    accessActionError,
    setAccessActionError,
  ] = useState<
    string | null
  >(null);

  const [
    subscriptionEditing,
    setSubscriptionEditing,
  ] = useState(false);

  const [
    subscriptionSaving,
    setSubscriptionSaving,
  ] = useState(false);

  const [
    subscriptionRenewing,
    setSubscriptionRenewing,
  ] = useState(false);

  const [
    subscriptionSuccess,
    setSubscriptionSuccess,
  ] = useState<string | null>(
    null,
  );

  const [
    companyEditing,
    setCompanyEditing,
  ] = useState(false);

  const [
    companySaving,
    setCompanySaving,
  ] = useState(false);

  const [
    companyEditError,
    setCompanyEditError,
  ] = useState<
    string | null
  >(null);

  const [
    companyDeleteOpen,
    setCompanyDeleteOpen,
  ] = useState(false);

  const [
    companyDeleteConfirmation,
    setCompanyDeleteConfirmation,
  ] = useState("");

  const [
    companyDeleting,
    setCompanyDeleting,
  ] = useState(false);

  const [
    companyDeleteError,
    setCompanyDeleteError,
  ] = useState<
    string | null
  >(null);

  const [
    adminUserEditing,
    setAdminUserEditing,
  ] = useState<
    string | null
  >(null);

  const [
    adminUserSaving,
    setAdminUserSaving,
  ] = useState(false);

  const [
    adminUserError,
    setAdminUserError,
  ] = useState<
    string | null
  >(null);

  const [
    adminEditName,
    setAdminEditName,
  ] = useState("");

  const [
    adminEditDisplayName,
    setAdminEditDisplayName,
  ] = useState("");

  const [
    adminEditEmail,
    setAdminEditEmail,
  ] = useState("");

  const [
    adminEditPhone,
    setAdminEditPhone,
  ] = useState("");

  const [
    adminEditJobTitle,
    setAdminEditJobTitle,
  ] = useState("");

  const [
    adminEditActive,
    setAdminEditActive,
  ] = useState(true);

  const [
    paymentFormOpen,
    setPaymentFormOpen,
  ] = useState(false);

  const [
    paymentSaving,
    setPaymentSaving,
  ] = useState(false);

  const [
    paymentError,
    setPaymentError,
  ] = useState<
    string | null
  >(null);

  const [
    paymentSuccess,
    setPaymentSuccess,
  ] = useState<
    string | null
  >(null);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("PIX");

  const [
    paymentNotes,
    setPaymentNotes,
  ] = useState("");

  const [
    editCompanyName,
    setEditCompanyName,
  ] = useState("");

  const [
    editCompanySegment,
    setEditCompanySegment,
  ] = useState("");

  const [
    editCompanyEmail,
    setEditCompanyEmail,
  ] = useState("");

  const [
    editCompanyPhone,
    setEditCompanyPhone,
  ] = useState("");

  const [
    editCompanyCity,
    setEditCompanyCity,
  ] = useState("");

  const [
    editCompanyState,
    setEditCompanyState,
  ] = useState("");

  const [
    subscriptionError,
    setSubscriptionError,
  ] = useState<
    string | null
  >(null);

  const [
    subscriptionPlanName,
    setSubscriptionPlanName,
  ] = useState("");

  const [
    subscriptionPrice,
    setSubscriptionPrice,
  ] = useState("");

  const [
    subscriptionBillingCycle,
    setSubscriptionBillingCycle,
  ] = useState<
    "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL"
  >("MONTHLY");

  const [
    subscriptionAccessEndsAt,
    setSubscriptionAccessEndsAt,
  ] = useState("");

  const loadCompanies =
    useCallback(
      async () => {
        setCompaniesLoading(
          true,
        );

        setCompaniesError(
          null,
        );

        try {
          const response =
            await fetch(
              "/api/admin/companies",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Não foi possível carregar as empresas.",
            );
          }

          setCompanies(
            Array.isArray(
              data?.companies,
            )
              ? data.companies
              : [],
          );

          setReceivedThisMonthCents(
            typeof data?.financialSummary
              ?.receivedThisMonthCents ===
            "number"
              ? data.financialSummary
                  .receivedThisMonthCents
              : 0,
          );

          setReceivableCents(
            typeof data?.financialSummary
              ?.receivableCents ===
            "number"
              ? data.financialSummary
                  .receivableCents
              : 0,
          );

          setReceivableDetails(
            Array.isArray(
              data?.financialSummary
                ?.receivableDetails,
            )
              ? data.financialSummary
                  .receivableDetails
              : [],
          );

          setFinancialHistory(
            Array.isArray(
              data?.financialSummary
                ?.financialHistory,
            )
              ? data.financialSummary
                  .financialHistory
              : [],
          );
        } catch (
          companiesLoadError
        ) {
          setCompaniesError(
            companiesLoadError instanceof Error
              ? companiesLoadError.message
              : "Não foi possível carregar as empresas.",
          );
        } finally {
          setCompaniesLoading(
            false,
          );
        }
      },
      [],
    );

  async function loadSession() {
    try {
      const response =
        await fetch(
          "/api/admin/session",
          {
            cache:
              "no-store",
          },
        );

      const data =
        (await response.json()) as SessionResponse;

      const isAuthenticated =
        Boolean(
          data.authenticated,
        );

      setAuthenticated(
        isAuthenticated,
      );

      setConfigured(
        Boolean(
          data.configured,
        ),
      );

      if (
        isAuthenticated
      ) {
        void loadCompanies();
      }
    } catch {
      setAuthenticated(
        false,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  async function handleLogin(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/admin/session",
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                adminKey,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível entrar no M1M Admin.",
        );
      }

      setAdminKey("");
      setAuthenticated(
        true,
      );

      void loadCompanies();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar no M1M Admin.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch(
      "/api/admin/session",
      {
        method:
          "DELETE",
      },
    );

    setCompanies([]);
    setReceivedThisMonthCents(
      0,
    );
    setReceivableCents(
      0,
    );
    setReceivableDetails(
      [],
    );
    setReceivableModalOpen(
      false,
    );
    setFinancialHistory(
      [],
    );
    setFinancialHistoryModalOpen(
      false,
    );
    setAuthenticated(
      false,
    );
  }

  function getSubscriptionStatusLabel(
    status:
      ReceivableDetail["subscriptionStatus"],
  ) {
    switch (status) {
      case "TRIAL":
        return "Teste";
      case "ACTIVE":
        return "Ativa";
      case "SUSPENDED":
        return "Suspensa";
      case "EXPIRED":
        return "Expirada";
      default:
        return status;
    }
  }

  function formatCurrencyFromCents(
    cents:
      | number
      | null,
  ) {
    if (
      cents === null ||
      cents === undefined
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      },
    ).format(
      cents / 100,
    );
  }

  function formatCurrencyInput(
    value: string,
  ) {
    const digits =
      value.replace(
        /\D/g,
        "",
      );

    if (!digits) {
      return "";
    }

    const cents =
      Number(digits);

    return new Intl.NumberFormat(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      cents / 100,
    );
  }

  function currencyInputToCents(
    value: string,
  ) {
    const digits =
      value.replace(
        /\D/g,
        "",
      );

    if (!digits) {
      return null;
    }

    const cents =
      Number(digits);

    if (
      !Number.isSafeInteger(
        cents,
      ) ||
      cents < 0
    ) {
      return null;
    }

    return cents;
  }

  function getBillingCycleLabel(
    cycle:
      | "MONTHLY"
      | "QUARTERLY"
      | "SEMIANNUAL"
      | "ANNUAL"
      | null,
  ) {
    switch (cycle) {
      case "MONTHLY":
        return "Mensal";
      case "QUARTERLY":
        return "Trimestral";
      case "SEMIANNUAL":
        return "Semestral";
      case "ANNUAL":
        return "Anual";
      default:
        return "—";
    }
  }

  function getTodayInputValue() {
    const now =
      new Date();

    const local =
      new Date(
        now.getTime() -
          now.getTimezoneOffset() *
            60000,
      );

    return local
      .toISOString()
      .slice(0, 10);
  }

  function parseCurrencyInputToCents(
    value: string,
  ) {
    const digits =
      value.replace(
        /\D/g,
        "",
      );

    if (!digits) {
      return 0;
    }

    return Number(
      digits,
    );
  }

  function getSubscriptionEventLabel(
    type:
      | "ACTIVATION"
      | "RENEWAL",
  ) {
    return type ===
      "ACTIVATION"
      ? "Ativação"
      : "Renovação";
  }

  function toDateInputValue(
    value:
      | string
      | null,
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        date.getDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addMonthsClamped(
    baseDate: Date,
    monthsToAdd: number,
  ) {
    const originalDay =
      baseDate.getDate();

    const target =
      new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() +
          monthsToAdd,
        1,
      );

    const lastDay =
      new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
      ).getDate();

    target.setDate(
      Math.min(
        originalDay,
        lastDay,
      ),
    );

    return target;
  }

  function calculateAccessEndDate(
    cycle:
      | "MONTHLY"
      | "QUARTERLY"
      | "SEMIANNUAL"
      | "ANNUAL",
  ) {
    const today =
      new Date();

    const months =
      cycle === "MONTHLY"
        ? 1
        : cycle === "QUARTERLY"
          ? 3
          : cycle === "SEMIANNUAL"
            ? 6
            : 12;

    return toDateInputValue(
      addMonthsClamped(
        today,
        months,
      ).toISOString(),
    );
  }

  function handleBillingCycleChange(
    cycle:
      | "MONTHLY"
      | "QUARTERLY"
      | "SEMIANNUAL"
      | "ANNUAL",
  ) {
    setSubscriptionBillingCycle(
      cycle,
    );

    setSubscriptionAccessEndsAt(
      calculateAccessEndDate(
        cycle,
      ),
    );
  }

  function startSubscriptionEdit() {
    if (!companyDetail) {
      return;
    }

    setSubscriptionError(
      null,
    );

    setSubscriptionPlanName(
      companyDetail.company.planName ||
        "",
    );

    setSubscriptionPrice(
      companyDetail.company.subscriptionPriceCents !==
        null
        ? formatCurrencyFromCents(
            companyDetail.company.subscriptionPriceCents,
          )
        : "",
    );

    setSubscriptionBillingCycle(
      companyDetail.company.billingCycle ||
        "MONTHLY",
    );

    const currentCycle =
      companyDetail.company.billingCycle ||
      "MONTHLY";

    setSubscriptionAccessEndsAt(
      companyDetail.company.accessEndsAt
        ? toDateInputValue(
            companyDetail.company.accessEndsAt,
          )
        : calculateAccessEndDate(
            currentCycle,
          ),
    );

    setSubscriptionEditing(
      true,
    );
  }

  async function handleRenewSubscription() {
    if (
      !selectedCompanyId ||
      !companyDetail
    ) {
      return;
    }

    if (
      !companyDetail.company.planName ||
      companyDetail.company.subscriptionPriceCents ===
        null ||
      !companyDetail.company.billingCycle
    ) {
      setSubscriptionError(
        "Configure a assinatura antes de renovar.",
      );
      return;
    }

    const currentEnd =
      companyDetail.company.accessEndsAt
        ? formatDate(
            companyDetail.company.accessEndsAt,
          )
        : "sem vencimento atual";

    const cycleLabel =
      getBillingCycleLabel(
        companyDetail.company.billingCycle,
      );

    if (
      !window.confirm(
        `Renovar a assinatura ${cycleLabel.toLowerCase()} desta empresa? Vencimento atual: ${currentEnd}.`,
      )
    ) {
      return;
    }

    setSubscriptionError(
      null,
    );
    setSubscriptionSuccess(
      null,
    );
    setSubscriptionRenewing(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}/subscription`,
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "RENEW",
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível renovar a assinatura.",
        );
      }

      const renewedUntil =
        data?.company?.accessEndsAt
          ? formatDate(
              data.company.accessEndsAt,
            )
          : null;

      await Promise.all([
        loadCompanies(),
        openCompanyDetail(
          selectedCompanyId,
        ),
      ]);

      setSubscriptionSuccess(
        renewedUntil
          ? `Assinatura renovada com sucesso. Novo vencimento: ${renewedUntil}.`
          : "Assinatura renovada com sucesso.",
      );
    } catch (
      renewError
    ) {
      setSubscriptionError(
        renewError instanceof Error
          ? renewError.message
          : "Não foi possível renovar a assinatura.",
      );
    } finally {
      setSubscriptionRenewing(
        false,
      );
    }
  }

  async function handleSaveSubscription(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedCompanyId) {
      return;
    }

    setSubscriptionError(
      null,
    );

    const priceCents =
      currencyInputToCents(
        subscriptionPrice,
      );

    if (
      !subscriptionPlanName.trim()
    ) {
      setSubscriptionError(
        "Informe o nome do plano.",
      );
      return;
    }

    if (
      priceCents === null
    ) {
      setSubscriptionError(
        "Informe um valor válido.",
      );
      return;
    }

    if (
      !subscriptionAccessEndsAt
    ) {
      setSubscriptionError(
        "Informe o vencimento do acesso.",
      );
      return;
    }

    setSubscriptionSaving(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}/subscription`,
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                planName:
                  subscriptionPlanName.trim(),
                subscriptionPriceCents:
                  priceCents,
                billingCycle:
                  subscriptionBillingCycle,
                accessEndsAt:
                  `${subscriptionAccessEndsAt}T23:59:59`,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível salvar a assinatura.",
        );
      }

      setSubscriptionEditing(
        false,
      );

      await Promise.all([
        loadCompanies(),
        openCompanyDetail(
          selectedCompanyId,
        ),
      ]);
    } catch (
      saveError
    ) {
      setSubscriptionError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar a assinatura.",
      );
    } finally {
      setSubscriptionSaving(
        false,
      );
    }
  }

  async function openCompanyDetail(
    companyId: string,
  ) {
    setSelectedCompanyId(
      companyId,
    );
    setCompanyDetail(null);
    setCompanyDetailError(
      null,
    );
    setSubscriptionSuccess(
      null,
    );
    setSubscriptionError(
      null,
    );
    setCompanyEditError(
      null,
    );
    setCompanyDetailLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${companyId}`,
          {
            cache:
              "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível carregar os detalhes da empresa.",
        );
      }

      setCompanyDetail(
        data as CompanyDetail,
      );
    } catch (
      detailError
    ) {
      setCompanyDetailError(
        detailError instanceof Error
          ? detailError.message
          : "Não foi possível carregar os detalhes da empresa.",
      );
    } finally {
      setCompanyDetailLoading(
        false,
      );
    }
  }

  function startCompanyEdit() {
    if (!companyDetail) {
      return;
    }

    setCompanyEditError(
      null,
    );

    setEditCompanyName(
      companyDetail.company.name ||
        "",
    );

    setEditCompanySegment(
      companyDetail.company.segment ||
        "",
    );

    setEditCompanyEmail(
      companyDetail.company.email ||
        "",
    );

    setEditCompanyPhone(
      companyDetail.company.phone ||
        "",
    );

    setEditCompanyCity(
      companyDetail.company.city ||
        "",
    );

    setEditCompanyState(
      companyDetail.company.state ||
        "",
    );

    setCompanyEditing(
      true,
    );
  }

  async function handleSaveCompany(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedCompanyId
    ) {
      return;
    }

    if (
      !editCompanyName.trim()
    ) {
      setCompanyEditError(
        "Informe o nome da empresa.",
      );
      return;
    }

    setCompanyEditError(
      null,
    );
    setCompanySaving(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}`,
          {
            method:
              "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  editCompanyName.trim(),
                segment:
                  editCompanySegment.trim() ||
                  null,
                email:
                  editCompanyEmail.trim() ||
                  null,
                phone:
                  editCompanyPhone.trim() ||
                  null,
                city:
                  editCompanyCity.trim() ||
                  null,
                state:
                  editCompanyState.trim() ||
                  null,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível salvar os dados da empresa.",
        );
      }

      setCompanyEditing(
        false,
      );

      await Promise.all([
        loadCompanies(),
        openCompanyDetail(
          selectedCompanyId,
        ),
      ]);
    } catch (
      saveError
    ) {
      setCompanyEditError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os dados da empresa.",
      );
    } finally {
      setCompanySaving(
        false,
      );
    }
  }

  function startPaymentForm() {
    if (!companyDetail) {
      return;
    }

    setPaymentError(
      null,
    );
    setPaymentSuccess(
      null,
    );

    const currentAmount =
      companyDetail.company
        .subscriptionPriceCents;

    setPaymentAmount(
      currentAmount
        ? (
            currentAmount /
            100
          ).toLocaleString(
            "pt-BR",
            {
              minimumFractionDigits:
                2,
              maximumFractionDigits:
                2,
            },
          )
        : "",
    );

    setPaymentDate(
      getTodayInputValue(),
    );

    setPaymentMethod(
      "PIX",
    );

    setPaymentNotes(
      "",
    );

    setPaymentFormOpen(
      true,
    );
  }

  async function handleSavePayment(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedCompanyId
    ) {
      return;
    }

    const amountCents =
      parseCurrencyInputToCents(
        paymentAmount,
      );

    if (
      amountCents <= 0
    ) {
      setPaymentError(
        "Informe um valor de pagamento válido.",
      );
      return;
    }

    if (!paymentDate) {
      setPaymentError(
        "Informe a data do pagamento.",
      );
      return;
    }

    setPaymentError(
      null,
    );
    setPaymentSaving(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}/subscription-payments`,
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                amountCents,
                paidAt:
                  `${paymentDate}T12:00:00`,
                paymentMethod:
                  paymentMethod ||
                  null,
                notes:
                  paymentNotes.trim() ||
                  null,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível registrar o pagamento.",
        );
      }

      await Promise.all([
        openCompanyDetail(
          selectedCompanyId,
        ),
        loadCompanies(),
      ]);

      setPaymentFormOpen(
        false,
      );

      setPaymentSuccess(
        "Pagamento registrado com sucesso.",
      );
    } catch (
      saveError
    ) {
      setPaymentError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setPaymentSaving(
        false,
      );
    }
  }

  function startAdminUserEdit(
    user:
      CompanyDetail["users"][number],
  ) {
    setAdminUserError(
      null,
    );

    setAdminUserEditing(
      user.id,
    );

    setAdminEditName(
      user.name || "",
    );

    setAdminEditDisplayName(
      user.displayName || "",
    );

    setAdminEditEmail(
      user.email || "",
    );

    setAdminEditPhone(
      user.phone || "",
    );

    setAdminEditJobTitle(
      user.jobTitle || "",
    );

    setAdminEditActive(
      user.active,
    );
  }

  async function handleSaveAdminUser(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedCompanyId ||
      !adminUserEditing
    ) {
      return;
    }

    if (
      !adminEditName.trim()
    ) {
      setAdminUserError(
        "Informe o nome do administrador.",
      );
      return;
    }

    if (
      !adminEditEmail.trim()
    ) {
      setAdminUserError(
        "Informe o e-mail do administrador.",
      );
      return;
    }

    setAdminUserError(
      null,
    );
    setAdminUserSaving(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}/users/${adminUserEditing}`,
          {
            method:
              "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  adminEditName.trim(),
                displayName:
                  adminEditDisplayName.trim() ||
                  null,
                email:
                  adminEditEmail.trim(),
                phone:
                  adminEditPhone.trim() ||
                  null,
                jobTitle:
                  adminEditJobTitle.trim() ||
                  null,
                active:
                  adminEditActive,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível atualizar o administrador.",
        );
      }

      setAdminUserEditing(
        null,
      );

      await openCompanyDetail(
        selectedCompanyId,
      );
    } catch (
      saveError
    ) {
      setAdminUserError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível atualizar o administrador.",
      );
    } finally {
      setAdminUserSaving(
        false,
      );
    }
  }

  async function handleDeleteCompany() {
    if (
      !selectedCompanyId ||
      !companyDetail
    ) {
      return;
    }

    if (
      companyDeleteConfirmation !==
      companyDetail.company.name
    ) {
      setCompanyDeleteError(
        "Digite exatamente o nome da empresa para confirmar.",
      );
      return;
    }

    setCompanyDeleteError(
      null,
    );
    setCompanyDeleting(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}`,
          {
            method:
              "DELETE",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                confirmationName:
                  companyDeleteConfirmation,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível excluir a empresa.",
        );
      }

      closeCompanyDetail();

      setCompanyDeleteOpen(
        false,
      );
      setCompanyDeleteConfirmation(
        "",
      );

      await loadCompanies();
    } catch (
      deleteError
    ) {
      setCompanyDeleteError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir a empresa.",
      );
    } finally {
      setCompanyDeleting(
        false,
      );
    }
  }

  async function handleAccessAction(
    action:
      | "ACTIVATE"
      | "SUSPEND"
      | "EXTEND_TRIAL_7_DAYS"
      | "REDUCE_TRIAL_1_DAY"
      | "RESET_TRIAL_7_DAYS",
  ) {
    if (!selectedCompanyId) {
      return;
    }

    const confirmationText =
      action === "ACTIVATE"
        ? "Ativar esta empresa agora?"
        : action === "SUSPEND"
          ? "Suspender esta empresa agora? O WhatsApp será desconectado."
          : action === "REDUCE_TRIAL_1_DAY"
            ? "Reduzir o período de teste desta empresa em 1 dia?"
            : action === "RESET_TRIAL_7_DAYS"
              ? "Definir o período de teste para exatamente 7 dias a partir de agora?"
              : "Prorrogar o teste gratuito desta empresa por mais 7 dias?";

    if (
      !window.confirm(
        confirmationText,
      )
    ) {
      return;
    }

    setAccessActionError(
      null,
    );
    setAccessActionLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `/api/admin/companies/${selectedCompanyId}/access`,
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível alterar o acesso da empresa.",
        );
      }

      await Promise.all([
        loadCompanies(),
        openCompanyDetail(
          selectedCompanyId,
        ),
      ]);
    } catch (
      accessError
    ) {
      setAccessActionError(
        accessError instanceof Error
          ? accessError.message
          : "Não foi possível alterar o acesso da empresa.",
      );
    } finally {
      setAccessActionLoading(
        false,
      );
    }
  }

  function closeCompanyDetail() {
    setSelectedCompanyId(
      null,
    );
    setCompanyDetail(null);
    setCompanyDetailError(
      null,
    );
    setAccessActionError(
      null,
    );
    setSubscriptionEditing(
      false,
    );
    setSubscriptionError(
      null,
    );
    setSubscriptionSuccess(
      null,
    );
    setCompanyEditing(
      false,
    );
    setCompanyEditError(
      null,
    );
    setCompanyDeleteOpen(
      false,
    );
    setCompanyDeleteConfirmation(
      "",
    );
    setCompanyDeleteError(
      null,
    );
    setAdminUserEditing(
      null,
    );
    setAdminUserError(
      null,
    );
    setPaymentFormOpen(
      false,
    );
    setPaymentError(
      null,
    );
    setPaymentSuccess(
      null,
    );
  }

  function resetCreateCompanyForm() {
    setCompanyName("");
    setSegment("");
    setCompanyEmail("");
    setCompanyPhone("");
    setCompanyCity("");
    setCompanyState("");
    setAdminName("");
    setAdminDisplayName("");
    setAdminEmail("");
    setAdminPhone("");
    setAdminPassword("");
    setCreateCompanyError(null);
  }

  function closeCreateCompany() {
    if (creatingCompany) {
      return;
    }

    resetCreateCompanyForm();
    setShowCreateCompany(false);
  }

  async function handleCreateCompany(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setCreateCompanyError(
      null,
    );

    if (
      !companyName.trim() ||
      !adminName.trim() ||
      !adminEmail.trim() ||
      !adminPassword.trim()
    ) {
      setCreateCompanyError(
        "Preencha os campos obrigatórios.",
      );
      return;
    }

    if (
      adminPassword.length <
      8
    ) {
      setCreateCompanyError(
        "A senha inicial deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    setCreatingCompany(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/admin/companies",
          {
            method:
              "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                companyName:
                  companyName.trim(),
                segment:
                  segment.trim() ||
                  undefined,
                companyEmail:
                  companyEmail.trim() ||
                  undefined,
                companyPhone:
                  companyPhone.trim() ||
                  undefined,
                companyCity:
                  companyCity.trim() ||
                  undefined,
                companyState:
                  companyState.trim() ||
                  undefined,
                adminName:
                  adminName.trim(),
                adminDisplayName:
                  adminDisplayName.trim() ||
                  undefined,
                adminEmail:
                  adminEmail.trim(),
                adminPhone:
                  adminPhone.trim() ||
                  undefined,
                adminPassword,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível criar a empresa.",
        );
      }

      resetCreateCompanyForm();
      setShowCreateCompany(
        false,
      );

      await loadCompanies();
    } catch (
      createError
    ) {
      setCreateCompanyError(
        createError instanceof Error
          ? createError.message
          : "Não foi possível criar a empresa.",
      );
    } finally {
      setCreatingCompany(
        false,
      );
    }
  }

  const counters =
    useMemo(
      () => ({
        total:
          companies.length,
        trial:
          companies.filter(
            (company) =>
              company.subscriptionStatus ===
              "TRIAL",
          ).length,
        active:
          companies.filter(
            (company) =>
              company.subscriptionStatus ===
              "ACTIVE",
          ).length,
        attention:
          companies.filter(
            (
              company,
            ) =>
              isCompanyAttention(
                company,
              ),
          ).length,
      }),
      [companies],
    );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f6f7] px-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#0A9090]" />

          <p className="mt-4 text-sm text-black/45">
            Verificando acesso administrativo...
          </p>
        </div>
      </main>
    );
  }

  if (authenticated) {
    return (
      <main className="h-full overflow-y-auto bg-[#f6f6f7] px-6 py-8 text-[#171717]">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-5 rounded-3xl border border-black/5 bg-white p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A9090] text-white">
                <ShieldIcon />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                  Área interna
                </p>

                <h1 className="mt-1 text-2xl font-bold">
                  M1M Admin
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  Gestão administrativa do M1M Connect.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void handleLogout()
              }
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
            >
              Sair do M1M Admin
            </button>
          </header>

          <section className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                  Gestão comercial
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Empresas
                </h2>

                <p className="mt-2 text-sm text-black/45">
                  Acompanhe os clientes cadastrados no M1M Connect.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateCompany(
                      true,
                    )
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#171717] px-4 text-xs font-bold text-white transition hover:bg-black"
                >
                  + Nova empresa
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void loadCompanies()
                  }
                  disabled={
                    companiesLoading
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshIcon />
                  <span>
                    Atualizar
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                  Empresas
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {counters.total}
                </p>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-500">
                  Em teste
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {counters.trial}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                  Ativas
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {counters.active}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  Atenção
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {counters.attention}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Resumo financeiro
              </p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() =>
                    setFinancialHistoryModalOpen(
                      true,
                    )
                  }
                  className="m1m-no-global-hover m1m-finance-received-hover rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                        Recebido no mês
                      </p>

                      <p className="mt-2 text-3xl font-bold text-[#171717]">
                        {formatCurrencyFromCents(
                          receivedThisMonthCents,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        Pagamentos efetivamente recebidos.
                      </p>
                    </div>

                    <span className="mt-1 text-xs font-bold text-emerald-600">
                      Ver histórico
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReceivableModalOpen(
                      true,
                    )
                  }
                  className="m1m-no-global-hover m1m-finance-receivable-hover rounded-2xl border border-amber-100 bg-white p-5 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600">
                        A receber
                      </p>

                      <p className="mt-2 text-3xl font-bold text-[#171717]">
                        {formatCurrencyFromCents(
                          receivableCents,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        Saldo pendente das assinaturas.
                      </p>
                    </div>

                    <span className="mt-1 text-xs font-bold text-amber-600">
                      Ver detalhes
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-black/5 px-6 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF9F9] text-[#0A9090]">
                  <BuildingIcon />
                </div>

                <div>
                  <h3 className="text-sm font-bold">
                    Empresas cadastradas
                  </h3>
                  <p className="mt-0.5 text-xs text-black/40">
                    Visão geral das contas da plataforma.
                  </p>
                </div>
              </div>

              {companiesLoading ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-[#0A9090]" />
                  <p className="mt-3 text-sm text-black/40">
                    Carregando empresas...
                  </p>
                </div>
              ) : companiesError ? (
                <div className="px-6 py-10">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {companiesError}
                  </div>
                </div>
              ) : companies.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-bold">
                    Nenhuma empresa cadastrada
                  </p>
                  <p className="mt-1 text-sm text-black/40">
                    As empresas aparecerão aqui quando forem cadastradas.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {companies.map(
                    (
                      company,
                    ) => {
                      const remainingDays =
                        company.subscriptionStatus ===
                        "TRIAL"
                          ? getRemainingDays(
                              company.trialEndsAt,
                            )
                          : null;

                      const accessWarning =
                        getAccessWarningLabel(
                          company,
                        );

                      return (
                        <article
                          key={
                            company.id
                          }
                          className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(170px,0.7fr)_minmax(220px,0.95fr)_auto] lg:items-center"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold">
                                {
                                  company.name
                                }
                              </h4>

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                    company.subscriptionStatus,
                                  )}`}
                                >
                                  {getStatusLabel(
                                    company.subscriptionStatus,
                                  )}
                                </span>

                                {accessWarning && (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                    {
                                      accessWarning
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="mt-1 text-xs text-black/40">
                              {company.segment ||
                                "Segmento não informado"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/50">
                              <span>
                                Criada em{" "}
                                {formatDate(
                                  company.createdAt,
                                )}
                              </span>

                              <span>
                                {
                                  company.usersCount
                                }{" "}
                                {company.usersCount ===
                                1
                                  ? "usuário"
                                  : "usuários"}
                              </span>

                              <span>
                                {company.onboardingCompleted
                                  ? "Onboarding concluído"
                                  : "Onboarding pendente"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                              Acesso
                            </p>

                            {company.subscriptionStatus ===
                              "TRIAL" &&
                            remainingDays !==
                              null ? (
                              <>
                                <p className="mt-1 text-sm font-bold">
                                  {remainingDays ===
                                  1
                                    ? "1 dia restante"
                                    : `${remainingDays} dias restantes`}
                                </p>
                                <p className="mt-1 text-xs text-black/40">
                                  Até{" "}
                                  {formatDate(
                                    company.trialEndsAt,
                                  )}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="mt-1 text-sm font-bold">
                                  {getStatusLabel(
                                    company.subscriptionStatus,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-black/40">
                                  {company.accessEndsAt
                                    ? `Até ${formatDate(
                                        company.accessEndsAt,
                                      )}`
                                    : "Sem data final definida"}
                                </p>
                              </>
                            )}
                          </div>

                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                              Administrador
                            </p>

                            <p className="mt-1 text-sm font-bold">
                              {company.admin?.displayName ||
                                company.admin?.name ||
                                "Não definido"}
                            </p>

                            <p className="mt-1 truncate text-xs text-black/40">
                              {company.admin?.email ||
                                "Sem e-mail"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                                  company.whatsappInstanceName
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-black/10 bg-black/[0.02] text-black/40"
                                }`}
                              >
                                {company.whatsappInstanceName
                                  ? "WhatsApp configurado"
                                  : "WhatsApp pendente"}
                              </span>

                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                                  company.aiEnabled
                                    ? "border-teal-200 bg-teal-50 text-teal-700"
                                    : "border-black/10 bg-black/[0.02] text-black/40"
                                }`}
                              >
                                {company.aiEnabled
                                  ? "IA ativa"
                                  : "IA desligada"}
                              </span>
                            </div>
                          </div>

                          <div className="lg:text-right">
                            <button
                              type="button"
                              onClick={() =>
                                void openCompanyDetail(
                                  company.id,
                                )
                              }
                              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
                            >
                              Abrir
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

        {selectedCompanyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-black/5 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                    Gestão da empresa
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {companyDetail?.company.name ||
                      "Carregando empresa..."}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/45">
                    Visão administrativa da conta. Nenhum dado pode ser alterado nesta etapa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCompanyDetail
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg text-black/40 transition hover:border-black/20 hover:text-black/70"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              {companyDetailLoading ? (
                <div className="py-14 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#0A9090]" />
                  <p className="mt-4 text-sm text-black/40">
                    Carregando detalhes...
                  </p>
                </div>
              ) : companyDetailError ? (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {companyDetailError}
                </div>
              ) : companyDetail ? (
                <div className="mt-7 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-black/5 bg-[#fafafa] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                        Status
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                          companyDetail.company.subscriptionStatus,
                        )}`}
                      >
                        {getStatusLabel(
                          companyDetail.company.subscriptionStatus,
                        )}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-[#fafafa] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                        Onboarding
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {companyDetail.company.onboardingCompleted
                          ? "Concluído"
                          : "Pendente"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-[#fafafa] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                        WhatsApp
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {companyDetail.company.whatsappInstanceName
                          ? "Configurado"
                          : "Pendente"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-[#fafafa] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/30">
                        IA
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {companyDetail.company.aiEnabled
                          ? "Ativa"
                          : "Desligada"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-black/5 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                            Dados da empresa
                          </p>

                          <p className="mt-1 text-xs text-black/40">
                            Informações principais da conta.
                          </p>
                        </div>

                        {!companyEditing && (
                          <button
                            type="button"
                            onClick={
                              startCompanyEdit
                            }
                            className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
                          >
                            Editar dados
                          </button>
                        )}
                      </div>

                      {companyEditing ? (
                        <form
                          onSubmit={
                            handleSaveCompany
                          }
                          className="mt-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                Nome da empresa
                              </label>
                              <input
                                value={
                                  editCompanyName
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditCompanyName(
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                Segmento
                              </label>
                              <input
                                value={
                                  editCompanySegment
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditCompanySegment(
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                E-mail
                              </label>
                              <input
                                type="email"
                                value={
                                  editCompanyEmail
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditCompanyEmail(
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                Telefone
                              </label>
                              <input
                                value={
                                  editCompanyPhone
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditCompanyPhone(
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                              />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px]">
                              <div>
                                <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                  Cidade
                                </label>
                                <input
                                  value={
                                    editCompanyCity
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditCompanyCity(
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                  UF
                                </label>
                                <select
                                  value={
                                    editCompanyState
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditCompanyState(
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-2 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                >
                                  <option value="">
                                    —
                                  </option>
                                  {[
                                    "AC",
                                    "AL",
                                    "AP",
                                    "AM",
                                    "BA",
                                    "CE",
                                    "DF",
                                    "ES",
                                    "GO",
                                    "MA",
                                    "MT",
                                    "MS",
                                    "MG",
                                    "PA",
                                    "PB",
                                    "PR",
                                    "PE",
                                    "PI",
                                    "RJ",
                                    "RN",
                                    "RS",
                                    "RO",
                                    "RR",
                                    "SC",
                                    "SP",
                                    "SE",
                                    "TO",
                                  ].map(
                                    (
                                      state,
                                    ) => (
                                      <option
                                        key={
                                          state
                                        }
                                        value={
                                          state
                                        }
                                      >
                                        {
                                          state
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                            </div>
                          </div>

                          {companyEditError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              {
                                companyEditError
                              }
                            </div>
                          )}

                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={
                                companySaving
                              }
                              onClick={() => {
                                setCompanyEditing(
                                  false,
                                );
                                setCompanyEditError(
                                  null,
                                );
                              }}
                              className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 disabled:opacity-50"
                            >
                              Cancelar
                            </button>

                            <button
                              type="submit"
                              disabled={
                                companySaving
                              }
                              className="h-9 rounded-xl bg-[#0A9090] px-4 text-xs font-bold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {companySaving
                                ? "Salvando..."
                                : "Salvar dados"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Segmento
                            </dt>
                            <dd className="mt-1 text-sm font-medium">
                              {companyDetail.company.segment ||
                                "Não informado"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              E-mail
                            </dt>
                            <dd className="mt-1 break-all text-sm font-medium">
                              {companyDetail.company.email ||
                                "Não informado"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Telefone
                            </dt>
                            <dd className="mt-1 text-sm font-medium">
                              {companyDetail.company.phone ||
                                "Não informado"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Cidade / UF
                            </dt>
                            <dd className="mt-1 text-sm font-medium">
                              {companyDetail.company.city ||
                              companyDetail.company.state
                                ? `${companyDetail.company.city || "—"} / ${companyDetail.company.state || "—"}`
                                : "Não informado"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Criada em
                            </dt>
                            <dd className="mt-1 text-sm font-medium">
                              {formatDate(
                                companyDetail.company.createdAt,
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Identificador
                            </dt>
                            <dd className="mt-1 break-all text-sm font-medium">
                              {companyDetail.company.slug}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </section>

                    <section className="rounded-2xl border border-black/5 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                        Acesso e operação
                      </p>

                      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Situação do acesso
                          </dt>

                          {companyDetail.company.subscriptionStatus ===
                          "TRIAL" ? (
                            <>
                              <dd className="mt-1 text-sm font-bold">
                                Teste gratuito
                              </dd>
                              <dd className="mt-1 text-xs text-black/40">
                                Termina em{" "}
                                {formatDate(
                                  companyDetail.company.trialEndsAt,
                                )}
                              </dd>
                            </>
                          ) : companyDetail.company.subscriptionStatus ===
                            "ACTIVE" ? (
                            <>
                              <dd className="mt-1 text-sm font-bold text-emerald-700">
                                Acesso ativo
                              </dd>
                              <dd className="mt-1 text-xs text-black/40">
                                {companyDetail.company.accessEndsAt
                                  ? `Válido até ${formatDate(
                                      companyDetail.company.accessEndsAt,
                                    )}`
                                  : "Sem data final definida"}
                              </dd>
                            </>
                          ) : companyDetail.company.subscriptionStatus ===
                            "SUSPENDED" ? (
                            <>
                              <dd className="mt-1 text-sm font-bold text-amber-700">
                                Acesso suspenso
                              </dd>
                              <dd className="mt-1 text-xs text-black/40">
                                Liberação manual pela M1M
                              </dd>
                            </>
                          ) : (
                            <>
                              <dd className="mt-1 text-sm font-bold text-red-700">
                                Acesso expirado
                              </dd>
                              <dd className="mt-1 text-xs text-black/40">
                                {companyDetail.company.accessEndsAt
                                  ? `Expirou em ${formatDate(
                                      companyDetail.company.accessEndsAt,
                                    )}`
                                  : companyDetail.company.trialEndsAt
                                    ? `Teste encerrou em ${formatDate(
                                        companyDetail.company.trialEndsAt,
                                      )}`
                                    : "Prazo encerrado"}
                              </dd>
                            </>
                          )}
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Histórico do trial
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {companyDetail.company.trialEndsAt
                              ? formatDate(
                                  companyDetail.company.trialEndsAt,
                                )
                              : "—"}
                          </dd>
                          <dd className="mt-1 text-xs text-black/35">
                            {companyDetail.company.trialEndsAt
                              ? "Data preservada para histórico"
                              : "Sem trial registrado"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Usuários
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {companyDetail.users.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Setores
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {companyDetail.sectorsCount}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Clientes
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {companyDetail.customersCount}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Atendimentos
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {companyDetail.attendancesCount}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>

                  <section className="rounded-2xl border border-black/5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                          Plano / Assinatura
                        </p>

                        <p className="mt-1 text-sm text-black/45">
                          Dados comerciais do contrato da empresa com a M1M.
                        </p>
                      </div>

                      {!subscriptionEditing && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={
                              startPaymentForm
                            }
                            className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Registrar pagamento
                          </button>

                          {companyDetail.company.planName &&
                            companyDetail.company.billingCycle &&
                            companyDetail.company.subscriptionPriceCents !==
                              null && (
                              <button
                                type="button"
                                disabled={
                                  subscriptionRenewing
                                }
                                onClick={() =>
                                  void handleRenewSubscription()
                                }
                                className="h-10 rounded-xl bg-[#171717] px-4 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {subscriptionRenewing
                                  ? "Renovando..."
                                  : "Renovar assinatura"}
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={
                              startSubscriptionEdit
                            }
                            disabled={
                              subscriptionRenewing
                            }
                            className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {companyDetail.company.planName
                              ? "Editar assinatura"
                              : "Configurar assinatura"}
                          </button>
                        </div>
                      )}
                    </div>

                    {subscriptionSuccess &&
                      !subscriptionEditing && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                          {
                            subscriptionSuccess
                          }
                        </div>
                      )}

                    {subscriptionError &&
                      !subscriptionEditing && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {
                            subscriptionError
                          }
                        </div>
                      )}

                    {subscriptionEditing ? (
                      <form
                        onSubmit={
                          handleSaveSubscription
                        }
                        className="mt-5"
                      >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Plano
                            </label>
                            <input
                              value={
                                subscriptionPlanName
                              }
                              onChange={(
                                event,
                              ) =>
                                setSubscriptionPlanName(
                                  event.target.value,
                                )
                              }
                              placeholder="Ex.: Essencial"
                              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Valor
                            </label>

                            <input
                              value={
                                subscriptionPrice
                              }
                              onChange={(
                                event,
                              ) =>
                                setSubscriptionPrice(
                                  formatCurrencyInput(
                                    event.target.value,
                                  ),
                                )
                              }
                              placeholder="R$ 0,00"
                              inputMode="numeric"
                              autoComplete="off"
                              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-medium outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Periodicidade
                            </label>
                            <select
                              value={
                                subscriptionBillingCycle
                              }
                              onChange={(
                                event,
                              ) =>
                                handleBillingCycleChange(
                                  event.target.value as
                                    | "MONTHLY"
                                    | "QUARTERLY"
                                    | "SEMIANNUAL"
                                    | "ANNUAL",
                                )
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                            >
                              <option value="MONTHLY">
                                Mensal
                              </option>
                              <option value="QUARTERLY">
                                Trimestral
                              </option>
                              <option value="SEMIANNUAL">
                                Semestral
                              </option>
                              <option value="ANNUAL">
                                Anual
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Vencimento do acesso
                            </label>
                            <input
                              type="date"
                              value={
                                subscriptionAccessEndsAt
                              }
                              onChange={(
                                event,
                              ) =>
                                setSubscriptionAccessEndsAt(
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                            />

                            <p className="mt-1.5 text-[11px] leading-4 text-black/35">
                              Calculado automaticamente pela periodicidade. Você pode ajustar a data manualmente.
                            </p>
                          </div>
                        </div>

                        {subscriptionError && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {
                              subscriptionError
                            }
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={
                              subscriptionSaving
                            }
                            onClick={() => {
                              setSubscriptionEditing(
                                false,
                              );
                              setSubscriptionError(
                                null,
                              );
                            }}
                            className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-black/20 disabled:opacity-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={
                              subscriptionSaving
                            }
                            className="h-10 rounded-xl bg-[#0A9090] px-5 text-xs font-bold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {subscriptionSaving
                              ? "Salvando..."
                              : "Salvar e ativar assinatura"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Plano
                          </dt>
                          <dd className="mt-1 text-sm font-bold">
                            {companyDetail.company.planName ||
                              "Não configurado"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Valor
                          </dt>
                          <dd className="mt-1 text-sm font-bold">
                            {formatCurrencyFromCents(
                              companyDetail.company.subscriptionPriceCents,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Periodicidade
                          </dt>
                          <dd className="mt-1 text-sm font-bold">
                            {getBillingCycleLabel(
                              companyDetail.company.billingCycle,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                            Início
                          </dt>
                          <dd className="mt-1 text-sm font-bold">
                            {formatDate(
                              companyDetail.company.subscriptionStartedAt,
                            )}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </section>

                  {paymentSuccess && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {
                        paymentSuccess
                      }
                    </div>
                  )}

                  {paymentFormOpen && (
                    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Registrar pagamento
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        Registre somente quando o pagamento da assinatura tiver sido recebido pela M1M.
                      </p>

                      <form
                        onSubmit={
                          handleSavePayment
                        }
                        className="mt-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Valor recebido
                            </label>

                            <div className="mt-2 flex h-10 overflow-hidden rounded-xl border border-black/10 bg-white">
                              <span className="flex items-center border-r border-black/5 bg-[#fafafa] px-3 text-sm font-bold text-black/45">
                                R$
                              </span>

                              <input
                                value={
                                  paymentAmount
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setPaymentAmount(
                                    event.target.value,
                                  )
                                }
                                inputMode="decimal"
                                className="min-w-0 flex-1 px-3 text-sm outline-none"
                                placeholder="200,00"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Data do pagamento
                            </label>

                            <input
                              type="date"
                              value={
                                paymentDate
                              }
                              onChange={(
                                event,
                              ) =>
                                setPaymentDate(
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Forma de pagamento
                            </label>

                            <select
                              value={
                                paymentMethod
                              }
                              onChange={(
                                event,
                              ) =>
                                setPaymentMethod(
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            >
                              <option value="PIX">PIX</option>
                              <option value="BOLETO">Boleto</option>
                              <option value="TRANSFERENCIA">Transferência</option>
                              <option value="DINHEIRO">Dinheiro</option>
                              <option value="CARTAO">Cartão</option>
                              <option value="OUTRO">Outro</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                              Observação
                            </label>

                            <input
                              value={
                                paymentNotes
                              }
                              onChange={(
                                event,
                              ) =>
                                setPaymentNotes(
                                  event.target.value,
                                )
                              }
                              className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                              placeholder="Opcional"
                            />
                          </div>
                        </div>

                        {paymentError && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {
                              paymentError
                            }
                          </div>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={
                              paymentSaving
                            }
                            onClick={() => {
                              setPaymentFormOpen(
                                false,
                              );
                              setPaymentError(
                                null,
                              );
                            }}
                            className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 disabled:opacity-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={
                              paymentSaving
                            }
                            className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {paymentSaving
                              ? "Registrando..."
                              : "Registrar pagamento"}
                          </button>
                        </div>
                      </form>
                    </section>
                  )}

                  <section className="overflow-hidden rounded-2xl border border-black/5">
                    <div className="border-b border-black/5 px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                        Pagamentos da assinatura
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        Valores efetivamente recebidos pela M1M.
                      </p>
                    </div>

                    {companyDetail.subscriptionPayments.length ===
                    0 ? (
                      <div className="px-5 py-6 text-sm text-black/40">
                        Nenhum pagamento registrado ainda.
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {companyDetail.subscriptionPayments.map(
                          (
                            payment,
                          ) => (
                            <div
                              key={
                                payment.id
                              }
                              className="grid gap-3 px-5 py-4 md:grid-cols-[140px_160px_150px_minmax(0,1fr)] md:items-center"
                            >
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Pago em
                                </p>
                                <p className="mt-1 text-sm font-bold">
                                  {formatDate(
                                    payment.paidAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Valor
                                </p>
                                <p className="mt-1 text-sm font-bold text-emerald-700">
                                  {formatCurrencyFromCents(
                                    payment.amountCents,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Forma
                                </p>
                                <p className="mt-1 text-sm font-medium">
                                  {payment.paymentMethod ||
                                    "Não informada"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Observação
                                </p>
                                <p className="mt-1 text-sm text-black/55">
                                  {payment.notes ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-black/5">
                    <div className="border-b border-black/5 px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                        Histórico da assinatura
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        Ativações e renovações registradas pela M1M.
                      </p>
                    </div>

                    {companyDetail.subscriptionEvents.length ===
                    0 ? (
                      <div className="px-5 py-6 text-sm text-black/40">
                        Nenhum evento registrado ainda.
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {companyDetail.subscriptionEvents.map(
                          (
                            event,
                          ) => (
                            <div
                              key={
                                event.id
                              }
                              className="grid gap-3 px-5 py-4 lg:grid-cols-[150px_minmax(0,1fr)_170px_220px] lg:items-center"
                            >
                              <div>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                    event.type ===
                                    "ACTIVATION"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-sky-200 bg-sky-50 text-sky-700"
                                  }`}
                                >
                                  {getSubscriptionEventLabel(
                                    event.type,
                                  )}
                                </span>

                                <p className="mt-2 text-xs text-black/40">
                                  {formatDate(
                                    event.createdAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm font-bold">
                                  {event.planName ||
                                    "Plano não informado"}
                                </p>

                                <p className="mt-1 text-xs text-black/40">
                                  {formatCurrencyFromCents(
                                    event.amountCents,
                                  )}
                                  {" · "}
                                  {getBillingCycleLabel(
                                    event.billingCycle,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Vencimento anterior
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {formatDate(
                                    event.previousAccessEndsAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                                  Novo vencimento
                                </p>

                                <p className="mt-1 text-sm font-bold">
                                  {formatDate(
                                    event.newAccessEndsAt,
                                  )}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-black/5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                          Acesso / Licença
                        </p>

                        <p className="mt-1 text-sm text-black/45">
                          Controles internos da M1M para liberar, suspender ou prorrogar o teste da empresa.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {companyDetail.company.subscriptionStatus !==
                          "ACTIVE" && (
                          <button
                            type="button"
                            disabled={
                              accessActionLoading
                            }
                            onClick={() =>
                              void handleAccessAction(
                                "ACTIVATE",
                              )
                            }
                            className="h-10 rounded-xl bg-[#171717] px-4 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ativar empresa
                          </button>
                        )}

                        {companyDetail.company.subscriptionStatus !==
                          "SUSPENDED" && (
                          <button
                            type="button"
                            disabled={
                              accessActionLoading
                            }
                            onClick={() =>
                              void handleAccessAction(
                                "SUSPEND",
                              )
                            }
                            className="h-10 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Suspender
                          </button>
                        )}

                        {companyDetail.company.subscriptionStatus ===
                          "TRIAL" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                accessActionLoading
                              }
                              onClick={() =>
                                void handleAccessAction(
                                  "REDUCE_TRIAL_1_DAY",
                                )
                              }
                              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/60 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              -1 dia
                            </button>

                            <button
                              type="button"
                              disabled={
                                accessActionLoading
                              }
                              onClick={() =>
                                void handleAccessAction(
                                  "RESET_TRIAL_7_DAYS",
                                )
                              }
                              className="h-10 rounded-xl border border-blue-200 bg-white px-4 text-xs font-bold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Definir 7 dias
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={
                            accessActionLoading
                          }
                          onClick={() =>
                            void handleAccessAction(
                              "EXTEND_TRIAL_7_DAYS",
                            )
                          }
                          className="h-10 rounded-xl border border-teal-200 bg-white px-4 text-xs font-bold text-teal-600 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          +7 dias de teste
                        </button>
                      </div>
                    </div>

                    {accessActionError && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {
                          accessActionError
                        }
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-5 text-black/35">
                      Suspender desconecta o WhatsApp imediatamente. Ativar ou prorrogar o trial libera o acesso, mas não reconecta o WhatsApp automaticamente.
                    </p>
                  </section>

                  <section className="rounded-2xl border border-red-100 bg-red-50/40 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                          Zona de perigo
                        </p>

                        <p className="mt-1 text-sm text-black/45">
                          Exclusão permanente da empresa e dos dados relacionados.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCompanyDeleteError(
                            null,
                          );
                          setCompanyDeleteConfirmation(
                            "",
                          );
                          setCompanyDeleteOpen(
                            true,
                          );
                        }}
                        className="h-10 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
                        Excluir empresa
                      </button>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-black/5">
                    <div className="border-b border-black/5 px-5 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                        Usuários da empresa
                      </p>
                    </div>

                    {companyDetail.users.length === 0 ? (
                      <div className="px-5 py-6 text-sm text-black/40">
                        Nenhum usuário cadastrado.
                      </div>
                    ) : (
                      <div className="divide-y divide-black/5">
                        {companyDetail.users.map(
                          (
                            user,
                          ) => (
                            <div
                              key={
                                user.id
                              }
                              className="px-5 py-4"
                            >
                              {adminUserEditing ===
                              user.id ? (
                                <form
                                  onSubmit={
                                    handleSaveAdminUser
                                  }
                                >
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                      <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                        Nome
                                      </label>
                                      <input
                                        value={
                                          adminEditName
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditName(
                                            event.target.value,
                                          )
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                        Nome de exibição
                                      </label>
                                      <input
                                        value={
                                          adminEditDisplayName
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditDisplayName(
                                            event.target.value,
                                          )
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                        E-mail
                                      </label>
                                      <input
                                        type="email"
                                        value={
                                          adminEditEmail
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditEmail(
                                            event.target.value,
                                          )
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                        Telefone
                                      </label>
                                      <input
                                        value={
                                          adminEditPhone
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditPhone(
                                            event.target.value,
                                          )
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-bold uppercase tracking-wide text-black/30">
                                        Cargo
                                      </label>
                                      <input
                                        value={
                                          adminEditJobTitle
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditJobTitle(
                                            event.target.value,
                                          )
                                        }
                                        className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                                      />
                                    </div>

                                    <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2.5">
                                      <input
                                        type="checkbox"
                                        checked={
                                          adminEditActive
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          setAdminEditActive(
                                            event.target.checked,
                                          )
                                        }
                                      />

                                      <span className="text-sm font-medium text-black/60">
                                        Administrador ativo
                                      </span>
                                    </label>
                                  </div>

                                  {adminUserError && (
                                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                      {
                                        adminUserError
                                      }
                                    </div>
                                  )}

                                  <div className="mt-4 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        adminUserSaving
                                      }
                                      onClick={() => {
                                        setAdminUserEditing(
                                          null,
                                        );
                                        setAdminUserError(
                                          null,
                                        );
                                      }}
                                      className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 disabled:opacity-50"
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="submit"
                                      disabled={
                                        adminUserSaving
                                      }
                                      className="h-9 rounded-xl bg-[#0A9090] px-4 text-xs font-bold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {adminUserSaving
                                        ? "Salvando..."
                                        : "Salvar administrador"}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto_auto] sm:items-center">
                                  <div>
                                    <p className="text-sm font-bold">
                                      {user.displayName ||
                                        user.name}
                                    </p>
                                    <p className="mt-1 text-xs text-black/40">
                                      {user.email}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium text-black/55">
                                      {user.jobTitle ||
                                        user.role}
                                    </p>
                                  </div>

                                  <span
                                    className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                      user.active
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {user.active
                                      ? "Ativo"
                                      : "Inativo"}
                                  </span>

                                  {user.role ===
                                    "ADMIN" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startAdminUserEdit(
                                          user,
                                        )
                                      }
                                      className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {companyDeleteOpen &&
          companyDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4 py-6">
            <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                Exclusão permanente
              </p>

              <h3 className="mt-2 text-xl font-bold">
                Excluir{" "}
                {
                  companyDetail.company.name
                }?
              </h3>

              <p className="mt-3 text-sm leading-6 text-black/50">
                Esta ação remove permanentemente a empresa e os dados relacionados, incluindo usuários, clientes, atendimentos, mensagens, comprovantes e histórico da assinatura.
              </p>

              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs leading-5 text-red-700">
                  Para confirmar, digite exatamente:
                </p>

                <p className="mt-1 break-all text-sm font-bold text-red-700">
                  {
                    companyDetail.company.name
                  }
                </p>
              </div>

              <input
                value={
                  companyDeleteConfirmation
                }
                onChange={(
                  event,
                ) =>
                  setCompanyDeleteConfirmation(
                    event.target.value,
                  )
                }
                disabled={
                  companyDeleting
                }
                autoComplete="off"
                className="mt-4 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:opacity-50"
                placeholder="Digite o nome da empresa"
              />

              {companyDeleteError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    companyDeleteError
                  }
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    companyDeleting
                  }
                  onClick={() => {
                    setCompanyDeleteOpen(
                      false,
                    );
                    setCompanyDeleteConfirmation(
                      "",
                    );
                    setCompanyDeleteError(
                      null,
                    );
                  }}
                  className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-black/20 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    companyDeleting ||
                    companyDeleteConfirmation !==
                      companyDetail.company.name
                  }
                  onClick={() =>
                    void handleDeleteCompany()
                  }
                  className="h-10 rounded-xl bg-red-600 px-5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {companyDeleting
                    ? "Excluindo..."
                    : "Excluir permanentemente"}
                </button>
              </div>
            </div>
          </div>
        )}

        {financialHistoryModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4 py-6">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                    Histórico financeiro
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    Cobranças e pagamentos
                  </h3>

                  <p className="mt-1 text-sm text-black/45">
                    Movimentações financeiras das assinaturas das empresas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFinancialHistoryModalOpen(
                      false,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-sm font-bold text-black/40 transition hover:border-black/20 hover:text-black/70"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              {financialHistory.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-bold">
                    Nenhuma movimentação financeira.
                  </p>
                  <p className="mt-1 text-sm text-black/40">
                    Cobranças e pagamentos aparecerão aqui quando forem registrados.
                  </p>
                </div>
              ) : (
                <div className="max-h-[65vh] divide-y divide-black/5 overflow-y-auto">
                  {financialHistory.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_120px_150px_150px]"
                      >
                        <div>
                          <p className="text-sm font-bold">
                            {item.companyName}
                          </p>
                          <p className="mt-1 text-xs text-black/40">
                            {item.kind ===
                            "PAYMENT"
                              ? `Pagamento${item.paymentMethod ? ` • ${item.paymentMethod}` : ""}`
                              : item.eventType ===
                                  "ACTIVATION"
                                ? "Cobrança de ativação"
                                : "Cobrança de renovação"}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs text-black/35">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Tipo
                          </p>
                          <p
                            className={`mt-1 text-sm font-bold ${
                              item.kind ===
                              "PAYMENT"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {item.kind ===
                            "PAYMENT"
                              ? "Recebimento"
                              : "Cobrança"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Valor
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {formatCurrencyFromCents(
                              item.amountCents,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Data
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {formatDate(
                              item.date,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {receivableModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4 py-6">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">
                    Contas a receber
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    Assinaturas com saldo pendente
                  </h3>

                  <p className="mt-1 text-sm text-black/45">
                    Total pendente:{" "}
                    <strong className="text-black/70">
                      {formatCurrencyFromCents(
                        receivableCents,
                      )}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setReceivableModalOpen(
                      false,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-sm font-bold text-black/40 transition hover:border-black/20 hover:text-black/70"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              {receivableDetails.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-bold">
                    Nenhuma pendência financeira.
                  </p>

                  <p className="mt-1 text-sm text-black/40">
                    Todas as cobranças registradas estão quitadas.
                  </p>
                </div>
              ) : (
                <div className="max-h-[65vh] divide-y divide-black/5 overflow-y-auto">
                  {receivableDetails.map(
                    (
                      item,
                    ) => (
                      <div
                        key={
                          item.companyId
                        }
                        className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_150px_150px_120px] md:items-center"
                      >
                        <div>
                          <p className="text-sm font-bold">
                            {
                              item.companyName
                            }
                          </p>

                          <p className="mt-1 text-xs text-black/40">
                            Saldo pendente da assinatura
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Valor pendente
                          </p>

                          <p className="mt-1 text-sm font-bold text-amber-700">
                            {formatCurrencyFromCents(
                              item.amountCents,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Vencimento
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {item.accessEndsAt
                              ? formatDate(
                                  item.accessEndsAt,
                                )
                              : "Sem data"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-black/30">
                            Status
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {getSubscriptionStatusLabel(
                              item.subscriptionStatus,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showCreateCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-black/5 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                    Cadastro administrativo
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    Nova empresa
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/45">
                    A empresa será criada com 7 dias de teste, onboarding pendente, IA desligada e WhatsApp ainda não configurado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCreateCompany
                  }
                  disabled={
                    creatingCompany
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg text-black/40 transition hover:border-black/20 hover:text-black/70 disabled:opacity-50"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateCompany
                }
                className="mt-7"
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <section>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                      Empresa
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="company-name"
                          className="text-xs font-bold text-black/50"
                        >
                          Nome da empresa *
                        </label>
                        <input
                          id="company-name"
                          value={
                            companyName
                          }
                          onChange={(
                            event,
                          ) =>
                            setCompanyName(
                              event.target.value,
                            )
                          }
                          placeholder="Ex.: Casa do Criador"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-segment"
                          className="text-xs font-bold text-black/50"
                        >
                          Segmento
                        </label>
                        <input
                          id="company-segment"
                          value={
                            segment
                          }
                          onChange={(
                            event,
                          ) =>
                            setSegment(
                              event.target.value,
                            )
                          }
                          placeholder="Ex.: Agropecuária"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-email"
                          className="text-xs font-bold text-black/50"
                        >
                          E-mail da empresa
                        </label>
                        <input
                          id="company-email"
                          type="email"
                          value={
                            companyEmail
                          }
                          onChange={(
                            event,
                          ) =>
                            setCompanyEmail(
                              event.target.value,
                            )
                          }
                          placeholder="contato@empresa.com.br"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-phone"
                          className="text-xs font-bold text-black/50"
                        >
                          Telefone
                        </label>
                        <input
                          id="company-phone"
                          value={
                            companyPhone
                          }
                          onChange={(
                            event,
                          ) =>
                            setCompanyPhone(
                              event.target.value,
                            )
                          }
                          placeholder="(65) 99999-9999"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
                        <div>
                          <label
                            htmlFor="company-city"
                            className="text-xs font-bold text-black/50"
                          >
                            Cidade
                          </label>
                          <input
                            id="company-city"
                            value={
                              companyCity
                            }
                            onChange={(
                              event,
                            ) =>
                              setCompanyCity(
                                event.target.value,
                              )
                            }
                            placeholder="Ex.: Cáceres"
                            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="company-state"
                            className="text-xs font-bold text-black/50"
                          >
                            UF
                          </label>
                          <select
                            id="company-state"
                            value={
                              companyState
                            }
                            onChange={(
                              event,
                            ) =>
                              setCompanyState(
                                event.target.value,
                              )
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                          >
                            <option value="">
                              —
                            </option>
                            {[
                              "AC",
                              "AL",
                              "AP",
                              "AM",
                              "BA",
                              "CE",
                              "DF",
                              "ES",
                              "GO",
                              "MA",
                              "MT",
                              "MS",
                              "MG",
                              "PA",
                              "PB",
                              "PR",
                              "PE",
                              "PI",
                              "RJ",
                              "RN",
                              "RS",
                              "RO",
                              "RR",
                              "SC",
                              "SP",
                              "SE",
                              "TO",
                            ].map(
                              (
                                state,
                              ) => (
                                <option
                                  key={
                                    state
                                  }
                                  value={
                                    state
                                  }
                                >
                                  {
                                    state
                                  }
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                      Administrador inicial
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <label
                          htmlFor="admin-name"
                          className="text-xs font-bold text-black/50"
                        >
                          Nome completo *
                        </label>
                        <input
                          id="admin-name"
                          value={
                            adminName
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminName(
                              event.target.value,
                            )
                          }
                          placeholder="Nome do responsável"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-display-name"
                          className="text-xs font-bold text-black/50"
                        >
                          Nome de exibição
                        </label>
                        <input
                          id="admin-display-name"
                          value={
                            adminDisplayName
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminDisplayName(
                              event.target.value,
                            )
                          }
                          placeholder="Ex.: João"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-email"
                          className="text-xs font-bold text-black/50"
                        >
                          E-mail de acesso *
                        </label>
                        <input
                          id="admin-email"
                          type="email"
                          value={
                            adminEmail
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminEmail(
                              event.target.value,
                            )
                          }
                          placeholder="gestor@empresa.com.br"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-phone"
                          className="text-xs font-bold text-black/50"
                        >
                          Telefone do administrador
                        </label>
                        <input
                          id="admin-phone"
                          value={
                            adminPhone
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminPhone(
                              event.target.value,
                            )
                          }
                          placeholder="(65) 99999-9999"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-password"
                          className="text-xs font-bold text-black/50"
                        >
                          Senha inicial *
                        </label>
                        <input
                          id="admin-password"
                          type="password"
                          autoComplete="new-password"
                          value={
                            adminPassword
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminPassword(
                              event.target.value,
                            )
                          }
                          placeholder="Mínimo de 8 caracteres"
                          className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                {createCompanyError && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {
                      createCompanyError
                    }
                  </div>
                )}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={
                      closeCreateCompany
                    }
                    disabled={
                      creatingCompany
                    }
                    className="h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-bold text-black/55 transition hover:border-black/20 hover:text-black/75 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creatingCompany
                    }
                    className="h-11 rounded-xl bg-[#0A9090] px-6 text-sm font-bold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingCompany
                      ? "Criando empresa..."
                      : "Criar empresa e iniciar trial"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f7] px-6 py-10 text-[#171717]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A9090] text-white">
            <ShieldIcon />
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
            Marketing1Minuto
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            M1M Admin
          </h1>

          <p className="mt-2 text-sm leading-6 text-black/50">
            Área exclusiva para administração das empresas do M1M Connect.
          </p>

          {!configured ? (
            <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              A chave administrativa ainda não está configurada no servidor.
            </div>
          ) : (
            <form
              onSubmit={
                handleLogin
              }
              className="mt-7"
            >
              <label
                htmlFor="admin-key"
                className="text-xs font-bold uppercase tracking-wide text-black/40"
              >
                Chave administrativa
              </label>

              <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-black/10 bg-white px-4 transition focus-within:border-[#0A9090] focus-within:ring-4 focus-within:ring-[#0A9090]/10">
                <span className="text-black/35">
                  <KeyIcon />
                </span>

                <input
                  id="admin-key"
                  type="password"
                  autoComplete="off"
                  value={
                    adminKey
                  }
                  onChange={(
                    event,
                  ) =>
                    setAdminKey(
                      event.target.value,
                    )
                  }
                  placeholder="Informe a chave da M1M"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/25"
                />
              </div>

              {error && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !adminKey.trim()
                }
                className="mt-5 h-12 w-full rounded-xl bg-[#171717] px-5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Entrando..."
                  : "Entrar no M1M Admin"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-black/35">
          Acesso interno da Marketing1Minuto
        </p>
      </div>
    </main>
  );
}

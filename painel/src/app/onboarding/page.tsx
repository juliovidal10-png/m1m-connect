"use client";

import { useEffect, useState } from "react";

type OnboardingResponse = {
  onboardingCompleted: boolean;
  company: {
    id: string;
    name: string;
    segment: string | null;
  };
  error?: string;
};

type CompanyResponse = {
  id: string;
  name: string;
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
  aiEnabled: boolean;
  error?: string;
};

type CompanyForm = {
  name: string;
  segment: string;
  presentation: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  email: string;
};

type UserRole = "ADMIN" | "MANAGER" | "ATTENDANT" | "FINANCE";
type User = {
  id: string; name: string; displayName: string | null; email: string;
  jobTitle: string | null; phone: string | null; role: UserRole; active: boolean;
};
type UserForm = {
  name: string; displayName: string; email: string; jobTitle: string;
  phone: string; role: UserRole;
};
const emptyUserForm: UserForm = {
  name: "", displayName: "", email: "", jobTitle: "", phone: "", role: "ATTENDANT",
};
const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador", MANAGER: "Gestor", ATTENDANT: "Atendente", FINANCE: "Financeiro",
};

type Sector = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
};

type SectorForm = {
  name: string;
  description: string;
};

const emptySectorForm: SectorForm = {
  name: "",
  description: "",
};


type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

type CompanySchedule = {
  id?: string;
  companyId?: string;
  dayOfWeek: Weekday;
  enabled: boolean;
  allDay: boolean;
  closesForLunch: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

type WhatsAppState = "CONNECTED" | "CONNECTING" | "DISCONNECTED";

type WhatsAppStatusResponse = {
  instanceName: string;
  exists: boolean;
  state: WhatsAppState;
  phone: string | null;
  profileName: string | null;
  error?: string;
};

type WhatsAppConnectResponse = {
  instanceName?: string;
  created?: boolean;
  base64?: string | null;
  code?: string | null;
  error?: string;
};

type CompanySchedulesResponse = {
  company: {
    id: string;
    name: string;
  };
  schedules: CompanySchedule[];
  error?: string;
};

const weekdayLabels: Record<Weekday, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const steps = [
  "Bem-vindo",
  "Empresa",
  "Equipe",
  "Setores",
  "Horários",
  "WhatsApp",
  "IA",
  "Pronto",
] as const;

const emptyCompanyForm: CompanyForm = {
  name: "",
  segment: "",
  presentation: "",
  city: "",
  state: "",
  phone: "",
  whatsapp: "",
  email: "",
};

function toCompanyForm(company: CompanyResponse): CompanyForm {
  return {
    name: company.name ?? "",
    segment: company.segment ?? "",
    presentation: company.presentation ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
    email: company.email ?? "",
  };
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [companyForm, setCompanyForm] =
    useState<CompanyForm>(emptyCompanyForm);

  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorForm, setSectorForm] = useState<SectorForm>(emptySectorForm);
  const [isSectorFormOpen, setIsSectorFormOpen] = useState(false);
  const [isLoadingSectors, setIsLoadingSectors] = useState(false);
  const [isSavingSector, setIsSavingSector] = useState(false);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [sectorSuccess, setSectorSuccess] = useState<string | null>(null);


  const [schedules, setSchedules] = useState<CompanySchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isSavingSchedules, setIsSavingSchedules] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const [whatsAppStatus, setWhatsAppStatus] =
    useState<WhatsAppStatusResponse | null>(null);
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);
  const [whatsAppQrCode, setWhatsAppQrCode] = useState<string | null>(null);
  const [whatsAppPairingCode, setWhatsAppPairingCode] = useState<string | null>(null);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const [isFinishingOnboarding, setIsFinishingOnboarding] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadOnboarding() {
      try {
        const response = await fetch("/api/onboarding", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as OnboardingResponse;

        if (!response.ok) {
          throw new Error(
            result.error || "Não foi possível carregar a configuração inicial.",
          );
        }

        setData(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar a configuração inicial.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOnboarding();
  }, []);

  async function openCompanyStep() {
    setCurrentStep(1);
    setIsLoadingCompany(true);
    setCompanyError(null);
    setCompanySuccess(null);

    try {
      const response = await fetch("/api/company", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as CompanyResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível carregar os dados da empresa.",
        );
      }

      setCompanyForm(toCompanyForm(result));
    } catch (loadError) {
      setCompanyError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os dados da empresa.",
      );
    } finally {
      setIsLoadingCompany(false);
    }
  }

  function updateCompanyField(
    field: keyof CompanyForm,
    value: string,
  ) {
    setCompanyForm((current) => ({
      ...current,
      [field]: value,
    }));

    setCompanyError(null);
    setCompanySuccess(null);
  }

  async function saveCompany(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSavingCompany) return;

    if (!companyForm.name.trim()) {
      setCompanyError("Informe o nome da empresa.");
      return;
    }

    setIsSavingCompany(true);
    setCompanyError(null);
    setCompanySuccess(null);

    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(companyForm),
      });

      const result = (await response.json()) as CompanyResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível salvar os dados da empresa.",
        );
      }

      setCompanyForm(toCompanyForm(result));
      setData((current) =>
        current
          ? {
              ...current,
              company: {
                ...current.company,
                name: result.name,
                segment: result.segment,
              },
            }
          : current,
      );

      setCompanySuccess("Dados da empresa salvos com sucesso.");
    } catch (saveError) {
      setCompanyError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os dados da empresa.",
      );
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function openTeamStep() {
    setCurrentStep(2);
    setIsLoadingUsers(true);
    setUserError(null);
    setUserSuccess(null);
    try {
      const response = await fetch("/api/users", { method: "GET", cache: "no-store" });
      const result = (await response.json()) as User[] | { error?: string };
      if (!response.ok) {
        throw new Error(!Array.isArray(result) && result.error ? result.error : "Não foi possível carregar a equipe.");
      }
      setUsers(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setUserError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a equipe.");
    } finally {
      setIsLoadingUsers(false);
    }
  }

  function updateUserField<Field extends keyof UserForm>(field: Field, value: UserForm[Field]) {
    setUserForm((current) => ({ ...current, [field]: value }));
    setUserError(null);
    setUserSuccess(null);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingUser) return;
    if (!userForm.name.trim()) { setUserError("Informe o nome completo do colaborador."); return; }
    if (!userForm.email.trim()) { setUserError("Informe o e-mail do colaborador."); return; }

    setIsSavingUser(true);
    setUserError(null);
    setUserSuccess(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userForm, useCustomPermissions: false, permissions: [], active: true,
        }),
      });
      const result = (await response.json()) as User | { error?: string };
      if (!response.ok) {
        throw new Error("error" in result && result.error ? result.error : "Não foi possível criar o colaborador.");
      }
      setUserForm(emptyUserForm);
      setIsUserFormOpen(false);
      await openTeamStep();
      setUserSuccess("Colaborador criado com sucesso.");
    } catch (saveError) {
      setUserError(saveError instanceof Error ? saveError.message : "Não foi possível criar o colaborador.");
    } finally {
      setIsSavingUser(false);
    }
  }

  async function openSectorsStep() {
    setCurrentStep(3);
    setIsLoadingSectors(true);
    setSectorError(null);
    setSectorSuccess(null);

    try {
      const response = await fetch("/api/sectors", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as Sector[] | { error?: string };

      if (!response.ok) {
        throw new Error(
          !Array.isArray(result) && result.error
            ? result.error
            : "Não foi possível carregar os setores.",
        );
      }

      setSectors(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setSectorError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os setores.",
      );
    } finally {
      setIsLoadingSectors(false);
    }
  }

  function updateSectorField(field: keyof SectorForm, value: string) {
    setSectorForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSectorError(null);
    setSectorSuccess(null);
  }

  async function createSector(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingSector) return;

    if (!sectorForm.name.trim()) {
      setSectorError("Informe o nome do setor.");
      return;
    }

    setIsSavingSector(true);
    setSectorError(null);
    setSectorSuccess(null);

    try {
      const nextSortOrder =
        sectors.length > 0
          ? Math.max(...sectors.map((sector) => sector.sortOrder ?? 0)) + 1
          : 0;

      const response = await fetch("/api/sectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sectorForm.name,
          description: sectorForm.description,
          active: true,
          sortOrder: nextSortOrder,
        }),
      });

      const result = (await response.json()) as Sector | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Não foi possível criar o setor.",
        );
      }

      setSectorForm(emptySectorForm);
      setIsSectorFormOpen(false);
      await openSectorsStep();
      setSectorSuccess("Setor criado com sucesso.");
    } catch (saveError) {
      setSectorError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível criar o setor.",
      );
    } finally {
      setIsSavingSector(false);
    }
  }


  async function openSchedulesStep() {
    setCurrentStep(4);
    setIsLoadingSchedules(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const response = await fetch("/api/company/schedules", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as CompanySchedulesResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível carregar os horários da empresa.",
        );
      }

      setSchedules(
        (result.schedules ?? []).map((schedule) => ({
          ...schedule,
          closesForLunch: Boolean(
            schedule.secondOpeningTime &&
              schedule.secondClosingTime,
          ),
        })),
      );
    } catch (loadError) {
      setScheduleError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os horários da empresa.",
      );
    } finally {
      setIsLoadingSchedules(false);
    }
  }

  function updateSchedule(
    dayOfWeek: Weekday,
    changes: Partial<CompanySchedule>,
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.dayOfWeek === dayOfWeek
          ? { ...schedule, ...changes }
          : schedule,
      ),
    );
    setScheduleError(null);
    setScheduleSuccess(null);
  }

  async function saveSchedules() {
    if (isSavingSchedules) return;

    setIsSavingSchedules(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const response = await fetch("/api/company/schedules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            enabled: schedule.enabled,
            allDay: schedule.allDay,
            openingTime: schedule.openingTime,
            closingTime: schedule.closingTime,
            secondOpeningTime:
              !schedule.allDay && schedule.closesForLunch
                ? schedule.secondOpeningTime
                : null,
            secondClosingTime:
              !schedule.allDay && schedule.closesForLunch
                ? schedule.secondClosingTime
                : null,
          })),
        }),
      });

      const result = (await response.json()) as CompanySchedulesResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível salvar os horários da empresa.",
        );
      }

      setSchedules(
        (result.schedules ?? []).map((schedule) => ({
          ...schedule,
          closesForLunch: Boolean(
            schedule.secondOpeningTime &&
              schedule.secondClosingTime,
          ),
        })),
      );
      setScheduleSuccess("Horários salvos com sucesso.");
    } catch (saveError) {
      setScheduleError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar os horários da empresa.",
      );
    } finally {
      setIsSavingSchedules(false);
    }
  }

  async function loadWhatsAppStatus(showLoading = true) {
    if (showLoading) setIsLoadingWhatsApp(true);
    setWhatsAppError(null);

    try {
      const response = await fetch("/api/whatsapp/status", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as WhatsAppStatusResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível consultar a conexão do WhatsApp.",
        );
      }

      setWhatsAppStatus(result);

      if (result.state === "CONNECTED") {
        setWhatsAppQrCode(null);
        setWhatsAppPairingCode(null);
        setIsConnectingWhatsApp(false);
      }

      return result;
    } catch (loadError) {
      setWhatsAppError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível consultar a conexão do WhatsApp.",
      );
      return null;
    } finally {
      if (showLoading) setIsLoadingWhatsApp(false);
    }
  }

  async function openWhatsAppStep() {
    setCurrentStep(5);
    setWhatsAppQrCode(null);
    setWhatsAppPairingCode(null);
    await loadWhatsAppStatus();
  }

  async function connectWhatsApp() {
    if (isConnectingWhatsApp) return;

    setIsConnectingWhatsApp(true);
    setWhatsAppError(null);
    setWhatsAppQrCode(null);
    setWhatsAppPairingCode(null);

    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        cache: "no-store",
      });

      const result = (await response.json()) as WhatsAppConnectResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível iniciar a conexão do WhatsApp.",
        );
      }

      if (result.base64) {
        setWhatsAppQrCode(
          result.base64.startsWith("data:")
            ? result.base64
            : `data:image/png;base64,${result.base64}`,
        );
      }

      setWhatsAppPairingCode(result.code ?? null);
      await loadWhatsAppStatus(false);
    } catch (connectError) {
      setWhatsAppError(
        connectError instanceof Error
          ? connectError.message
          : "Não foi possível iniciar a conexão do WhatsApp.",
      );
      setIsConnectingWhatsApp(false);
    }
  }

  useEffect(() => {
    if (currentStep !== 5 || whatsAppStatus?.state === "CONNECTED") return;

    const interval = window.setInterval(() => {
      void loadWhatsAppStatus(false);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [currentStep, whatsAppStatus?.state]);

  async function openAIStep() {
    setCurrentStep(6);
    setIsLoadingAI(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const response = await fetch("/api/company", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as CompanyResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível carregar a configuração da IA.",
        );
      }

      setAiEnabled(Boolean(result.aiEnabled));
    } catch (loadError) {
      setAiError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a configuração da IA.",
      );
    } finally {
      setIsLoadingAI(false);
    }
  }

  async function saveAIConfiguration() {
    if (isSavingAI) return;

    setIsSavingAI(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiEnabled,
        }),
      });

      const result = (await response.json()) as CompanyResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível salvar a configuração da IA.",
        );
      }

      setAiEnabled(Boolean(result.aiEnabled));
      setAiSuccess(
        result.aiEnabled
          ? "Atendimento com IA ativado com sucesso."
          : "Atendimento com IA mantido desativado.",
      );
    } catch (saveError) {
      setAiError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar a configuração da IA.",
      );
    } finally {
      setIsSavingAI(false);
    }
  }

  async function finishOnboarding() {
    if (isFinishingOnboarding) return;

    setIsFinishingOnboarding(true);
    setFinishError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        cache: "no-store",
      });

      const result = (await response.json()) as OnboardingResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível concluir a configuração inicial.",
        );
      }

      if (!result.onboardingCompleted) {
        throw new Error(
          "A configuração foi processada, mas o onboarding ainda não foi concluído.",
        );
      }

      window.location.assign("/");
    } catch (finishErrorValue) {
      setFinishError(
        finishErrorValue instanceof Error
          ? finishErrorValue.message
          : "Não foi possível concluir a configuração inicial.",
      );
      setIsFinishingOnboarding(false);
    }
  }

  function renderField(
    label: string,
    field: keyof CompanyForm,
    options?: {
      placeholder?: string;
      type?: string;
      maxLength?: number;
    },
  ) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-black/70">
          {label}
        </span>

        <input
          type={options?.type ?? "text"}
          value={companyForm[field]}
          maxLength={options?.maxLength}
          placeholder={options?.placeholder}
          onChange={(event) =>
            updateCompanyField(field, event.target.value)
          }
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        />
      </label>
    );
  }

  return (
    <main className="h-screen overflow-y-auto bg-[#f6f7f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087B7B]">
            Configuração inicial
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#171717]">
            Vamos preparar o M1M Connect
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">
            Em poucos passos, sua empresa ficará pronta para atender clientes pelo WhatsApp.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`rounded-2xl border px-4 py-3 ${
                index === currentStep
                  ? "border-teal-200 bg-teal-50"
                  : index < currentStep
                    ? "border-emerald-100 bg-emerald-50/70"
                    : "border-black/[0.06] bg-white"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/35">
                Etapa {index + 1}
              </p>
              <p className="mt-1 text-sm font-bold text-[#171717]">
                {step}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="border-b border-black/[0.05] px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
              Etapa {currentStep + 1} de 8
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#171717]">
              {currentStep === 0
                ? "Bem-vindo ao M1M Connect"
                : currentStep === 1
                  ? "Dados da empresa"
                  : currentStep === 2
                    ? "Equipe"
                    : currentStep === 3
                      ? "Setores"
                      : currentStep === 4
                        ? "Horários"
                        : currentStep === 5
                          ? "WhatsApp"
                          : currentStep === 6
                            ? "IA"
                            : "Pronto"}
            </h2>
          </div>

          <div className="p-6 lg:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-6 w-52 animate-pulse rounded bg-black/5" />
                <div className="h-4 w-full max-w-xl animate-pulse rounded bg-black/5" />
                <div className="h-4 w-4/5 max-w-lg animate-pulse rounded bg-black/5" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : currentStep === 0 ? (
              <>
                <div className="rounded-2xl border border-black/[0.05] bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
                    Empresa
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#171717]">
                    {data?.company.name || "Empresa"}
                  </p>
                  {data?.company.segment && (
                    <p className="mt-1 text-sm text-black/45">
                      {data.company.segment}
                    </p>
                  )}
                </div>

                <div className="mt-6 max-w-2xl">
                  <h3 className="text-lg font-bold text-[#171717]">
                    O que vamos configurar
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/50">
                    Vamos revisar os dados da empresa, equipe, setores, horários,
                    conexão do WhatsApp e as informações que serão usadas no atendimento.
                  </p>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={openCompanyStep}
                    className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
                  >
                    Começar configuração
                  </button>
                </div>
              </>
            ) : currentStep === 1 ? (
              <>
                {isLoadingCompany ? (
                  <div className="space-y-4">
                    <div className="h-12 animate-pulse rounded-xl bg-black/5" />
                    <div className="h-12 animate-pulse rounded-xl bg-black/5" />
                    <div className="h-24 animate-pulse rounded-xl bg-black/5" />
                  </div>
                ) : (
                  <form onSubmit={saveCompany}>
                    <p className="max-w-2xl text-sm leading-6 text-black/50">
                      Confira as informações principais. Você poderá alterar ou complementar esses dados depois nas configurações.
                    </p>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      {renderField("Nome da empresa *", "name", {
                        placeholder: "Ex.: Marketing1Minuto",
                      })}

                      {renderField("Segmento", "segment", {
                        placeholder: "Ex.: Agência de marketing",
                      })}
                    </div>

                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-semibold text-black/70">
                        Apresentação da empresa
                      </span>

                      <textarea
                        value={companyForm.presentation}
                        onChange={(event) =>
                          updateCompanyField(
                            "presentation",
                            event.target.value,
                          )
                        }
                        rows={4}
                        placeholder="Explique de forma simples quem é a empresa e o que ela faz."
                        className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                      />
                    </label>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      {renderField("Cidade", "city", {
                        placeholder: "Ex.: Cáceres",
                      })}

                      {renderField("Estado", "state", {
                        placeholder: "Ex.: MT",
                        maxLength: 2,
                      })}

                      {renderField("Telefone", "phone", {
                        placeholder: "(65) 0000-0000",
                      })}

                      {renderField("WhatsApp", "whatsapp", {
                        placeholder: "(65) 90000-0000",
                      })}

                      <div className="md:col-span-2">
                        {renderField("E-mail", "email", {
                          type: "email",
                          placeholder: "contato@empresa.com.br",
                        })}
                      </div>
                    </div>

                    {companyError && (
                      <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {companyError}
                      </div>
                    )}

                    {companySuccess && (
                      <div className="mt-6 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {companySuccess}
                      </div>
                    )}

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(0);
                          setCompanyError(null);
                          setCompanySuccess(null);
                        }}
                        className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03]"
                      >
                        Voltar
                      </button>

                      <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={isSavingCompany}
                          className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/60 disabled:opacity-50">
                          {isSavingCompany ? "Salvando..." : "Salvar dados"}
                        </button>
                        <button type="button" onClick={openTeamStep} disabled={isSavingCompany}
                          className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                          Continuar para equipe
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            ) : currentStep === 2 ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#171717]">Colaboradores da empresa</h3>
                    <p className="mt-1 text-sm leading-6 text-black/50">
                      Confira quem já está cadastrado e adicione os colaboradores que usarão o M1M Connect.
                    </p>
                  </div>
                  <button type="button" onClick={() => {
                    setUserForm(emptyUserForm); setIsUserFormOpen(true); setUserError(null); setUserSuccess(null);
                  }} className="shrink-0 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white">
                    + Adicionar colaborador
                  </button>
                </div>

                {userError && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{userError}</div>}
                {userSuccess && <div className="mt-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{userSuccess}</div>}

                {isUserFormOpen && (
                  <form onSubmit={createUser} className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/40 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-teal-600">Novo colaborador</p>
                        <p className="mt-1 text-sm text-black/45">Cadastre somente os dados essenciais agora.</p>
                      </div>
                      <button type="button" onClick={() => setIsUserFormOpen(false)}
                        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/50">Fechar</button>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      {([
                        ["Nome completo *", "name", "text"],
                        ["Nome exibido ao cliente", "displayName", "text"],
                        ["E-mail *", "email", "email"],
                        ["Cargo", "jobTitle", "text"],
                        ["Telefone", "phone", "text"],
                      ] as const).map(([label, field, type]) => (
                        <label key={field} className="block">
                          <span className="mb-2 block text-sm font-semibold text-black/70">{label}</span>
                          <input type={type} value={userForm[field]}
                            onChange={(event) => updateUserField(field, event.target.value)}
                            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100" />
                        </label>
                      ))}

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black/70">Perfil de acesso</span>
                        <select value={userForm.role}
                          onChange={(event) => updateUserField("role", event.target.value as UserRole)}
                          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100">
                          <option value="ADMIN">Administrador</option>
                          <option value="MANAGER">Gestor</option>
                          <option value="ATTENDANT">Atendente</option>
                          <option value="FINANCE">Financeiro</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button type="submit" disabled={isSavingUser}
                        className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                        {isSavingUser ? "Salvando..." : "Criar colaborador"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6">
                  {isLoadingUsers ? (
                    <div className="space-y-3">{[1,2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-black/5" />)}</div>
                  ) : users.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-[#fafafa] px-6 py-10 text-center">
                      <p className="font-bold text-[#171717]">Nenhum colaborador cadastrado</p>
                      <p className="mt-2 text-sm text-black/45">Você pode adicionar a equipe agora ou continuar a configuração.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-[#171717]">{user.name}</p>
                            <p className="mt-1 text-sm text-black/45">{user.email}{user.jobTitle ? ` • ${user.jobTitle}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-black/[0.06] bg-white px-3 py-1 text-xs font-bold text-black/55">{roleLabels[user.role]}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.active ? "bg-green-100 text-green-700" : "bg-black/5 text-black/40"}`}>
                              {user.active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button type="button" onClick={openCompanyStep}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55">Voltar</button>
                  <button type="button" onClick={openSectorsStep}
                    className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black">
                    Continuar para setores
                  </button>
                </div>
              </>
            ) : currentStep === 3 ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#171717]">
                      Setores da empresa
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-black/50">
                      Organize o atendimento pelos principais setores da empresa. Os detalhes poderão ser configurados depois.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSectorForm(emptySectorForm);
                      setIsSectorFormOpen(true);
                      setSectorError(null);
                      setSectorSuccess(null);
                    }}
                    className="shrink-0 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
                  >
                    + Adicionar setor
                  </button>
                </div>

                {sectorError && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {sectorError}
                  </div>
                )}

                {sectorSuccess && (
                  <div className="mt-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {sectorSuccess}
                  </div>
                )}

                {isSectorFormOpen && (
                  <form
                    onSubmit={createSector}
                    className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/40 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-teal-600">
                          Novo setor
                        </p>
                        <p className="mt-1 text-sm text-black/45">
                          Informe somente o essencial. Responsáveis, palavras-chave e demais ajustes ficam para depois.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSectorFormOpen(false)}
                        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/50"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="mt-5 grid gap-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black/70">
                          Nome do setor *
                        </span>
                        <input
                          value={sectorForm.name}
                          onChange={(event) =>
                            updateSectorField("name", event.target.value)
                          }
                          placeholder="Ex.: Comercial"
                          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black/70">
                          Descrição
                        </span>
                        <textarea
                          value={sectorForm.description}
                          onChange={(event) =>
                            updateSectorField("description", event.target.value)
                          }
                          rows={3}
                          placeholder="Ex.: Vendas, orçamentos e informações comerciais."
                          className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingSector}
                        className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                      >
                        {isSavingSector ? "Salvando..." : "Criar setor"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6">
                  {isLoadingSectors ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-20 animate-pulse rounded-2xl bg-black/5"
                        />
                      ))}
                    </div>
                  ) : sectors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-[#fafafa] px-6 py-10 text-center">
                      <p className="font-bold text-[#171717]">
                        Nenhum setor cadastrado
                      </p>
                      <p className="mt-2 text-sm text-black/45">
                        Adicione pelo menos os setores principais para organizar o atendimento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sectors.map((sector) => (
                        <div
                          key={sector.id}
                          className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-bold text-[#171717]">
                              {sector.name}
                            </p>
                            {sector.description && (
                              <p className="mt-1 text-sm text-black/45">
                                {sector.description}
                              </p>
                            )}
                          </div>

                          <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                              sector.active
                                ? "bg-green-100 text-green-700"
                                : "bg-black/5 text-black/40"
                            }`}
                          >
                            {sector.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button
                    type="button"
                    onClick={openTeamStep}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03]"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={openSchedulesStep}
                    className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
                  >
                    Continuar para horários
                  </button>
                </div>
              </>
            ) : currentStep === 4 ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">
                    Horário geral da empresa
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-black/50">
                    Defina quando a empresa atende normalmente. Esses horários serão usados como base do atendimento e poderão ser alterados depois nas configurações.
                  </p>
                </div>

                {scheduleError && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {scheduleError}
                  </div>
                )}

                {scheduleSuccess && (
                  <div className="mt-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {scheduleSuccess}
                  </div>
                )}

                <div className="mt-6">
                  {isLoadingSchedules ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                        <div
                          key={item}
                          className="h-24 animate-pulse rounded-2xl bg-black/5"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedules.map((schedule) => (
                        <div
                          key={schedule.dayOfWeek}
                          className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-bold text-[#171717]">
                                  {weekdayLabels[schedule.dayOfWeek]}
                                </p>

                                <label className="mt-2 flex w-fit items-center gap-2 text-sm text-black/55">
                                  <input
                                    type="checkbox"
                                    checked={schedule.enabled}
                                    onChange={(event) =>
                                      updateSchedule(schedule.dayOfWeek, {
                                        enabled: event.target.checked,
                                        allDay: event.target.checked
                                          ? schedule.allDay
                                          : false,
                                        closesForLunch: event.target.checked
                                          ? schedule.closesForLunch
                                          : false,
                                        openingTime: event.target.checked
                                          ? schedule.openingTime
                                          : null,
                                        closingTime: event.target.checked
                                          ? schedule.closingTime
                                          : null,
                                        secondOpeningTime: event.target.checked
                                          ? schedule.secondOpeningTime
                                          : null,
                                        secondClosingTime: event.target.checked
                                          ? schedule.secondClosingTime
                                          : null,
                                      })
                                    }
                                    className="h-4 w-4 accent-teal-600"
                                  />
                                  Atendimento neste dia
                                </label>
                              </div>

                              {schedule.enabled ? (
                                <div className="flex flex-wrap items-center gap-4">
                                  <label className="flex items-center gap-2 text-sm font-medium text-black/60">
                                    <input
                                      type="checkbox"
                                      checked={schedule.allDay}
                                      onChange={(event) =>
                                        updateSchedule(schedule.dayOfWeek, {
                                          allDay: event.target.checked,
                                          closesForLunch: event.target.checked
                                            ? false
                                            : schedule.closesForLunch,
                                          openingTime: event.target.checked
                                            ? null
                                            : schedule.openingTime,
                                          closingTime: event.target.checked
                                            ? null
                                            : schedule.closingTime,
                                          secondOpeningTime: event.target.checked
                                            ? null
                                            : schedule.secondOpeningTime,
                                          secondClosingTime: event.target.checked
                                            ? null
                                            : schedule.secondClosingTime,
                                        })
                                      }
                                      className="h-4 w-4 accent-teal-600"
                                    />
                                    24 horas
                                  </label>

                                  {!schedule.allDay && (
                                    <label className="flex items-center gap-2 text-sm font-medium text-black/60">
                                      <input
                                        type="checkbox"
                                        checked={schedule.closesForLunch}
                                        onChange={(event) =>
                                          updateSchedule(schedule.dayOfWeek, {
                                            closesForLunch: event.target.checked,
                                            secondOpeningTime: event.target.checked
                                              ? schedule.secondOpeningTime
                                              : null,
                                            secondClosingTime: event.target.checked
                                              ? schedule.secondClosingTime
                                              : null,
                                          })
                                        }
                                        className="h-4 w-4 accent-teal-600"
                                      />
                                      Fecha para almoço
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <span className="w-fit rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/40">
                                  Fechado
                                </span>
                              )}
                            </div>

                            {schedule.enabled && !schedule.allDay && (
                              <div
                                className={`grid gap-3 ${
                                  schedule.closesForLunch
                                    ? "sm:grid-cols-2 xl:grid-cols-4"
                                    : "sm:grid-cols-2"
                                }`}
                              >
                                <label className="block">
                                  <span className="mb-1 block text-xs font-semibold text-black/45">
                                    Abertura
                                  </span>
                                  <input
                                    type="time"
                                    value={schedule.openingTime ?? ""}
                                    onChange={(event) =>
                                      updateSchedule(schedule.dayOfWeek, {
                                        openingTime: event.target.value || null,
                                      })
                                    }
                                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                  />
                                </label>

                                <label className="block">
                                  <span className="mb-1 block text-xs font-semibold text-black/45">
                                    {schedule.closesForLunch
                                      ? "Saída para almoço"
                                      : "Fechamento"}
                                  </span>
                                  <input
                                    type="time"
                                    value={schedule.closingTime ?? ""}
                                    onChange={(event) =>
                                      updateSchedule(schedule.dayOfWeek, {
                                        closingTime: event.target.value || null,
                                      })
                                    }
                                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                  />
                                </label>

                                {schedule.closesForLunch && (
                                  <>
                                    <label className="block">
                                      <span className="mb-1 block text-xs font-semibold text-black/45">
                                        Retorno
                                      </span>
                                      <input
                                        type="time"
                                        value={schedule.secondOpeningTime ?? ""}
                                        onChange={(event) =>
                                          updateSchedule(schedule.dayOfWeek, {
                                            secondOpeningTime:
                                              event.target.value || null,
                                          })
                                        }
                                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                      />
                                    </label>

                                    <label className="block">
                                      <span className="mb-1 block text-xs font-semibold text-black/45">
                                        Fechamento
                                      </span>
                                      <input
                                        type="time"
                                        value={schedule.secondClosingTime ?? ""}
                                        onChange={(event) =>
                                          updateSchedule(schedule.dayOfWeek, {
                                            secondClosingTime:
                                              event.target.value || null,
                                          })
                                        }
                                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                      />
                                    </label>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button
                    type="button"
                    onClick={openSectorsStep}
                    disabled={isSavingSchedules}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    Voltar
                  </button>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveSchedules}
                      disabled={isSavingSchedules || isLoadingSchedules || schedules.length !== 7}
                      className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/60 disabled:opacity-50"
                    >
                      {isSavingSchedules ? "Salvando..." : "Salvar horários"}
                    </button>

                    <button
                      type="button"
                      onClick={openWhatsAppStep}
                      disabled={isSavingSchedules || isLoadingSchedules}
                      className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                    >
                      Continuar para WhatsApp
                    </button>
                  </div>
                </div>
              </>
            ) : currentStep === 5 ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">
                    Conecte o WhatsApp da empresa
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-black/50">
                    Faça a leitura do QR Code com o WhatsApp que será usado no atendimento.
                    Depois da conexão, o M1M Connect reconhecerá o número automaticamente.
                  </p>
                </div>

                {whatsAppError && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {whatsAppError}
                  </div>
                )}

                <div className="mt-6">
                  {isLoadingWhatsApp ? (
                    <div className="space-y-3">
                      <div className="h-28 animate-pulse rounded-2xl bg-black/5" />
                      <div className="h-12 animate-pulse rounded-xl bg-black/5" />
                    </div>
                  ) : whatsAppStatus?.state === "CONNECTED" ? (
                    <div className="rounded-2xl border border-green-100 bg-green-50/70 p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-green-500" />
                            <p className="font-bold text-green-800">
                              WhatsApp conectado
                            </p>
                          </div>

                          {whatsAppStatus.profileName && (
                            <p className="mt-3 text-sm font-semibold text-[#171717]">
                              {whatsAppStatus.profileName}
                            </p>
                          )}

                          {whatsAppStatus.phone && (
                            <p className="mt-1 text-sm text-black/50">
                              Número: {whatsAppStatus.phone}
                            </p>
                          )}
                        </div>

                        <span className="w-fit rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                          Conectado
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-6">
                      <div className="flex flex-col items-start gap-6 md:flex-row">
                        <div className="flex-1">
                          <p className="font-bold text-[#171717]">
                            WhatsApp ainda não conectado
                          </p>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-black/50">
                            Clique no botão abaixo para gerar o QR Code. No celular,
                            abra o WhatsApp, acesse os aparelhos conectados e faça a leitura.
                          </p>

                          <button
                            type="button"
                            onClick={connectWhatsApp}
                            disabled={isConnectingWhatsApp}
                            className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                          >
                            {isConnectingWhatsApp && !whatsAppQrCode
                              ? "Gerando QR Code..."
                              : whatsAppQrCode
                                ? "Gerar novo QR Code"
                                : "Conectar WhatsApp"}
                          </button>
                        </div>

                        {whatsAppQrCode && (
                          <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
                            <img
                              src={whatsAppQrCode}
                              alt="QR Code para conectar o WhatsApp"
                              className="h-56 w-56 object-contain"
                            />
                            <p className="mt-3 text-center text-xs font-semibold text-black/40">
                              Escaneie com o WhatsApp
                            </p>
                          </div>
                        )}
                      </div>

                      {whatsAppPairingCode && (
                        <div className="mt-5 rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/35">
                            Código de pareamento
                          </p>
                          <p className="mt-1 font-mono text-lg font-bold tracking-wider text-[#171717]">
                            {whatsAppPairingCode}
                          </p>
                        </div>
                      )}

                      {(whatsAppQrCode || whatsAppStatus?.state === "CONNECTING") && (
                        <p className="mt-4 text-sm font-medium text-teal-600">
                          Aguardando a conexão do WhatsApp...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button
                    type="button"
                    onClick={openSchedulesStep}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03]"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    disabled={whatsAppStatus?.state !== "CONNECTED"}
                    onClick={openAIStep}
                    className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      whatsAppStatus?.state === "CONNECTED"
                        ? "Continuar"
                        : "Conecte o WhatsApp para continuar."
                    }
                  >
                    Continuar para IA
                  </button>
                </div>
              </>
            ) : currentStep === 6 ? (
              <>
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">
                    Atendimento com inteligência artificial
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-black/50">
                    A inteligência do M1M Connect já utiliza as informações da empresa,
                    dos setores e da equipe que você configurou nas etapas anteriores.
                    Aqui você decide apenas se o atendimento automático ficará ativo.
                  </p>
                </div>

                {aiError && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {aiError}
                  </div>
                )}

                {aiSuccess && (
                  <div className="mt-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {aiSuccess}
                  </div>
                )}

                <div className="mt-6">
                  {isLoadingAI ? (
                    <div className="space-y-3">
                      <div className="h-28 animate-pulse rounded-2xl bg-black/5" />
                      <div className="h-24 animate-pulse rounded-2xl bg-black/5" />
                    </div>
                  ) : (
                    <>
                      <div
                        className={`rounded-2xl border p-5 ${
                          aiEnabled
                            ? "border-emerald-100 bg-emerald-50/70"
                            : "border-black/[0.06] bg-[#fafafa]"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-3 w-3 rounded-full ${
                                  aiEnabled ? "bg-emerald-500" : "bg-black/20"
                                }`}
                              />
                              <p className="font-bold text-[#171717]">
                                {aiEnabled
                                  ? "Atendimento com IA ativo"
                                  : "Atendimento com IA desativado"}
                              </p>
                            </div>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
                              {aiEnabled
                                ? "A IA poderá atender os clientes usando somente as informações configuradas no M1M Connect."
                                : "A plataforma continuará disponível para atendimento humano, mas a IA não responderá automaticamente."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAiEnabled((current) => !current);
                              setAiError(null);
                              setAiSuccess(null);
                            }}
                            className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                              aiEnabled ? "bg-emerald-500" : "bg-black/15"
                            }`}
                            aria-pressed={aiEnabled}
                            aria-label={
                              aiEnabled
                                ? "Desativar atendimento com IA"
                                : "Ativar atendimento com IA"
                            }
                          >
                            <span
                              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                                aiEnabled ? "left-7" : "left-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/35">
                            Empresa
                          </p>
                          <p className="mt-2 text-sm font-bold text-[#171717]">
                            Informações principais
                          </p>
                          <p className="mt-1 text-sm leading-5 text-black/45">
                            Nome, apresentação, contatos e localização.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/35">
                            Setores
                          </p>
                          <p className="mt-2 text-sm font-bold text-[#171717]">
                            Contexto do atendimento
                          </p>
                          <p className="mt-1 text-sm leading-5 text-black/45">
                            Setor atual, descrição e conhecimento cadastrado.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/35">
                            Equipe
                          </p>
                          <p className="mt-2 text-sm font-bold text-[#171717]">
                            Responsáveis
                          </p>
                          <p className="mt-1 text-sm leading-5 text-black/45">
                            A IA reconhece quem está responsável por cada setor.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
                        <p className="text-sm font-bold text-teal-700">
                          Como a IA deve agir
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/50">
                          Ela fala em nome da empresa, responde apenas com as informações
                          disponíveis e encaminha para a equipe responsável quando não
                          encontrar uma resposta segura.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button
                    type="button"
                    onClick={openWhatsAppStep}
                    disabled={isSavingAI}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    Voltar
                  </button>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveAIConfiguration}
                      disabled={isSavingAI || isLoadingAI}
                      className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/60 disabled:opacity-50"
                    >
                      {isSavingAI ? "Salvando..." : "Salvar configuração"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(7)}
                      disabled={isSavingAI || isLoadingAI}
                      className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                    >
                      Continuar para finalizar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
                    ✓
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-[#171717]">
                    Tudo pronto para começar
                  </h3>

                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-black/50">
                    A configuração inicial da {data?.company.name || "empresa"} foi concluída.
                    Você poderá alterar qualquer informação depois na Central de Configurações.
                  </p>
                </div>

                {finishError && (
                  <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {finishError}
                  </div>
                )}

                <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold text-[#171717]">
                        Empresa
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-black/45">
                      Dados principais revisados.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold text-[#171717]">
                        Equipe e setores
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-black/45">
                      Estrutura inicial de atendimento preparada.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold text-[#171717]">
                        Horários
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-black/45">
                      Horário geral definido para a empresa.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          whatsAppStatus?.state === "CONNECTED"
                            ? "bg-emerald-500"
                            : "bg-teal-400"
                        }`}
                      />
                      <p className="text-sm font-bold text-[#171717]">
                        WhatsApp
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-black/45">
                      {whatsAppStatus?.state === "CONNECTED"
                        ? "Número conectado ao M1M Connect."
                        : "Conexão poderá ser concluída nas configurações."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          aiEnabled ? "bg-emerald-500" : "bg-black/20"
                        }`}
                      />
                      <p className="text-sm font-bold text-[#171717]">
                        Inteligência artificial
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-black/45">
                      {aiEnabled
                        ? "Atendimento com IA ativado."
                        : "Atendimento com IA mantido desativado."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/35">
                      Depois
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#171717]">
                      Ajustes continuam disponíveis
                    </p>
                    <p className="mt-1 text-sm leading-5 text-black/45">
                      Tudo pode ser refinado pela Central de Configurações.
                    </p>
                  </div>
                </div>

                <div className="mt-7 rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
                  <p className="text-sm font-bold text-teal-700">
                    Ao finalizar
                  </p>
                  <p className="mt-1 text-sm leading-6 text-black/50">
                    O M1M Connect encerrará esta configuração inicial e abrirá a plataforma normalmente.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.05] pt-6">
                  <button
                    type="button"
                    onClick={openAIStep}
                    disabled={isFinishingOnboarding}
                    className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-bold text-black/55 transition hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={finishOnboarding}
                    disabled={isFinishingOnboarding}
                    className="rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                  >
                    {isFinishingOnboarding
                      ? "Finalizando..."
                      : "Finalizar configuração"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

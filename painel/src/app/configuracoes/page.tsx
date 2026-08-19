"use client";

import { useEffect, useState } from "react";

import AutomaticMessagesSettings from "@/components/config/AutomaticMessagesSettings";
import CompanySchedulesSettings from "@/components/config/CompanySchedulesSettings";
import CompanyProfileSettings from "@/components/config/CompanyProfileSettings";
import HumanAttendanceSettings from "@/components/config/HumanAttendanceSettings";
import PaymentSettings from "@/components/config/PaymentSettings";
import SectorsSettings from "@/components/config/SectorsSettings";
import Sidebar from "@/components/layout/Sidebar";
import M1MCard from "@/components/m1m/M1MCard";
import M1MPageHeader from "@/components/m1m/M1MPageHeader";

type CompanyProfile = {
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
};

type CompanyFormData = {
  name: string;
  segment: string;
  presentation: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
};

const emptyForm: CompanyFormData = {
  name: "",
  segment: "",
  presentation: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
};

type ActiveSection =
  | "overview"
  | "company"
  | "sectors"
  | "companySchedules"
  | "companyProfile"
  | "payments"
  | "automaticMessages"
  | "humanAttendance";

type SectionIconName =
  | "company"
  | "sectors"
  | "users"
  | "schedule"
  | "messages"
  | "ai"
  | "payments"
  | "human"
  | "whatsapp";

type Section = {
  id:
    | ActiveSection
    | "companyProfile"
    | "payments"
    | "humanAttendance"
    | "users"
    | "whatsapp";
  title: string;
  description: string;
  enabled: boolean;
  icon: SectionIconName;
  actionLabel: string;
};

const sections: Section[] = [
  {
    id: "company",
    title: "Empresa",
    description:
      "Dados institucionais, endereço e canais oficiais.",
    enabled: true,
    icon: "company",
    actionLabel: "Abrir →",
  },
  {
    id: "sectors",
    title: "Setores",
    description:
      "Organize departamentos, encaminhamentos e responsáveis.",
    enabled: true,
    icon: "sectors",
    actionLabel: "Abrir →",
  },
  {
    id: "users",
    title: "Usuários e Permissões",
    description:
      "Gerencie colaboradores, acessos e permissões.",
    enabled: true,
    icon: "users",
    actionLabel: "Gerenciar →",
  },
  {
    id: "companySchedules",
    title: "Horário Geral",
    description:
      "Defina os dias e horários padrão de atendimento.",
    enabled: true,
    icon: "schedule",
    actionLabel: "Abrir →",
  },
  {
    id: "automaticMessages",
    title: "Mensagens Automáticas",
    description:
      "Configure mensagens enviadas fora do expediente.",
    enabled: true,
    icon: "messages",
    actionLabel: "Abrir →",
  },
  {
    id: "companyProfile",
    title: "Conhecimento da Empresa",
    description:
      "Ensine à IA as informações essenciais do negócio.",
    enabled: true,
    icon: "ai",
    actionLabel: "Configurar →",
  },
  {
    id: "payments",
    title: "Pagamentos",
    description:
      "Formas de pagamento, condições e orientações comerciais.",
    enabled: true,
    icon: "payments",
    actionLabel: "Abrir →",
  },
  {
    id: "humanAttendance",
    title: "Atendimento Humano",
    description:
      "Defina a transição entre equipe e atendimento automático.",
    enabled: true,
    icon: "human",
    actionLabel: "Abrir →",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description:
      "Conecte, desconecte ou reconecte o WhatsApp da empresa.",
    enabled: true,
    icon: "whatsapp",
    actionLabel: "Gerenciar →",
  },
];

function SectionIcon({
  name,
}: {
  name: SectionIconName;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };

  if (name === "company") {
    return (
      <svg {...commonProps}>
        <path d="M4 21V5.5L12 3v18M12 8h8v13M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" />
      </svg>
    );
  }

  if (name === "sectors") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="5" r="2.25" />
        <circle cx="6" cy="18" r="2.25" />
        <circle cx="18" cy="18" r="2.25" />
        <path d="M12 7.25v4.25M7.6 16.2 12 11.5l4.4 4.7" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 7.5a2.5 2.5 0 1 1 0 5M16 15a5 5 0 0 1 4.5 5" />
      </svg>
    );
  }

  if (name === "schedule") {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M3.5 10h17M12 13v3l2 1" />
      </svg>
    );
  }

  if (name === "messages") {
    return (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (name === "ai") {
    return (
      <svg {...commonProps}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.2 14.8A6 6 0 1 1 15.8 14.8C14.7 15.7 14 16.7 14 18h-4c0-1.3-.7-2.3-1.8-3.2Z" />
        <path d="M12 2V1M4.9 4.9 4.2 4.2M19.1 4.9l.7-.7M2 12H1M23 12h-1" />
      </svg>
    );
  }

  if (name === "payments") {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M3.5 9h17M8 14h3M15.5 14h1" />
      </svg>
    );
  }

  if (name === "whatsapp") {
    return (
      <svg {...commonProps}>
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.6a8.5 8.5 0 1 1 16-4.2Z" />
        <path d="M8.5 7.8c.4 3.8 3.9 7.3 7.7 7.7" />
        <path d="m8.5 7.8 1.8-.7 1.1 2.6-1.2 1.1M16.2 15.5l.7-1.8-2.6-1.1-1.1 1.2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0M17.5 5.5l1 1 2-2" />
    </svg>
  );
}

function toFormData(
  company: CompanyProfile,
): CompanyFormData {
  return {
    name: company.name ?? "",
    segment: company.segment ?? "",
    presentation: company.presentation ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zipCode: company.zipCode ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
    email: company.email ?? "",
    website: company.website ?? "",
    instagram: company.instagram ?? "",
  };
}

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>(
      "overview",
    );

  const [form, setForm] =
    useState<CompanyFormData>(emptyForm);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function loadCompany() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/company",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data =
        (await response.json()) as
          | CompanyProfile
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Não foi possível carregar a empresa.",
        );
      }

      setForm(
        toFormData(
          data as CompanyProfile,
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar a empresa.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection === "company") {
      void loadCompany();
    }
  }, [activeSection]);

  function updateField(
    field: keyof CompanyFormData,
    value: string,
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

    if (!form.name.trim()) {
      setError(
        "Informe o nome da empresa.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/company",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data =
        (await response.json()) as
          | CompanyProfile
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Não foi possível salvar a empresa.",
        );
      }

      setForm(
        toFormData(
          data as CompanyProfile,
        ),
      );

      setSuccess(
        "Informações da empresa salvas com sucesso.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar a empresa.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderField(
    label: string,
    field: keyof CompanyFormData,
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
          value={form[field]}
          maxLength={options?.maxLength}
          placeholder={options?.placeholder}
          onChange={(event) =>
            updateField(
              field,
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
        />
      </label>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <M1MPageHeader
              eyebrow="Configurações"
              title="Central de Configurações"
              description="Configure toda a operação da sua empresa em um único lugar."
              showBackButton={false}
            />
            {activeSection === "overview" ? (
              <>
                <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#087B7B]">
                    Tudo em um só lugar
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-[#171717]">
                    Ajuste o M1M Connect sem complicação
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
                    Escolha abaixo o que deseja configurar. Cada área foi organizada para ser simples, rápida e direta.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sections.map((section) => (
                    <M1MCard
                      key={section.title}
                      icon={
                        <SectionIcon
                          name={section.icon}
                        />
                      }
                      title={section.title}
                      description={
                        section.description
                      }
                      actionLabel={
                        section.actionLabel
                      }
                      disabled={
                        !section.enabled
                      }
                      onClick={() => {
                        if (!section.enabled) {
                          return;
                        }

                        if (
                          section.id === "users"
                        ) {
                          window.location.href =
                            "/configuracoes/usuarios";

                          return;
                        }

                        if (
                          section.id === "whatsapp"
                        ) {
                          window.location.href =
                            "/configuracoes/whatsapp";

                          return;
                        }

                        if (
                          section.id ===
                            "company" ||
                          section.id ===
                            "sectors" ||
                          section.id ===
                            "companySchedules" ||
                          section.id ===
                            "companyProfile" ||
                          section.id ===
                            "payments" ||
                          section.id ===
                            "automaticMessages" ||
                          section.id ===
                            "humanAttendance"
                        ) {
                          setActiveSection(
                            section.id,
                          );
                        }
                      }}
                    />
                  ))}
                </div>
              </>
            ) : activeSection === "sectors" ? (
              <SectorsSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "companySchedules" ? (
              <CompanySchedulesSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "companyProfile" ? (
              <CompanyProfileSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "payments" ? (
              <PaymentSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "automaticMessages" ? (
              <AutomaticMessagesSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : activeSection ===
              "humanAttendance" ? (
              <HumanAttendanceSettings
                onBack={() =>
                  setActiveSection(
                    "overview",
                  )
                }
              />
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(
                      "overview",
                    )
                  }
                  className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700"
                >
                  ← Voltar para configurações
                </button>

                <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
                  <div className="border-b border-black/5 p-6 lg:p-8">
                    <p className="text-sm font-semibold text-teal-600">
                      Empresa
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Informações da empresa
                    </h2>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
                      Estes dados serão utilizados pela IA para
                      apresentar a empresa e responder perguntas
                      sobre endereço, contatos e canais oficiais.
                    </p>
                  </div>

                  {isLoading ? (
                    <div className="p-8">
                      <div className="animate-pulse space-y-4">
                        <div className="h-12 rounded-xl bg-black/5" />
                        <div className="h-12 rounded-xl bg-black/5" />
                        <div className="h-28 rounded-xl bg-black/5" />
                        <div className="h-12 rounded-xl bg-black/5" />
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSave}
                      className="p-6 lg:p-8"
                    >
                      <div className="grid gap-5 md:grid-cols-2">
                        {renderField(
                          "Nome da empresa *",
                          "name",
                          {
                            placeholder:
                              "Ex.: Marketing1Minuto",
                          },
                        )}

                        {renderField(
                          "Segmento",
                          "segment",
                          {
                            placeholder:
                              "Ex.: Agência de marketing",
                          },
                        )}
                      </div>

                      <label className="mt-5 block">
                        <span className="mb-2 block text-sm font-semibold text-black/70">
                          Apresentação da empresa
                        </span>

                        <textarea
                          value={
                            form.presentation
                          }
                          onChange={(event) =>
                            updateField(
                              "presentation",
                              event.target.value,
                            )
                          }
                          rows={5}
                          placeholder="Explique de forma simples quem é a empresa, o que ela faz e como atende seus clientes."
                          className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                        />
                      </label>

                      <div className="mt-8">
                        <h3 className="text-base font-bold">
                          Localização
                        </h3>

                        <div className="mt-4 grid gap-5 md:grid-cols-2">
                          <div className="md:col-span-2">
                            {renderField(
                              "Endereço",
                              "address",
                              {
                                placeholder:
                                  "Rua, número e bairro",
                              },
                            )}
                          </div>

                          {renderField(
                            "Cidade",
                            "city",
                            {
                              placeholder:
                                "Ex.: Cáceres",
                            },
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {renderField(
                              "Estado",
                              "state",
                              {
                                placeholder:
                                  "Ex.: MT",
                                maxLength: 2,
                              },
                            )}

                            {renderField(
                              "CEP",
                              "zipCode",
                              {
                                placeholder:
                                  "00000-000",
                              },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h3 className="text-base font-bold">
                          Contatos
                        </h3>

                        <div className="mt-4 grid gap-5 md:grid-cols-2">
                          {renderField(
                            "Telefone",
                            "phone",
                            {
                              placeholder:
                                "(65) 0000-0000",
                            },
                          )}

                          {renderField(
                            "WhatsApp",
                            "whatsapp",
                            {
                              placeholder:
                                "(65) 90000-0000",
                            },
                          )}

                          {renderField(
                            "E-mail",
                            "email",
                            {
                              type: "email",
                              placeholder:
                                "contato@empresa.com.br",
                            },
                          )}

                          {renderField(
                            "Site",
                            "website",
                            {
                              placeholder:
                                "https://empresa.com.br",
                            },
                          )}

                          <div className="md:col-span-2">
                            {renderField(
                              "Instagram",
                              "instagram",
                              {
                                placeholder:
                                  "@empresa ou link do perfil",
                              },
                            )}
                          </div>
                        </div>
                      </div>

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
                            : "Salvar alterações"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

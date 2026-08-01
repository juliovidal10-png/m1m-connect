"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";

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

const sections = [
  {
    title: "Empresa",
    description:
      "Informações institucionais, apresentação, endereço, telefones e identidade da empresa.",
    enabled: true,
  },
  {
    title: "Setores",
    description:
      "Cadastre os departamentos e defina como cada cliente será encaminhado.",
    enabled: false,
  },
  {
    title: "Horários",
    description:
      "Dias, horários de funcionamento e regras fora do expediente.",
    enabled: false,
  },
  {
    title: "Mensagens automáticas",
    description:
      "Configure saudação, ausência e encerramento do atendimento.",
    enabled: false,
  },
  {
    title: "Inteligência Artificial",
    description:
      "Defina a personalidade, o comportamento e as regras da IA.",
    enabled: false,
  },
  {
    title: "Pagamentos",
    description:
      "Cadastre formas de pagamento, condições e informações comerciais.",
    enabled: false,
  },
  {
    title: "Atendimento Humano",
    description:
      "Configure a finalização automática e o retorno da IA após o atendimento humano.",
    enabled: false,
  },
];

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
    useState<"overview" | "company">(
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
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </label>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
              Configurações
            </p>

            <h1 className="mt-1 text-xl font-bold">
              Central de Configurações
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            {activeSection === "overview" ? (
              <>
                <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-orange-600">
                    Base de conhecimento da IA
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Configure sua empresa e ensine o M1M Connect a atender seus clientes
                  </h2>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-black/55">
                    Quanto mais informações forem cadastradas,
                    mais preciso, natural e inteligente será o
                    atendimento realizado pela IA.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sections.map((section) => (
                    <div
                      key={section.title}
                      className="flex min-h-52 flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                    >
                      <h3 className="text-base font-bold">
                        {section.title}
                      </h3>

                      <p className="mt-2 flex-1 text-sm leading-6 text-black/50">
                        {section.description}
                      </p>

                      <button
                        type="button"
                        disabled={!section.enabled}
                        onClick={() => {
                          if (
                            section.title ===
                            "Empresa"
                          ) {
                            setActiveSection(
                              "company",
                            );
                          }
                        }}
                        className={
                          section.enabled
                            ? "mt-5 w-fit rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                            : "mt-5 w-fit cursor-not-allowed rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/30"
                        }
                      >
                        {section.enabled
                          ? "Configurar"
                          : "Em breve"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(
                      "overview",
                    )
                  }
                  className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-orange-200 hover:text-orange-700"
                >
                  ← Voltar para configurações
                </button>

                <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
                  <div className="border-b border-black/5 p-6 lg:p-8">
                    <p className="text-sm font-semibold text-orange-600">
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
                          className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                          className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
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

"use client";

import {
  useEffect,
  useState,
} from "react";

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
  locationLink: string | null;
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
  locationLink: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
};

type CompanySettingsProps = {
  onBack: () => void;
  apiUrl?: string;
};

const emptyForm: CompanyFormData = {
  name: "",
  segment: "",
  presentation: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  locationLink: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
};

function formatBrazilianPhoneInput(
  value: string,
): string {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function toFormData(
  company: CompanyProfile,
): CompanyFormData {
  return {
    name: company.name ?? "",
    segment: company.segment ?? "",
    presentation:
      company.presentation ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zipCode: company.zipCode ?? "",
    locationLink:
      company.locationLink ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
    email: company.email ?? "",
    website: company.website ?? "",
    instagram: company.instagram ?? "",
  };
}

export default function CompanySettings({
  onBack,
  apiUrl = "/api/company",
}: CompanySettingsProps) {
  const [form, setForm] =
    useState<CompanyFormData>(emptyForm);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCompany() {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(
          apiUrl,
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

    void loadCompany();
  }, [apiUrl]);

  function updateField(
    field: keyof CompanyFormData,
    value: string,
  ) {
    const nextValue =
      field === "phone" ||
      field === "whatsapp"
        ? formatBrazilianPhoneInput(
            value,
          )
        : value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
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
        apiUrl,
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
          maxLength={
            options?.maxLength
          }
          placeholder={
            options?.placeholder
          }
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

                  <div className="md:col-span-2">
                    {renderField(
                      "Link da localização",
                      "locationLink",
                      {
                        placeholder:
                          "Cole o link oficial do Google Maps",
                      },
                    )}
                  </div>
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
  );
}

"use client";

import {
  useEffect,
  useState,
} from "react";

type CompanyProfileSettingsProps = {
  onBack: () => void;
};

type CompanyProfile = {
  id: string;
  companyId: string;
  presentation: string | null;
  differentials: string | null;
  productsServices: string | null;
  targetAudience: string | null;
  serviceArea: string | null;
  companyPolicies: string | null;
  importantInformation: string | null;
  frequentlyAskedQuestions: string | null;
  createdAt: string;
  updatedAt: string;
};

type CompanyProfileForm = {
  presentation: string;
  differentials: string;
  productsServices: string;
  targetAudience: string;
  serviceArea: string;
  companyPolicies: string;
  importantInformation: string;
  frequentlyAskedQuestions: string;
};

const emptyForm: CompanyProfileForm = {
  presentation: "",
  differentials: "",
  productsServices: "",
  targetAudience: "",
  serviceArea: "",
  companyPolicies: "",
  importantInformation: "",
  frequentlyAskedQuestions: "",
};

function toFormData(
  profile: CompanyProfile | null,
): CompanyProfileForm {
  return {
    presentation:
      profile?.presentation ?? "",
    differentials:
      profile?.differentials ?? "",
    productsServices:
      profile?.productsServices ?? "",
    targetAudience:
      profile?.targetAudience ?? "",
    serviceArea:
      profile?.serviceArea ?? "",
    companyPolicies:
      profile?.companyPolicies ?? "",
    importantInformation:
      profile?.importantInformation ?? "",
    frequentlyAskedQuestions:
      profile?.frequentlyAskedQuestions ?? "",
  };
}

export default function CompanyProfileSettings({
  onBack,
}: CompanyProfileSettingsProps) {
  const [form, setForm] =
    useState<CompanyProfileForm>(
      emptyForm,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/company-profile",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            | CompanyProfile
            | null
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            data &&
            typeof data === "object" &&
            "error" in data &&
            data.error
              ? data.error
              : "Não foi possível carregar o Perfil da Empresa.",
          );
        }

        setForm(
          toFormData(
            data as CompanyProfile | null,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o Perfil da Empresa.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, []);

  function updateField(
    field: keyof CompanyProfileForm,
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

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/company-profile",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                form,
              ),
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
          "error" in data &&
          data.error
            ? data.error
            : "Não foi possível salvar o Perfil da Empresa.",
        );
      }

      setForm(
        toFormData(
          data as CompanyProfile,
        ),
      );

      setSuccess(
        "Perfil da Empresa salvo com sucesso.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar o Perfil da Empresa.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderTextarea(
    label: string,
    field: keyof CompanyProfileForm,
    description: string,
    placeholder: string,
    rows = 5,
  ) {
    return (
      <label className="block">
        <span className="block text-sm font-semibold text-black/75">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-black/45">
          {description}
        </span>

        <textarea
          value={form[field]}
          onChange={(event) =>
            updateField(
              field,
              event.target.value,
            )
          }
          rows={rows}
          placeholder={placeholder}
          className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
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
            Base de conhecimento
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Perfil da Empresa
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Preencha as informações que a IA deve conhecer para apresentar a empresa,
            explicar seus diferenciais e responder perguntas institucionais com precisão.
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 lg:p-8">
            <div className="animate-pulse space-y-5">
              <div className="h-32 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
              <div className="h-32 rounded-xl bg-black/5" />
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="p-6 lg:p-8"
          >
            <div className="grid gap-6">
              {renderTextarea(
                "Apresentação da empresa",
                "presentation",
                "Explique quem é a empresa, sua história, atuação e forma de atender.",
                "Ex.: A empresa atua há mais de 20 anos oferecendo soluções com atendimento especializado.",
                6,
              )}

              {renderTextarea(
                "Diferenciais",
                "differentials",
                "Liste os principais motivos pelos quais o cliente deve escolher sua empresa.",
                "Ex.: Estoque próprio, entrega rápida, equipe especializada e atendimento próximo.",
              )}

              {renderTextarea(
                "Produtos e serviços",
                "productsServices",
                "Descreva os produtos, serviços e soluções oferecidos.",
                "Ex.: Peças agrícolas, manutenção, consultoria e suporte técnico.",
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {renderTextarea(
                  "Público atendido",
                  "targetAudience",
                  "Informe os principais tipos de clientes atendidos.",
                  "Ex.: Produtores rurais, fazendas, empresas e pessoas físicas.",
                  5,
                )}

                {renderTextarea(
                  "Região de atendimento",
                  "serviceArea",
                  "Informe cidades, estados ou regiões atendidas.",
                  "Ex.: Cáceres, Cuiabá, todo Mato Grosso e atendimento nacional.",
                  5,
                )}
              </div>

              {renderTextarea(
                "Políticas da empresa",
                "companyPolicies",
                "Registre regras sobre garantia, trocas, devoluções, prazos e demais políticas.",
                "Ex.: Trocas mediante análise, garantia conforme fabricante e prazos sujeitos à disponibilidade.",
              )}

              {renderTextarea(
                "Informações importantes",
                "importantInformation",
                "Inclua orientações que a IA deve considerar antes de responder ao cliente.",
                "Ex.: Orçamentos sem compromisso. Não realizamos instalação. Produtos sujeitos à disponibilidade.",
              )}

              {renderTextarea(
                "Perguntas frequentes",
                "frequentlyAskedQuestions",
                "Cadastre perguntas comuns e as informações que ajudam a respondê-las.",
                "Ex.: Como solicitar orçamento? Vocês emitem nota fiscal? Qual é o prazo de entrega?",
                6,
              )}
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
                  : "Salvar Perfil da Empresa"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

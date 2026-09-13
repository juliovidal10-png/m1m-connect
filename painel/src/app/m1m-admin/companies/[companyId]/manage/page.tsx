"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import CompanyProfileSettings from "@/components/config/CompanyProfileSettings";
import CompanySchedulesSettings from "@/components/config/CompanySchedulesSettings";
import CompanySettings from "@/components/config/CompanySettings";
import PaymentSettings from "@/components/config/PaymentSettings";

type CompanyResponse = {
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
};

type ActiveSection =
  | "overview"
  | "company"
  | "companyProfile"
  | "companySchedules"
  | "payments";

const sections: Array<{
  id: Exclude<ActiveSection, "overview">;
  title: string;
  description: string;
}> = [
  {
    id: "company",
    title: "Empresa",
    description:
      "Dados institucionais, endereço, contatos e canais oficiais.",
  },
  {
    id: "companyProfile",
    title: "Conhecimento da Empresa",
    description:
      "Informações que a IA utiliza para conhecer o negócio e responder clientes.",
  },
  {
    id: "companySchedules",
    title: "Horário Geral",
    description:
      "Dias e horários padrão de atendimento da empresa.",
  },
  {
    id: "payments",
    title: "Pagamentos",
    description:
      "Formas de pagamento, PIX, dados bancários e orientações comerciais.",
  },
];

export default function M1MAdminManageCompanyPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;

  const [companyName, setCompanyName] =
    useState("Carregando...");
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("overview");

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        const response = await fetch(
          `/api/admin/companies/${companyId}`,
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as CompanyResponse;

        if (!response.ok || !data.company) {
          throw new Error(
            data.error ||
              "Não foi possível carregar a empresa.",
          );
        }

        if (!cancelled) {
          setCompanyName(data.company.name);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar a empresa.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const backToOverview = () =>
    setActiveSection("overview");

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                M1M Admin
              </p>

              <h1 className="mt-2 text-2xl font-bold">
                Gerenciar empresa
              </h1>

              <div className="mt-4 inline-flex rounded-xl border border-[#0A9090]/20 bg-[#0A9090]/5 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087B7B]">
                  GERENCIANDO:{" "}
                  <span className="normal-case tracking-normal">
                    {loading
                      ? "Carregando..."
                      : companyName}
                  </span>
                </p>
              </div>
            </div>

            <Link
              href="/m1m-admin"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/55 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
            >
              Voltar ao M1M Admin
            </Link>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : activeSection === "overview" ? (
            <>
              <div className="mt-7 rounded-2xl border border-black/5 bg-[#fafafa] p-6">
                <p className="text-sm font-bold">
                  Configuração administrativa da empresa
                </p>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-black/45">
                  Configure os dados operacionais desta
                  empresa sem acessar a conta do cliente.
                  Cada alteração abaixo é aplicada somente à
                  empresa indicada no topo desta página.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(section.id)
                    }
                    className="group rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:border-[#0A9090]/25 hover:shadow-md"
                  >
                    <p className="text-sm font-bold text-[#171717]">
                      {section.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-black/45">
                      {section.description}
                    </p>

                    <span className="mt-5 inline-flex text-xs font-bold text-[#087B7B]">
                      Abrir →
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-5 break-all text-xs font-medium text-black/30">
                Empresa ID: {companyId}
              </p>
            </>
          ) : activeSection === "company" ? (
            <div className="mt-7">
              <CompanySettings
                onBack={backToOverview}
                apiUrl={`/api/admin/companies/${companyId}/profile`}
              />
            </div>
          ) : activeSection === "companyProfile" ? (
            <div className="mt-7">
              <CompanyProfileSettings
                onBack={backToOverview}
                apiUrl={`/api/admin/companies/${companyId}/company-profile`}
              />
            </div>
          ) : activeSection === "companySchedules" ? (
            <div className="mt-7">
              <CompanySchedulesSettings
                onBack={backToOverview}
                apiUrl={`/api/admin/companies/${companyId}/schedules`}
              />
            </div>
          ) : (
            <div className="mt-7">
              <PaymentSettings
                onBack={backToOverview}
                apiUrl={`/api/admin/companies/${companyId}/payment-settings`}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type CompanyResponse = {
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
};

export default function M1MAdminManageCompanyPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;

  const [companyName, setCompanyName] = useState("Carregando...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        const response = await fetch(`/api/admin/companies/${companyId}`, {
          cache: "no-store",
        });

        const data = (await response.json()) as CompanyResponse;

        if (!response.ok || !data.company) {
          throw new Error(
            data.error || "Não foi possível carregar a empresa.",
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

  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                M1M Admin
              </p>
              <h1 className="mt-2 text-2xl font-bold">Gerenciar empresa</h1>
              <div className="mt-4 inline-flex rounded-xl border border-[#0A9090]/20 bg-[#0A9090]/5 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087B7B]">
                  GERENCIANDO:{" "}
                  <span className="normal-case tracking-normal">
                    {loading ? "Carregando..." : companyName}
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
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-black/10 bg-[#fafafa] p-6">
              <p className="text-sm font-bold">
                Contexto administrativo da empresa ativo.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">
                Este é o ponto seguro de entrada da TF5. As configurações operacionais serão conectadas nos próximos blocos usando o companyId desta rota, sem trocar a sessão do cliente.
              </p>
              <p className="mt-4 break-all text-xs font-medium text-black/35">
                Empresa ID: {companyId}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

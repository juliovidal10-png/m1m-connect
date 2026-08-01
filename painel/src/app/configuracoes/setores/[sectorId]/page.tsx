"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";

type Sector = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const modules = [
  {
    title: "Responsáveis",
    icon: "👥",
    description:
      "Defina quais colaboradores podem atender neste setor.",
    status: "Nenhum responsável",
  },
  {
    title: "Horários",
    icon: "🕒",
    description:
      "Configure os dias e horários de funcionamento do setor.",
    status: "Não configurado",
  },
  {
    title: "Inteligência Artificial",
    icon: "🤖",
    description:
      "Defina como a IA deve atuar nas conversas deste setor.",
    status: "Não configurada",
  },
  {
    title: "Base de Conhecimento",
    icon: "📚",
    description:
      "Cadastre serviços, informações e respostas utilizadas pela IA.",
    status: "Nenhum item",
  },
  {
    title: "Encaminhamento",
    icon: "➡️",
    description:
      "Configure quando e para quem as conversas devem ser encaminhadas.",
    status: "Nenhuma regra",
  },
  {
    title: "Configurações do Setor",
    icon: "⚙️",
    description:
      "Edite nome, descrição, ordem de exibição e situação do setor.",
    status: "Disponível em breve",
  },
];

export default function SectorWorkspacePage() {
  const params = useParams<{
    sectorId: string;
  }>();

  const sectorId = params.sectorId;

  const [sector, setSector] =
    useState<Sector | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadSector() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sectors/${sectorId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as
          | Sector
          | {
              error?: string;
            };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Não foi possível carregar o setor.",
          );
        }

        setSector(data as Sector);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o setor.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (sectorId) {
      void loadSector();
    }
  }, [sectorId]);

  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 py-4 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
              Workspace Administrativo
            </p>

            <h1 className="mt-1 text-xl font-bold">
              Workspace do Setor
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-black/40">
              <Link
                href="/configuracoes"
                className="transition hover:text-orange-600"
              >
                Central de Configurações
              </Link>

              <span>›</span>

              <Link
                href="/configuracoes"
                className="transition hover:text-orange-600"
              >
                Setores
              </Link>

              <span>›</span>

              <span className="text-black/70">
                {sector?.name ?? "Carregando..."}
              </span>
            </div>

            {isLoading ? (
              <div className="mt-6 space-y-5">
                <div className="h-52 animate-pulse rounded-2xl bg-white" />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-48 animate-pulse rounded-2xl bg-white"
                      />
                    ),
                  )}
                </div>
              </div>
            ) : error || !sector ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-bold text-red-700">
                  Não foi possível abrir o setor
                </h2>

                <p className="mt-2 text-sm text-red-600">
                  {error ||
                    "Setor não encontrado."}
                </p>

                <Link
                  href="/configuracoes"
                  className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white"
                >
                  Voltar para configurações
                </Link>
              </div>
            ) : (
              <>
                <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                          🏪
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-orange-600">
                            Setor da empresa
                          </p>

                          <h2 className="mt-1 text-3xl font-bold">
                            {sector.name}
                          </h2>
                        </div>
                      </div>

                      <p className="mt-5 max-w-3xl text-sm leading-7 text-black/55">
                        {sector.description ||
                          "Nenhuma descrição cadastrada para este setor."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          sector.active
                            ? "rounded-full bg-green-50 px-4 py-2 text-xs font-bold text-green-700"
                            : "rounded-full bg-black/5 px-4 py-2 text-xs font-bold text-black/40"
                        }
                      >
                        {sector.active
                          ? "Setor ativo"
                          : "Setor inativo"}
                      </span>

                      <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700">
                        Ordem {sector.sortOrder}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="mt-6">
                  <div>
                    <p className="text-sm font-semibold text-orange-600">
                      Módulos do setor
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Gerencie o funcionamento do setor
                    </h2>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => (
                      <article
                        key={module.title}
                        className="flex min-h-56 flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
                          {module.icon}
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                          {module.title}
                        </h3>

                        <p className="mt-2 flex-1 text-sm leading-6 text-black/50">
                          {module.description}
                        </p>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/5 pt-4">
                          <span className="text-xs font-semibold text-black/35">
                            {module.status}
                          </span>

                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-black/25"
                          >
                            Em breve
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

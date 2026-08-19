"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import SectorBasicSettings from "@/components/sector/SectorBasicSettings";
import SectorKeywordsSettings from "@/components/sector/SectorKeywordsSettings";
import SectorKnowledgeSettings from "@/components/sector/SectorKnowledgeSettings";
import SectorUsersSettings from "@/components/sector/SectorUsersSettings";

type Sector = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  knowledge: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceView =
  | "overview"
  | "responsibles"
  | "knowledge"
  | "routing"
  | "settings";

const modules = [
  {
    id: "responsibles",
    title: "Responsáveis",
    icon: "users",
    description:
      "Defina quais colaboradores podem atender e assumir conversas neste setor.",
  },
  {
    id: "knowledge",
    title: "Base de Conhecimento",
    icon: "book",
    description:
      "Cadastre todas as informações que a IA precisa conhecer sobre este setor para responder corretamente aos clientes.",
  },
  {
    id: "routing",
    title: "Encaminhamento Automático",
    icon: "routing",
    description:
      "Informe palavras e expressões que identificam quando uma conversa deve ser enviada para este setor.",
  },
  {
    id: "settings",
    title: "Configurações do Setor",
    icon: "settings",
    description:
      "Edite o nome, a descrição, a ordem de exibição e a situação deste setor.",
  },
] as const;

type ModuleIconName =
  | "users"
  | "book"
  | "routing"
  | "settings";

function ModuleIcon({
  type,
}: {
  type: ModuleIconName;
}) {
  const className = "h-5 w-5";

  if (type === "users") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <circle
          cx="9"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.5 19c.6-3.1 2.5-4.8 5.5-4.8s4.9 1.7 5.5 4.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M15.5 5.5a2.8 2.8 0 0 1 0 5.5M16.5 14.5c2.1.4 3.4 1.8 4 4.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "book") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "routing") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M5 6h5a4 4 0 0 1 4 4v8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 18h5a4 4 0 0 0 4-4V9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m17 15 3 3-3 3M17 3l3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.7a7.8 7.8 0 0 0 0-3.4l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-3-1.7L13.7 2h-3.9l-.4 2.7a7.5 7.5 0 0 0-3 1.7l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3.4l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 3 1.7l.4 2.7h3.9l.4-2.7a7.5 7.5 0 0 0 3-1.7l2.4 1 2-3.4-2.1-1.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path
        d="M4 20V8.5L12 4l8 4.5V20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 20v-5h8v5M8 10h.01M12 10h.01M16 10h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SectorWorkspacePage() {
  const params = useParams<{
    sectorId: string;
  }>();

  const sectorId = params.sectorId;

  const [sector, setSector] =
    useState<Sector | null>(null);

  const [activeView, setActiveView] =
    useState<WorkspaceView>("overview");

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

  function openModule(
    moduleId: WorkspaceView,
  ) {
    setActiveView(moduleId);
  }

  function getActiveViewLabel() {
    if (activeView === "responsibles") {
      return "Responsáveis";
    }

    if (activeView === "knowledge") {
      return "Base de Conhecimento";
    }

    if (activeView === "routing") {
      return "Encaminhamento Automático";
    }

    if (activeView === "settings") {
      return "Configurações do Setor";
    }

    return null;
  }

  const activeViewLabel =
    getActiveViewLabel();

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
                className="transition hover:text-teal-600"
              >
                Central de Configurações
              </Link>

              <span>›</span>

              <Link
                href="/configuracoes"
                className="transition hover:text-teal-600"
              >
                Setores
              </Link>

              <span>›</span>

              <button
                type="button"
                onClick={() =>
                  setActiveView("overview")
                }
                className={
                  activeView === "overview"
                    ? "font-semibold text-black/70"
                    : "transition hover:text-teal-600"
                }
              >
                {sector?.name ?? "Carregando..."}
              </button>

              {activeViewLabel && (
                <>
                  <span>›</span>

                  <span className="font-semibold text-black/70">
                    {activeViewLabel}
                  </span>
                </>
              )}
            </div>

            {isLoading ? (
              <div className="mt-6 space-y-5">
                <div className="h-52 animate-pulse rounded-2xl bg-white" />

                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map(
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
            ) : activeView ===
              "responsibles" ? (
              <div className="mt-6">
                <SectorUsersSettings
                  sectorId={sectorId}
                  onBack={() =>
                    setActiveView("overview")
                  }
                />
              </div>
            ) : activeView ===
              "knowledge" ? (
              <div className="mt-6">
                <SectorKnowledgeSettings
                  sectorId={sectorId}
                  sectorName={sector.name}
                  onBack={() =>
                    setActiveView("overview")
                  }
                  onSaved={(knowledge) =>
                    setSector(
                      (currentSector) =>
                        currentSector
                          ? {
                              ...currentSector,
                              knowledge,
                            }
                          : currentSector,
                    )
                  }
                />
              </div>
            ) : activeView ===
              "routing" ? (
              <div className="mt-6">
                <SectorKeywordsSettings
                  sectorId={sectorId}
                  sectorName={sector.name}
                  onBack={() =>
                    setActiveView("overview")
                  }
                />
              </div>
            ) : activeView ===
              "settings" ? (
              <div className="mt-6">
                <SectorBasicSettings
                  sector={sector}
                  onBack={() =>
                    setActiveView("overview")
                  }
                  onSaved={(savedSector) =>
                    setSector(
                      (currentSector) =>
                        currentSector
                          ? {
                              ...currentSector,
                              ...savedSector,
                            }
                          : currentSector,
                    )
                  }
                />
              </div>
            ) : (
              <>
                <section className="mt-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm lg:p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.025] text-black/55">
                          <SectorIcon />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-teal-600">
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

                      <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                        Ordem {sector.sortOrder}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="mt-6">
                  <div>
                    <p className="text-sm font-semibold text-teal-600">
                      Módulos
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Gerencie este setor
                    </h2>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {modules.map((module) => (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() =>
                          openModule(
                            module.id,
                          )
                        }
                        className="group flex min-h-44 cursor-pointer flex-col rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/[0.025] text-black/55">
                          <ModuleIcon
                            type={module.icon}
                          />
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                          {module.title}
                        </h3>

                        <p className="mt-2 flex-1 text-sm leading-6 text-black/50">
                          {module.description}
                        </p>

                        <div className="mt-5 border-t border-black/5 pt-4">
                          <span className="text-sm font-bold text-teal-600 transition group-hover:text-teal-700">
                            Abrir módulo →
                          </span>
                        </div>
                      </button>
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

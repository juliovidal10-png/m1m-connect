"use client";
import { createPortal } from "react-dom";

import {
  useCallback,
  useState,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import CentralPendencias from "./CentralPendencias";

type MenuItem = {
  label: string;
  href?: string;
  disabled?: boolean;
  icon:
    | "overview"
    | "conversations"
    | "contacts"
    | "calendar"
    | "crm"
    | "finance"
    | "settings";
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Geral",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "overview",
      },
    ],
  },
  {
    title: "Atendimento",
    items: [
      {
        label: "Conversas",
        href: "/",
        icon: "conversations",
      },
      {
        label: "Agenda Operacional",
        href: "/agenda",
        icon: "calendar",
      },
      {
        label: "Contatos",
        href: "/clientes",
        icon: "contacts",
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "CRM",
        href: "/crm",
        icon: "crm",
      },
      {
        label: "Financeiro",
        href: "/financeiro",
        icon: "finance",
      },
    ],
  },
  {
    title: "Administração",
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: "settings",
      },
    ],
  },
];

function MenuIcon({
  type,
}: {
  type: MenuItem["icon"];
}) {
  const className =
    "h-[18px] w-[18px] shrink-0";

  if (type === "overview") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="14" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (type === "conversations") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M5.5 5.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7.8L6 20v-3.5h-.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 9h9M7.5 12.5h6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "contacts") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <circle
          cx="12"
          cy="8"
          r="3.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8 3.5v4M16 3.5v4M3.5 10h17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "crm") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <circle
          cx="8"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.5 19a5.5 5.5 0 0 1 9 0M15 7h5M15 12h5M15 17h5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "finance") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <rect
          x="3.5"
          y="5"
          width="17"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.5 9h17M8 14h3M15.5 14h1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
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

function isItemActive(
  pathname: string,
  href?: string,
) {
  if (!href) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [
    agendaSummary,
    setAgendaSummary,
  ] = useState({
    today: 0,
    overdue: 0,
  });
  const [
    conversationsWaitingCount,
    setConversationsWaitingCount,
  ] = useState<number | null>(null);
  const [waitingCountStatus, setWaitingCountStatus] = useState<"loading" | "current" | "stale" | "unavailable">("loading");
  // TF3: total de conversas do menu, independente do alerta TF2.
  const [conversationsTotalCount, setConversationsTotalCount] = useState<number | null>(null);
  const [totalCountStatus, setTotalCountStatus] = useState<"loading" | "current" | "stale" | "unavailable">("loading");
  const floatingAlertRef = useRef<HTMLDivElement | null>(null);
  const floatingDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<{ x: number; y: number } | null>(null);

  const clampFloatingPosition = useCallback((x: number, y: number) => {
    const width = floatingAlertRef.current?.offsetWidth ?? Math.min(380, window.innerWidth - 24);
    const height = floatingAlertRef.current?.offsetHeight ?? 80;
    const margin = 12;
    return {
      x: Math.max(margin, Math.min(x, Math.max(margin, window.innerWidth - width - margin))),
      y: Math.max(margin, Math.min(y, Math.max(margin, window.innerHeight - height - margin))),
    };
  }, []);

  useEffect(() => {
    const keepInsideWindow = () => {
      setFloatingPosition((previous) => {
        if (!floatingAlertRef.current) return previous;
        if (previous) return clampFloatingPosition(previous.x, previous.y);
        const rect = floatingAlertRef.current.getBoundingClientRect();
        return clampFloatingPosition(rect.left, rect.top);
      });
    };
    keepInsideWindow();
    window.addEventListener("resize", keepInsideWindow);
    return () => window.removeEventListener("resize", keepInsideWindow);
  }, [clampFloatingPosition, conversationsWaitingCount]);

  const handleFloatingPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const rect = event.currentTarget.getBoundingClientRect();
    floatingDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFloatingPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = floatingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setFloatingPosition(clampFloatingPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY));
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFloatingPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (floatingDragRef.current?.pointerId !== event.pointerId) return;
    floatingDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.stopPropagation();
  };

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const refreshWaitingCount = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;

      try {
        const response = await fetch("/api/chat/list?waitingCount=1", {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Falha na consulta da fila Aguardando");

        const data = await response.json();
        const count = Number(data.waitingCount);

        if (!Number.isInteger(count) || count < 0) throw new Error("Contagem invalida");
        if (!cancelled) {
          setConversationsWaitingCount(count);
          setWaitingCountStatus("current");
        }
      } catch {
        if (!cancelled) {
          setWaitingCountStatus((previous) => previous === "current" || previous === "stale" ? "stale" : "unavailable");
        }
      } finally {
        inFlight = false;
      }
    };

    void refreshWaitingCount();

    const timer = window.setInterval(() => {
      void refreshWaitingCount();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const refreshTotalCount = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/chat/list?totalCount=1", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha na consulta do total de conversas");
        const data = await response.json();
        const count = Number(data.totalCount);
        if (!Number.isSafeInteger(count) || count < 0) throw new Error("Total de conversas invalido");
        if (!cancelled) {
          setConversationsTotalCount(count);
          setTotalCountStatus("current");
        }
      } catch {
        if (!cancelled) {
          setTotalCountStatus((previous) => previous === "current" || previous === "stale" ? "stale" : "unavailable");
        }
      } finally {
        inFlight = false;
      }
    };
    void refreshTotalCount();
    const timer = window.setInterval(() => { void refreshTotalCount(); }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "DELETE",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  const handleAgendaSummaryChange =
    useCallback(
      (summary: {
        today: number;
        overdue: number;
      }) => {
        setAgendaSummary(summary);
      },
      [],
    );

  return (
    <>
      {!mobileOpen && (
        <button type="button" aria-label="Abrir menu de navegacao" aria-expanded={mobileOpen} aria-controls="m1m-sidebar-navigation" onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white text-black shadow-sm md:hidden">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      )}
      {mobileOpen && (
        <button type="button" aria-label="Fechar menu de navegacao" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 md:hidden" />
      )}
      <aside id="m1m-sidebar-navigation" className={`fixed inset-y-0 left-0 z-50 grid h-[100dvh] w-72 shrink-0 grid-rows-[94px_1px_minmax(0,1fr)_auto_auto] overflow-hidden border-r border-black/10 bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button type="button" aria-label="Fechar menu de navegacao" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-black/60 transition hover:bg-black/[0.04] hover:text-black md:hidden">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      <div className="flex h-[94px] w-full shrink-0 items-center justify-center px-4">
        <img
          src="/m1m-sidebar-logo.svg"
          alt="M1M Connect"
          className="block h-auto w-full max-w-[256px] object-contain object-center"
        />
      </div>
      <div className="h-px w-full shrink-0 bg-[#d9dde2]" aria-hidden="true" />

      <nav className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
        <div className="space-y-5">
          {menuSections.map((section) => (
            <section key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    isItemActive(
                      pathname,
                      item.href,
                    );

                  const baseClassName =
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

                  if (
                    item.disabled ||
                    !item.href
                  ) {
                    return (
                      <div
                        key={item.label}
                        aria-disabled="true"
                        title="Disponível em breve"
                        className={`${baseClassName} cursor-not-allowed text-black/30`}
                      >
                        <MenuIcon
                          type={item.icon}
                        />

                        <span className="min-w-0 flex-1">
                          {item.label}
                        </span>

                        <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/30">
                          Em breve
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={
                        active
                          ? `${baseClassName} bg-black/[0.07] font-semibold text-black`
                          : `${baseClassName} text-black/60 hover:bg-black/[0.04] hover:text-black`
                      }
                    >
                      <MenuIcon
                        type={item.icon}
                      />

                      <span className="min-w-0 flex-1">
                        {item.label}
                      </span>

                      {item.href === "/" && totalCountStatus !== "current" && (
                        <span
                          title={totalCountStatus === "stale" ? "Ultimo total conhecido; atualizacao indisponivel" : "Total de conversas indisponivel"}
                          className="text-[10px] font-semibold text-amber-700"
                        >!</span>
                      )}

                      {item.href === "/" && conversationsTotalCount !== null && (
                        <span
                          title={`${totalCountStatus === "stale" ? "Ultimo total conhecido: " : ""}${conversationsTotalCount} conversa${conversationsTotalCount === 1 ? "" : "s"} na aba Todas`}
                          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A9090] px-1.5 text-[10px] font-bold text-white"
                        >
                          {conversationsTotalCount}
                        </span>
                      )}

                      {item.href ===
                        "/agenda" &&
                        agendaSummary.today >
                          0 && (
                          <span
                            title={`${agendaSummary.today} compromisso${
                              agendaSummary.today === 1
                                ? ""
                                : "s"
                            } para hoje${
                              agendaSummary.overdue > 0
                                ? ` · ${agendaSummary.overdue} atrasado${
                                    agendaSummary.overdue === 1
                                      ? ""
                                      : "s"
                                  }`
                                : ""
                            }`}
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                              agendaSummary.overdue >
                              0
                                ? "bg-red-600 text-white"
                                : active
                                  ? "bg-black text-white"
                                  : "bg-[#0A9090]/10 text-[#0A9090]"
                            }`}
                          >
                            {agendaSummary.today >
                            99
                              ? "99+"
                              : agendaSummary.today}
                          </span>
                        )}

</Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="shrink-0 space-y-1 px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);

            if (isItemActive(pathname, "/ajuda")) {
              router.back();
              return;
            }

            router.push("/ajuda");
          }}
          className={
            isItemActive(pathname, "/ajuda")
              ? "flex w-full items-center gap-3 rounded-xl bg-black/[0.07] px-3 py-2.5 text-sm font-semibold text-black transition"
              : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-[18px] w-[18px] shrink-0"
          >
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9.8 9.2a2.35 2.35 0 1 1 3.55 2.02c-.9.55-1.35 1.05-1.35 2.03" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="16.8" r=".9" fill="currentColor" />
          </svg>

          <span className="min-w-0 flex-1 text-left">Ajuda</span>
        </button>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-[18px] w-[18px] shrink-0"
          >
            <path
              d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M13.5 8.5 17 12l-3.5 3.5M17 12H9"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span className="min-w-0 flex-1 text-left">Sair</span>
        </button>
      </div>
      <div className="border-t border-black/10">
        <CentralPendencias
          onAgendaSummaryChange={
            handleAgendaSummaryChange
          }
        />
      </div>
      </aside>
      {/* TF2_AVISO_VISUAL_PERSISTENTE: unico portal fora do link de navegacao */}
                      {(conversationsWaitingCount ?? 0) > 0 &&
        typeof document !== "undefined" &&
                        createPortal(
                          <div
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            ref={floatingAlertRef}
                            onPointerDown={handleFloatingPointerDown}
                            onPointerMove={handleFloatingPointerMove}
                            onPointerUp={handleFloatingPointerEnd}
                            onPointerCancel={handleFloatingPointerEnd}
                            onClick={(event) => event.stopPropagation()}
                            style={floatingPosition ? { left: floatingPosition.x, top: floatingPosition.y, right: "auto", bottom: "auto" } : undefined}
                            className="pointer-events-auto fixed top-24 right-3 z-[100] w-[calc(100vw-1.5rem)] cursor-grab touch-none select-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-lg active:cursor-grabbing sm:top-5 sm:right-5 sm:w-[min(380px,calc(100vw-2.5rem))]"
                          >
                            <div className="flex items-center gap-3">
                              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                  <path d="M12 9v4" />
                                  <path d="M12 17h.01" />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-5">
                                  Clientes aguardando
                                </p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                                  Atendimento humano necessário
                                </p>
                              </div>
                            </div>
                          </div>,
                          document.body,
                        )}
    </>
  );
}



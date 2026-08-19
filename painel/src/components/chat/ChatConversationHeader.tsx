"use client";

import AttendanceActions from "./AttendanceActions";

import type {
  KeyboardEvent,
  RefObject,
} from "react";

type ChatConversationHeaderProps = {
  customerName: string;
  phone: string;
  company?: string | null;
  responsible?: string | null;
  attendanceStatus?: string | null;
  attendanceId?: string | null;
  attendanceState?: string | null;
  attendanceSectorId?: string | null;
  lastInteraction?: string | null;
  isSearchOpen: boolean;
  searchQuery: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  matchCount: number;
  activeMatchIndex: number;
  onSearchQueryChange: (value: string) => void;
  onSearchKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
  ) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onPreviousMatch: () => void;
  onNextMatch: () => void;
  isCustomerPanelOpen: boolean;
  onToggleCustomerPanel: () => void;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatHeaderInteraction(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function ChatConversationHeader({
  customerName,
  phone,
  company,
  responsible,
  attendanceStatus,
  attendanceId,
  attendanceState,
  attendanceSectorId,
  lastInteraction,
  isSearchOpen,
  searchQuery,
  searchInputRef,
  matchCount,
  activeMatchIndex,
  onSearchQueryChange,
  onSearchKeyDown,
  onOpenSearch,
  onCloseSearch,
  onPreviousMatch,
  onNextMatch,
  isCustomerPanelOpen,
  onToggleCustomerPanel,
}: ChatConversationHeaderProps) {
  return (
    <header className="flex min-h-20 shrink-0 items-center justify-between gap-4 border-b border-black/5 bg-white px-6 py-3">
      {isSearchOpen ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f8] px-3">
            <span className="shrink-0 text-black/45">
              <SearchIcon />
            </span>

            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) =>
                onSearchQueryChange(
                  event.target.value,
                )
              }
              onKeyDown={onSearchKeyDown}
              placeholder="Pesquisar nesta conversa"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
            />
          </div>

          <span className="min-w-[64px] text-center text-xs font-medium text-black/45">
            {searchQuery.trim()
              ? matchCount > 0
                ? `${activeMatchIndex + 1} de ${matchCount}`
                : "0 de 0"
              : ""}
          </span>

          <button
            type="button"
            onClick={onPreviousMatch}
            disabled={matchCount === 0}
            title="Resultado anterior"
            aria-label="Resultado anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="m6 15 6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onNextMatch}
            disabled={matchCount === 0}
            title="Próximo resultado"
            aria-label="Próximo resultado"
            className="flex h-10 w-10 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onCloseSearch}
            title="Fechar pesquisa"
            aria-label="Fechar pesquisa"
            className="flex h-10 w-10 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.05]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="truncate text-base font-bold text-[#171717]">
                {customerName}
              </h2>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] ${
                  attendanceStatus === "HUMANO"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-teal-200 bg-teal-50 text-teal-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    attendanceStatus === "HUMANO"
                      ? "bg-blue-500"
                      : "bg-teal-500"
                  }`}
                />
                {attendanceStatus === "HUMANO"
                  ? "Humano"
                  : "IA"}
              </span>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.04em] text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Atualização ativa
              </span>
            </div>

            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-black/45">
              <span className="truncate">
                {phone}
              </span>

              {company?.trim() && (
                <span className="truncate">
                  🏢 {company}
                </span>
              )}

              {responsible?.trim() && (
                <span className="truncate">
                  👤 {responsible}
                </span>
              )}

              {formatHeaderInteraction(
                lastInteraction,
              ) && (
                <span className="shrink-0">
                  🕒{" "}
                  {formatHeaderInteraction(
                    lastInteraction,
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AttendanceActions
              attendanceId={attendanceId}
              attendanceState={attendanceState}
              currentSectorId={attendanceSectorId}
            />

            <button
              type="button"
              onClick={onToggleCustomerPanel}
              title={
                isCustomerPanelOpen
                  ? "Fechar Cliente 360"
                  : "Abrir Cliente 360"
              }
              aria-label={
                isCustomerPanelOpen
                  ? "Fechar Cliente 360"
                  : "Abrir Cliente 360"
              }
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all duration-200 ${
                isCustomerPanelOpen
                  ? "border-[#0A9090]/25 bg-[#F2FAFA] text-[#087B7B]"
                  : "border-black/10 bg-white text-black/55 hover:-translate-y-0.5 hover:border-[#0A9090]/30 hover:bg-[#F2FAFA] hover:text-[#087B7B] hover:shadow-sm"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <circle
                  cx="12"
                  cy="8"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M5.5 20a6.5 6.5 0 0 1 13 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              Cliente 360
            </button>

            <button
              type="button"
              onClick={onOpenSearch}
              title="Pesquisar nesta conversa"
              aria-label="Pesquisar nesta conversa"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-black/55 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0A9090]/30 hover:bg-[#F2FAFA] hover:text-[#087B7B] hover:shadow-sm"
            >
              <SearchIcon />
            </button>
          </div>
        </>
      )}
    </header>
  );
}

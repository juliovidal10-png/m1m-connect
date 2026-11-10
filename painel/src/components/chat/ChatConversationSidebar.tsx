"use client";

import type { ReactNode } from "react";
import type { ConversationQueue } from "@/lib/conversation-queue";
export type ChatConversationSidebarItem = {
  key: string;
  name: string;
  profilePicUrl: string | null;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  isSelected: boolean;
  queueCategory: ConversationQueue | null;
  onSelect: () => void;
};

type ChatConversationSidebarProps = {
  administrativeReview?: ReactNode;
  activeQueue: ConversationQueue;
  onQueueChange: (queue: ConversationQueue) => void;
  queueCounts: { waiting: number; inService: number } | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  onRetry?: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  items: ChatConversationSidebarItem[];
};

export default function ChatConversationSidebar({
  administrativeReview,
  activeQueue,
  onQueueChange,
  queueCounts,
  searchQuery,
  onSearchChange,
  isLoading,
  hasLoaded,
  error,
  onRetry,
  isLoadingMore,
  hasMore,
  onLoadMore,
  items,
}: ChatConversationSidebarProps) {
  const renderItem = (item: ChatConversationSidebarItem) => (
    <button
      key={item.key}
      type="button"
      onClick={item.onSelect}
      className={`flex w-full items-start gap-3.5 border-b border-black/5 px-4 py-3.5 text-left transition-all duration-150 ${
        item.isSelected
          ? "bg-[#ECF8F8] shadow-[inset_3px_0_0_#0A9090]"
          : "hover:bg-black/[0.025]"
      }`}
    >
      {item.profilePicUrl ? (
        <img
          src={item.profilePicUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ECF8F8] font-bold text-[#087B7B] ring-1 ring-[#0A9090]/10">
          {item.name.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 [overflow-wrap:anywhere] text-[15px] leading-5 font-semibold text-[#171717]">
            {item.name}
          </p>

          <span className="shrink-0 text-[11px] leading-5 font-medium text-black/35">
            {item.updatedAt}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="line-clamp-2 min-h-[20px] text-[13px] leading-5 text-black/45">
            {item.preview}
          </p>

        </div>
      </div>
    </button>
  );

  return (
    <aside
      className="h-full w-full shrink-0 overflow-y-auto border-r border-black/5 bg-white"
      onScroll={(event) => {
        if (isLoading || isLoadingMore || !hasMore) return;
        const element = event.currentTarget;
        const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
        if (distanceToBottom < 180) onLoadMore();
      }}
    >
      <div className="sticky top-0 z-10 border-b border-black/5 bg-white px-4 pb-4 pt-5">
        <h2 className="text-[18px] font-bold text-[#171717]">
          Conversas
        </h2>
        {administrativeReview}
          <div className="mt-4 flex gap-1 rounded-xl bg-[#f7f7f8] p-1">
            <button
              type="button"
              aria-pressed={activeQueue === "OPEN"}
              onClick={() => onQueueChange("OPEN")}
              className={`min-w-0 grow whitespace-normal rounded-lg px-1.5 py-2 text-[11px] leading-tight font-bold uppercase tracking-normal transition ${
                activeQueue === "OPEN"
                  ? "bg-white text-[#0A9090] shadow-sm"
                  : "text-black/45 hover:text-black/70"
              }`}
            >
              Abertas
            </button>

            <button
              type="button"
              aria-pressed={activeQueue === "WAITING"}
              onClick={() => onQueueChange("WAITING")}
              className={`min-w-0 grow whitespace-normal rounded-lg px-1.5 py-2 text-[11px] leading-tight font-bold uppercase tracking-normal transition ${
                activeQueue === "WAITING"
                  ? "bg-white text-[#0A9090] shadow-sm"
                  : "text-black/45 hover:text-black/70"
              }`}
            >
              Aguardando{queueCounts ? ` (${queueCounts.waiting})` : ""}
            </button>

            <button
              type="button"
              aria-pressed={activeQueue === "IN_SERVICE"}
              onClick={() => onQueueChange("IN_SERVICE")}
              className={`min-w-0 grow whitespace-normal rounded-lg px-1.5 py-2 text-[11px] leading-tight font-bold uppercase tracking-normal transition ${
                activeQueue === "IN_SERVICE"
                  ? "bg-white text-[#0A9090] shadow-sm"
                  : "text-black/45 hover:text-black/70"
              }`}
            >
              Em atendimento{queueCounts ? ` (${queueCounts.inService})` : ""}
            </button>
          </div>

          <input
          type="search"
          value={searchQuery}
          onChange={(event) =>
            onSearchChange(
              event.target.value,
            )
          }
          placeholder="Buscar conversa..."
          aria-label="Buscar conversa por nome, número ou mensagem"
          className="mt-4 h-11 w-full rounded-2xl border border-black/10 bg-[#f7f7f8] px-4 text-sm outline-none transition focus:border-[#0A9090]/40 focus:bg-white focus:ring-4 focus:ring-[#0A9090]/10"
        />
      </div>

      {isLoading && (
        <p className="p-4 text-sm text-black/45">
          Carregando conversas...
        </p>
      )}

      {!isLoading && error && (
        <div className="space-y-2 p-4 text-sm">
          <p role="alert" className="text-red-700">{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="font-semibold text-[#087B7B] hover:underline">
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {!isLoading && !error && hasLoaded && items.length === 0 && (
        searchQuery.trim() ? (
          <p className="p-4 text-sm text-black/45">Nenhuma conversa encontrada nesta aba.</p>
        ) : (
          <div className="m-4 flex flex-col items-center rounded-2xl border border-black/5 bg-[#f5f6f6] px-5 py-8 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-white text-slate-600">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-6"
              >
                <path d="M13.5 17.5a6 6 0 0 0 5.2.3L22 19l-1.2-2.6A5.1 5.1 0 0 0 17 8.5" />
                <path d="M2 9a6 6 0 0 0 1.5 3.9L2 16l3.5-1.3A7 7 0 0 0 8.5 15C12.1 15 15 12.3 15 9s-2.9-6-6.5-6S2 5.7 2 9Z" />
              </svg>
            </div>
            <p className="mt-3 text-[15px] leading-5 font-bold text-black">Nenhuma conversa encontrada.</p>
            <p className="mt-3 max-w-[290px] text-[13px] leading-[18px] text-slate-600">
              Quando chegarem mensagens, elas aparecerão aqui.
            </p>
          </div>
        )
      )}

      {items.map(renderItem)}

      {isLoadingMore && (
        <p className="p-4 text-center text-sm text-black/45">
          Carregando mais conversas...
        </p>
      )}
    </aside>
  );
}

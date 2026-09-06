"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
export type ChatConversationSidebarItem = {
  key: string;
  name: string;
  profilePicUrl: string | null;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  isSelected: boolean;
  queueCategory: "WAITING" | "IN_SERVICE" | "OTHER";
  onSelect: () => void;
};

type ChatConversationSidebarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  items: ChatConversationSidebarItem[];
};

export default function ChatConversationSidebar({
  searchQuery,
  onSearchChange,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  items,
}: ChatConversationSidebarProps) {
  const waitingCount = items.filter(
    (item) => item.queueCategory === "WAITING",
  ).length;
  const inServiceCount = items.filter(
    (item) => item.queueCategory === "IN_SERVICE",
  ).length;

  const [activeQueue, setActiveQueue] = useState<
    "WAITING" | "IN_SERVICE"
  >(waitingCount > 0 ? "WAITING" : "IN_SERVICE");
  const manualQueueSelectionRef = useRef(false);
  const initialQueueResolvedRef = useRef(false);

  useEffect(() => {
    if (manualQueueSelectionRef.current) return;
    if (initialQueueResolvedRef.current) return;

    setActiveQueue(
      waitingCount > 0 ? "WAITING" : "IN_SERVICE",
    );
    initialQueueResolvedRef.current = true;
  }, [waitingCount]);

  const visibleItems = items.filter((item) => {
    if (item.queueCategory === "OTHER") return true;
    return item.queueCategory === activeQueue;
  });

  return (
    <aside
      className="h-full w-full shrink-0 overflow-y-auto border-r border-black/5 bg-white"
      onScroll={(event) => {
        if (searchQuery.trim() || isLoading || isLoadingMore || !hasMore) return;
        const element = event.currentTarget;
        const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
        if (distanceToBottom < 180) onLoadMore();
      }}
    >
      <div className="sticky top-0 z-10 border-b border-black/5 bg-white px-4 pb-4 pt-5">
        <h2 className="text-[18px] font-bold text-[#171717]">
          Conversas
        </h2>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#f7f7f8] p-1">
            <button
              type="button"
              onClick={() => {
                manualQueueSelectionRef.current = true;
                setActiveQueue("WAITING");
              }}
              className={`rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                activeQueue === "WAITING"
                  ? "bg-white text-[#0A9090] shadow-sm"
                  : "text-black/45 hover:text-black/70"
              }`}
            >
              Aguardando ({waitingCount})
            </button>

            <button
              type="button"
              onClick={() => {
                manualQueueSelectionRef.current = true;
                setActiveQueue("IN_SERVICE");
              }}
              className={`rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                activeQueue === "IN_SERVICE"
                  ? "bg-white text-[#0A9090] shadow-sm"
                  : "text-black/45 hover:text-black/70"
              }`}
            >
              Em atendimento ({inServiceCount})
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

      {!isLoading &&
        searchQuery.trim() &&
        visibleItems.length === 0 && (
          <p className="p-4 text-sm text-black/45">
            Nenhuma conversa encontrada.
          </p>
        )}

      {visibleItems.map((item) => (
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
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[15px] font-semibold text-[#171717]">
                {item.name}
              </p>

              <span className="shrink-0 text-[11px] font-medium text-black/35">
                {item.updatedAt}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="line-clamp-2 min-h-[20px] text-[13px] leading-5 text-black/45">
                {item.preview}
              </p>

              {item.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A9090] px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {item.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}

      {isLoadingMore && !searchQuery.trim() && (
        <p className="p-4 text-center text-sm text-black/45">
          Carregando mais conversas...
        </p>
      )}
    </aside>
  );
}

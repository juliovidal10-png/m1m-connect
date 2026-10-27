export default function ConversationUnreadBadge({ count, source }: {
  count: number | null; source?: "LEDGER" | "PENDING";
}) {
  if (source === "PENDING") {
    return <span title="Contagem de não lidas ainda não reconciliada" aria-label="Contagem de não lidas pendente" className="px-1.5 text-xs text-amber-700">…</span>;
  }
  if (count === null || !Number.isSafeInteger(count) || count <= 0) return null;
  return <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A9090] px-1.5 text-[10px] font-bold text-white">{count}</span>;
}

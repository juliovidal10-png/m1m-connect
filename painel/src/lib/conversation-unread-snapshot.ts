/** Contagem do ledger tem revisao propria; data da mensagem nao prova leitura. */
export type LedgerUnreadSnapshot = {
  unreadSource: "LEDGER" | "PENDING";
  unreadCount: number | null;
  unreadRevision: number | null;
  unreadCanonicalJid: string | null;
};
type Candidate = {
  unreadSource?: unknown; unreadCount?: unknown;
  unreadRevision?: unknown; unreadCanonicalJid?: unknown;
};
export function pendingUnreadSnapshot(canonicalJid: string | null): LedgerUnreadSnapshot {
  return { unreadSource: "PENDING", unreadCount: null, unreadRevision: null, unreadCanonicalJid: canonicalJid };
}
function readSnapshot(value: Candidate): LedgerUnreadSnapshot | null {
  if (value.unreadSource === undefined) return null;
  const canonical = typeof value.unreadCanonicalJid === "string" && value.unreadCanonicalJid.trim()
    ? value.unreadCanonicalJid : null;
  if (value.unreadSource !== "LEDGER" || !canonical ||
      typeof value.unreadCount !== "number" || !Number.isSafeInteger(value.unreadCount) || value.unreadCount < 0 ||
      typeof value.unreadRevision !== "number" || !Number.isSafeInteger(value.unreadRevision) || value.unreadRevision < 0) {
    return pendingUnreadSnapshot(canonical);
  }
  return { unreadSource: "LEDGER", unreadCount: value.unreadCount,
    unreadRevision: value.unreadRevision, unreadCanonicalJid: canonical };
}
export function selectLedgerUnreadSnapshot(first: Candidate, second: Candidate): LedgerUnreadSnapshot | null {
  const a = readSnapshot(first), b = readSnapshot(second);
  if (!a) return b;
  if (!b) return a;
  if (a.unreadCanonicalJid !== b.unreadCanonicalJid) return pendingUnreadSnapshot(null);
  if (a.unreadSource !== "LEDGER") return b;
  if (b.unreadSource !== "LEDGER") return a;
  if (a.unreadRevision === b.unreadRevision) {
    return a.unreadCount === b.unreadCount ? a : pendingUnreadSnapshot(a.unreadCanonicalJid);
  }
  return a.unreadRevision! > b.unreadRevision! ? a : b;
}

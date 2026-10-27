import { selectLedgerUnreadSnapshot } from "./conversation-unread-snapshot";
import type { LoadedUnreadState } from "@/services/conversation-ledger-access.service";

type Lane = "list" | "search";
export function createRefreshFence() {
  let generation = 0, scopeKey: string | null = null;
  const sequences = { list: 0, search: 0 };
  return {
    begin(lane: Lane) { return { lane, generation, sequence: ++sequences[lane] }; },
    current(ticket: {lane: Lane; generation: number; sequence: number}) { return generation === ticket.generation && sequences[ticket.lane] === ticket.sequence; },
    accept(key: unknown) {
      if (typeof key !== "string" || !key) return false;
      if (scopeKey === key) return false;
      const changed = scopeKey !== null;
      scopeKey = key;
      if (changed) { generation++; sequences.list++; sequences.search++; }
      return changed;
    },
    reset() { scopeKey = null; generation++; sequences.list++; sequences.search++; },
    invalidate(lane: Lane) { sequences[lane]++; },
    scopeKey: () => scopeKey,
    contextVersion: () => generation,
  };
}
export class LedgerScopeChangedError extends Error {}
export async function collectLoadedUnreadStates(ids: string[], scopeKey: string,
  fetchBatch: (ids: string[], scopeKey: string) => Promise<{scopeKey: string; states: LoadedUnreadState[]}>, current: () => boolean) {
  const unique = [...new Set(ids)];
  const result: LoadedUnreadState[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) {
    if (!current()) return null;
    const batch = unique.slice(offset, offset + 100);
    const data = await fetchBatch(batch, scopeKey);
    if (!current()) return null;
    if (data.scopeKey !== scopeKey) throw new LedgerScopeChangedError();
    if (!Array.isArray(data.states) || data.states.length !== batch.length || new Set(data.states.map(row => row.canonicalJid)).size !== batch.length ||
      data.states.some(row => !batch.includes(row.canonicalJid) || typeof row.removed !== "boolean" ||
        (row.unreadRevision !== null && (!Number.isSafeInteger(row.unreadRevision) || row.unreadRevision < 0)) ||
        (!row.removed && !["LEDGER", "PENDING"].includes(row.unreadSource ?? "")))) throw new Error("Lote incompleto ou invalido");
    result.push(...data.states);
  }
  return result;
}
type Item = { canonicalJid?: string | null; remoteJid: string; unreadSource?: "LEDGER" | "PENDING"; unreadCount?: number | null; unreadRevision?: number | null; unreadCanonicalJid?: string | null };
export function applyLoadedUnreadStates<T extends Item>(items: T[], states: LoadedUnreadState[], latest: T[] = items): T[] {
  const byId = new Map(states.map(row => [row.canonicalJid, row]));
  const known = new Map(latest.map(row => [row.canonicalJid || row.remoteJid, row]));
  return items.flatMap(item => {
    const id = item.canonicalJid || item.remoteJid, update = byId.get(id);
    const current = known.get(id) ?? item;
    const merged = { ...item, ...selectLedgerUnreadSnapshot(item, current) };
    if (!update) return [merged];
    if (update.removed) {
      if (update.unreadRevision !== null && current.unreadRevision != null && current.unreadRevision > update.unreadRevision) return [merged];
      return [];
    }
    return [{ ...merged, ...selectLedgerUnreadSnapshot(merged, update) }];
  });
}

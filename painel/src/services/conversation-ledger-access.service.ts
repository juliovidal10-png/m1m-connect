import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { companyRepository } from "@/repositories/company.repository";
import { pendingUnreadSnapshot, type LedgerUnreadSnapshot } from "@/lib/conversation-unread-snapshot";

export type LedgerScope = { companyId: string; instanceName: string; userId: string; canViewAll: boolean; sectorIds: string[]; key: string };
export type LoadedUnreadState = { canonicalJid: string; removed: boolean; unreadRevision: number | null } & Partial<LedgerUnreadSnapshot>;
export async function getLedgerScope(user: { companyId: string; userId: string }, canViewAll: boolean): Promise<LedgerScope> {
  const company = await companyRepository.findById(user.companyId);
  const instanceName = company?.whatsappInstanceName?.trim();
  if (!instanceName) throw new Error("Instancia indisponivel");
  const assignments = canViewAll ? [] : await prisma.m1MSectorUser.findMany({
    where: { userId: user.userId, sector: { companyId: user.companyId } }, select: { sectorId: true },
  });
  const sectorIds = [...new Set(assignments.map(row => row.sectorId))].sort();
  const key = createHash("sha256").update(JSON.stringify([user.companyId, instanceName, user.userId, canViewAll, sectorIds])).digest("hex");
  return { companyId: user.companyId, instanceName, userId: user.userId, canViewAll, sectorIds, key };
}

// Mesmo predicado para listagem, atualizacao em lote e agregado. Parametros sao
// ligados separadamente. Nenhum valor externo e interpolado no texto SQL.
const access = `($3::boolean OR EXISTS (
 SELECT 1 FROM m1m_customers c
 WHERE c."companyId"=$1 AND (c."remoteJid"=s."canonicalJid" OR EXISTS (
   SELECT 1 FROM m1m_messages m WHERE m."companyId"=$1 AND m."instanceName"=$2
   AND m."customerId"=c.id AND m."remoteJid"=s."canonicalJid"))
 AND 1=(SELECT count(*) FROM m1m_customers c2 WHERE c2."companyId"=$1 AND
   (c2."remoteJid"=s."canonicalJid" OR EXISTS (SELECT 1 FROM m1m_messages m2
    WHERE m2."companyId"=$1 AND m2."instanceName"=$2 AND m2."customerId"=c2.id AND m2."remoteJid"=s."canonicalJid")))
 AND EXISTS (SELECT 1 FROM (
   SELECT a.state, a."sectorId", a."responsibleId" FROM m1m_attendances a
   WHERE a."companyId"=$1 AND a."customerId"=c.id AND a.state IN ('IA','HUMANO')
   ORDER BY a."startedAt" DESC, a.id DESC LIMIT 1
 ) active WHERE active.state='HUMANO' AND active."sectorId"=ANY($5::text[])
   AND (active."responsibleId" IS NULL OR active."responsibleId"=$4))
))`;
export const ledgerCountSQL = `SELECT count(*)::integer AS count FROM m1m_conversation_states s
 WHERE s."companyId"=$1 AND s."instanceName"=$2 AND s."hiddenAt" IS NULL AND s."unreadCount">0 AND ${access}`;
export const ledgerBatchSQL = `SELECT s."canonicalJid", stored."unreadCount", stored.revision, stored."hiddenAt"
 FROM unnest($6::text[]) s("canonicalJid")
 LEFT JOIN m1m_conversation_states stored ON stored."companyId"=$1 AND stored."instanceName"=$2 AND stored."canonicalJid"=s."canonicalJid"
 WHERE ${access}`;
const args = (scope: LedgerScope) => [scope.companyId, scope.instanceName, scope.canViewAll, scope.userId, scope.sectorIds];
export async function countVisibleLedgerConversations(scope: LedgerScope) {
  const rows = await prisma.$queryRawUnsafe<{count: number}[]>(ledgerCountSQL, ...args(scope));
  const count = rows[0]?.count;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Contagem invalida");
  return count;
}
export function validLoadedJids(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length <= 100 && new Set(ids).size === ids.length &&
    ids.every(id => typeof id === "string" && /^[0-9A-Za-z._:-]+@(s\.whatsapp\.net|lid|g\.us)$/.test(id));
}
export async function getVisibleLedgerBatch(scope: LedgerScope, ids: string[]): Promise<LoadedUnreadState[]> {
  if (!validLoadedJids(ids)) throw new Error("Lote invalido");
  if (!ids.length) return [];
  const rows = await prisma.$queryRawUnsafe<Array<{canonicalJid: string; unreadCount: number | null; revision: number | null; hiddenAt: Date | null}>>(ledgerBatchSQL, ...args(scope), ids);
  const byId = new Map(rows.map(row => [row.canonicalJid, row]));
  if (byId.size !== rows.length || rows.some(row => !ids.includes(row.canonicalJid))) throw new Error("Resposta de estado inconsistente");
  return ids.map(canonicalJid => {
    const row = byId.get(canonicalJid);
    if (!row || row.hiddenAt) return { canonicalJid, removed: true, unreadRevision: row?.revision ?? null };
    if (row.revision === null) return { canonicalJid, removed: false, ...pendingUnreadSnapshot(canonicalJid) };
    if (!Number.isSafeInteger(row.revision) || row.revision < 0 || row.unreadCount === null || !Number.isSafeInteger(row.unreadCount) || row.unreadCount < 0) throw new Error("Estado invalido");
    return { canonicalJid, removed: false, unreadSource: "LEDGER", unreadCanonicalJid: canonicalJid, unreadCount: row.unreadCount, unreadRevision: row.revision };
  });
}
export async function projectVisibleLedgerChats<T extends {canonicalJid?: string | null}>(scope: LedgerScope, chats: T[]) {
  const ids = [...new Set(chats.map(chat => chat.canonicalJid).filter((id): id is string => !!id))];
  const states: LoadedUnreadState[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) states.push(...await getVisibleLedgerBatch(scope, ids.slice(offset, offset + 100)));
  const byId = new Map(states.map(row => [row.canonicalJid, row]));
  return chats.flatMap(chat => {
    const state = chat.canonicalJid ? byId.get(chat.canonicalJid) : undefined;
    if (state?.removed || (!state && !scope.canViewAll)) return [];
    return [{ ...chat, ...(state ?? pendingUnreadSnapshot(null)) }];
  });
}

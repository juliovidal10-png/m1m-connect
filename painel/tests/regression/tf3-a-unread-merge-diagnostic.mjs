import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { unreadSnapshots } from "./load-unread-snapshot.mjs";

const source = readFileSync("src/app/api/chat/list/route.ts", "utf8");
const start = source.indexOf("function getChatUnreadCount(");
const end = source.indexOf("\nfunction mergeIntoEnrichedChatMap(", start);
assert.ok(start >= 0 && end > start, "Backend merge source not found");
const mergeSource = source.slice(start, end)
  .replaceAll(": EvolutionChat", "")
  .replaceAll(": EnrichedChat", "")
  .replace("): EnrichedChat {", ") {");
const context = {
  selectLedgerUnreadSnapshot: unreadSnapshots.selectLedgerUnreadSnapshot,
  getChatUpdatedTime: (chat) => Date.parse(chat.updatedAt || "") || 0,
  normalizeJid: (jid) => jid?.trim().toLowerCase() || "",
  getStableCanonicalJid: (chat) => chat.canonicalJid || chat.remoteJid,
  normalizeText: (value) => value?.trim() || null,
};
vm.createContext(context);
vm.runInContext(mergeSource + "\nthis.merge = mergeEnrichedChat;", context);

const base = { remoteJid: "123@s.whatsapp.net", canonicalJid: "123@s.whatsapp.net", updatedAt: "2026-10-24T12:00:00Z", unreadCount: 4, pushName: "Contato", profilePicUrl: null };
const read = { ...base, remoteJid: "abc@lid", unreadCount: 0 };
const stale = context.merge(base, read);
assert.equal(stale.unreadCount, 4, "Expected to reproduce stale maximum count");
const newerRead = context.merge(base, { ...read, updatedAt: "2026-10-24T12:00:01Z" });
assert.equal(newerRead.unreadCount, 0, "Newer Evolution read count must replace stale count");
const olderRead = context.merge({ ...base, updatedAt: "2026-10-24T12:00:02Z" }, read);
assert.equal(olderRead.unreadCount, 4, "Older zero count must not erase newer unread count");
const newIncoming = context.merge({ ...base, unreadCount: 0 }, { ...read, unreadCount: 1, updatedAt: "2026-10-24T12:01:00Z" });
assert.equal(newIncoming.unreadCount, 1, "New incoming count must remain visible");
console.log("TF3-A DIAGNOSTIC: reproduced stale unreadCount=4 after same-contact zero count (Math.max).");
console.log("TF3-A DIAGNOSTIC: new incoming unreadCount=1 remains visible.");
console.log("TF3-A FIX: strictly newer Evolution count takes precedence; equal timestamps remain conservative.");

const ledgerBase = { ...base, unreadSource: "LEDGER", unreadCanonicalJid: "123@s.whatsapp.net", unreadRevision: 10 };
const ledgerRead = { ...read, unreadSource: "LEDGER", unreadCanonicalJid: "123@s.whatsapp.net", unreadRevision: 11, unreadCount: 0, updatedAt: "2020-01-01T00:00:00Z" };
const combine = (a, b) => context.merge(a, b);
for (const [a, b] of [[ledgerBase, ledgerRead], [ledgerRead, ledgerBase]]) {
  const merged = combine(a, b); assert.equal(merged.unreadCount, 0); assert.equal(merged.unreadRevision, 11);
}
const incomingLedger = { ...ledgerRead, unreadRevision: 12, unreadCount: 1 };
assert.equal(combine(ledgerRead, incomingLedger).unreadCount, 1);
assert.equal(combine(incomingLedger, ledgerRead).unreadCount, 1);
const inconsistent = combine(ledgerRead, { ...ledgerRead, unreadCount: 2 });
assert.equal(inconsistent.unreadSource, "PENDING"); assert.equal(inconsistent.unreadCount, null);
const differentIdentity = combine(ledgerRead, { ...ledgerRead, unreadCanonicalJid: "different@s.whatsapp.net" });
assert.equal(differentIdentity.unreadSource, "PENDING"); assert.equal(differentIdentity.unreadCount, null);
console.log("TF3-A LEDGER: revisao vence data da mensagem, repeticao/ordem nao regressam leitura e conflitos ficam pendentes.");

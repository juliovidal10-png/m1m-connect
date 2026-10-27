import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { unreadSnapshots } from "./load-unread-snapshot.mjs";

const source = readFileSync("src/components/chat/ChatInbox.tsx", "utf8");
const start = source.indexOf("function mergeDuplicateChats(");
const end = source.indexOf("\nfunction findChatByRequestedJid(", start);
assert.ok(start >= 0 && end > start, "Frontend merge source not found");
const fragment = source.slice(start, end)
  .replace("items: Chat[]", "items")
  .replace("new Map<string, Chat>()", "new Map()");
const context = {
  selectLedgerUnreadSnapshot: unreadSnapshots.selectLedgerUnreadSnapshot,
  getCanonicalJid: (chat) => chat.canonicalJid || chat.remoteJid,
  isGroupChat: (chat) => chat.remoteJid.endsWith("@g.us"),
  getNameCandidate: (chat) => chat.pushName || null,
  getUpdatedTime: (chat) => Date.parse(chat.updatedAt || "") || 0,
};
vm.createContext(context);
vm.runInContext(fragment + "\nthis.merge = mergeDuplicateChats;", context);
const base = { id: "a", remoteJid: "123@s.whatsapp.net", canonicalJid: "123@s.whatsapp.net", updatedAt: "2026-10-24T12:00:00Z", unreadCount: 4, pushName: "Contato", profilePicUrl: null, lastMessage: null };
const read = { ...base, id: "b", remoteJid: "abc@lid", unreadCount: 0 };
assert.equal(context.merge([base, read])[0].unreadCount, 4, "Equal timestamps preserve stale first count");
assert.equal(context.merge([read, base])[0].unreadCount, 0, "Equal timestamps depend on source order");
const incoming = { ...read, unreadCount: 1, updatedAt: "2026-10-24T12:01:00Z" };
assert.equal(context.merge([base, incoming])[0].unreadCount, 1, "Newer incoming count survives");
console.log("TF3-A FRONTEND DIAGNOSTIC: equal timestamps yield order-dependent unreadCount (4 versus 0).");
console.log("TF3-A FRONTEND DIAGNOSTIC: newer incoming count=1 preserved.");
console.log("TF3-A DIAGNOSTIC: caminho legado preservado; ledger validado separadamente por revisao.");

const ledgerBase = { ...base, unreadSource: "LEDGER", unreadCanonicalJid: "123@s.whatsapp.net", unreadRevision: 10 };
const ledgerRead = { ...read, unreadSource: "LEDGER", unreadCanonicalJid: "123@s.whatsapp.net", unreadRevision: 11, unreadCount: 0, updatedAt: "2020-01-01T00:00:00Z" };
const combine =  (a, b) => context.merge([a, b])[0];
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

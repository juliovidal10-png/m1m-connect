import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("src/app/api/chat/list/route.ts", "utf8");
const start = source.indexOf("function getChatUnreadCount(");
const end = source.indexOf("\nfunction mergeIntoEnrichedChatMap(", start);
assert.ok(start >= 0 && end > start, "Backend merge source not found");
const mergeSource = source.slice(start, end)
  .replaceAll(": EvolutionChat", "")
  .replaceAll(": EnrichedChat", "")
  .replace("): EnrichedChat {", ") {");
const context = {
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
const newIncoming = context.merge({ ...base, unreadCount: 0 }, { ...read, unreadCount: 1, updatedAt: "2026-10-24T12:01:00Z" });
assert.equal(newIncoming.unreadCount, 1, "New incoming count must remain visible");
console.log("TF3-A DIAGNOSTIC: reproduced stale unreadCount=4 after same-contact zero count (Math.max).");
console.log("TF3-A DIAGNOSTIC: new incoming unreadCount=1 remains visible.");
console.log("TF3-A DIAGNOSTIC ONLY: no production merge semantics changed.");

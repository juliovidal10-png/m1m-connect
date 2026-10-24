import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("src/components/chat/ChatInbox.tsx", "utf8");
const start = source.indexOf("function mergeDuplicateChats(");
const end = source.indexOf("\nfunction findChatByRequestedJid(", start);
assert.ok(start >= 0 && end > start, "Frontend merge source not found");
const fragment = source.slice(start, end)
  .replace("items: Chat[]", "items")
  .replace("new Map<string, Chat>()", "new Map()");
const context = {
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
console.log("TF3-A DIAGNOSTIC ONLY: production frontend merge unchanged.");

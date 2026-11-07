import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = fs.readFileSync("src/components/chat/ChatInbox.tsx", "utf8");
const start = source.indexOf("function getCanonicalJid(");
const end = source.indexOf("function findChatByRequestedJid(", start);
assert.ok(start >= 0 && end > start);
const compiled = ts.transpileModule(
  source.slice(start, end) + "\nthis.merge = mergeDuplicateChats;",
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;
const scope = {
  isGroupChat: chat => chat.remoteJid.endsWith("@g.us"),
  getNameCandidate: chat => chat.pushName,
};
vm.runInNewContext(compiled, scope);
const merge = scope.merge;
const phone = "551100000001@s.whatsapp.net";
const otherPhone = "551100000002@s.whatsapp.net";
const lid = "100000000001@lid";
function chat(remoteJid, overrides = {}) {
  return {
    id: remoteJid,
    remoteJid,
    pushName: "Mesmo nome",
    updatedAt: "2026-11-07T20:00:00Z",
    unreadCount: 3,
    lastMessage: { key: { remoteJid } },
    ...overrides,
  };
}
const old = chat(lid, { canonicalJid: lid, unreadCount: 8 });
const resolved = chat(lid, {
  canonicalJid: phone,
  crmCustomerId: "synthetic-customer",
  updatedAt: "2026-11-07T20:01:00Z",
  unreadCount: 1,
  lastMessage: { key: { remoteJid: lid, remoteJidAlt: phone } },
});
for (const items of [
  [old, resolved, chat(phone)],
  [chat(phone), resolved, old],
  [...merge([old]), resolved],
]) {
  const result = merge(items);
  assert.equal(result.length, 1);
  assert.equal(result[0].canonicalJid, phone);
  assert.equal(result[0].remoteJid, lid);
  assert.equal(result[0].lastMessage.key.remoteJidAlt, phone);
  assert.equal(result[0].unreadCount, 1);
  assert.equal(result[0].crmCustomerId, "synthetic-customer");
}
const oppositeDirection = chat(phone, {
  canonicalJid: phone,
  lastMessage: { key: { remoteJid: phone, remoteJidAlt: lid } },
});
assert.equal(merge([old, oppositeDirection]).length, 1);
assert.equal(merge([old, chat(phone)]).length, 2, "Sem vinculo explicito, preservar ambas");
assert.equal(merge([chat(phone), chat(otherPhone)]).length, 2, "Nomes e previas iguais nao unem contatos");

const group = chat("551100000001@g.us", {
  canonicalJid: phone,
  lastMessage: { key: { remoteJid: "551100000001@g.us", remoteJidAlt: lid } },
});
assert.equal(merge([old, chat(phone), group]).length, 3, "Grupo nao cria alias de participante");
assert.equal(merge([group, group]).length, 1);
assert.equal(merge([resolved, chat("551100000001@g.us"), chat("551100000002@g.us")]).length, 3);

const conflicting = chat(lid, {
  canonicalJid: otherPhone,
  lastMessage: { key: { remoteJid: lid, remoteJidAlt: otherPhone } },
});
for (const items of [[old, resolved, conflicting], [conflicting, resolved, old]]) {
  assert.equal(merge(items).length, 3, "Vinculo contraditorio nao resolve o LID antigo");
}
assert.equal(merge([]).length, 0);
console.log("TF2 PASS: alias tardio, paginas, ordem, grupos, contatos distintos e vinculos contraditorios.");

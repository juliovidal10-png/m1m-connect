// Executa o servico real com persistencia simulada. Sem banco ou rede.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const states = [];
const messages = [];
let sequence = 0;
let conflicts = 0;
let transactions = 0;
const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
  if (key === "companyId_instanceName_canonicalJid") return matches(row, value);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("in" in value) return value.in.includes(row[key]);
    if ("gt" in value) return row[key] > value.gt;
  }
  return row[key] === value;
});
const apply = (row, data) => {
  for (const [key, value] of Object.entries(data)) {
    row[key] = value && typeof value === "object" && "increment" in value
      ? row[key] + value.increment : value;
  }
};
const tx = {
  m1MConversationState: {
    async upsert({ where, create }) {
      let row = states.find((item) => matches(item, where));
      if (!row) {
        row = { id: `state-${++sequence}`, unreadCount: 0, revision: 0,
          hiddenAt: null, lastIncomingAt: null, lastIncomingMessageId: null, ...create };
        states.push(row);
      }
      return { ...row };
    },
    async findUnique({ where }) { return states.find((row) => matches(row, where)) ?? null; },
    async update({ where, data }) {
      const row = states.find((item) => matches(item, where));
      assert.ok(row, "estado precisa existir");
      apply(row, data);
      return { ...row };
    },
    async count({ where }) { return states.filter((row) => matches(row, where)).length; },
  },
  m1MConversationUnreadMessage: {
    async createMany({ data, skipDuplicates }) {
      assert.equal(skipDuplicates, true);
      let count = 0;
      for (const entry of data) {
        if (messages.some((row) => row.companyId === entry.companyId &&
            row.instanceName === entry.instanceName && row.evolutionMessageId === entry.evolutionMessageId)) continue;
        messages.push({ id: `message-${++sequence}`, readAt: null, ...entry });
        count++;
      }
      return { count };
    },
    async findMany({ where }) { return messages.filter((row) => matches(row, where)); },
    async updateMany({ where, data }) {
      const rows = messages.filter((row) => matches(row, where));
      rows.forEach((row) => apply(row, data));
      return { count: rows.length };
    },
    async count({ where }) { return messages.filter((row) => matches(row, where)).length; },
  },
};
const prisma = {
  ...tx,
  async $transaction(fn, options) {
    assert.equal(options.isolationLevel, "Serializable");
    transactions++;
    if (conflicts > 0) { conflicts--; throw Object.assign(new Error("conflito simulado"), { code: "P2034" }); }
    return fn(tx);
  },
};
const source = fs.readFileSync("src/services/conversation-unread-state.service.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, {
  module: mod, exports: mod.exports, Date,
  require(name) { assert.equal(name, "@/lib/prisma"); return { prisma }; },
});
const ledger = mod.exports;
const identity = { companyId: "synthetic-a", instanceName: "synthetic-instance", canonicalJid: "100@s.whatsapp.net" };
const incoming = (id, scope = identity) => ledger.recordIncomingUnreadEvent({ ...scope, evolutionMessageId: id, receivedAt: new Date("2026-01-01T00:00:00Z") });
const read = (ids, scope = identity) => ledger.recordConfirmedRead({ ...scope, confirmedEvolutionMessageIds: ids });
const count = (scope = identity) => ledger.countUnreadConversations(scope.companyId, scope.instanceName);
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log("PASSOU: " + name); }
await check("entrada, duplicidade e varias mensagens contam uma conversa", async () => {
  assert.equal(await count(), 0);
  await incoming("m1"); await incoming("m1"); await incoming("m2");
  assert.equal(await count(), 1);
  assert.equal(states[0].unreadCount, 2);
});
const otherChat = { ...identity, canonicalJid: "200@s.whatsapp.net" };
const otherCompany = { ...identity, companyId: "synthetic-b" };
const otherInstance = { ...identity, instanceName: "synthetic-instance-b" };
await check("mesmo ID fica isolado por empresa e instancia", async () => {
  await incoming("m1", otherCompany); await incoming("m1", otherInstance); await incoming("m3", otherChat);
  assert.equal(await count(), 2);
  assert.equal(await count(otherCompany), 1);
  assert.equal(await count(otherInstance), 1);
});
await check("IDs de outra conversa e inexistentes nao reduzem leitura", async () => {
  const result = await read(["m3", "unknown"]);
  assert.equal(result.confirmed, 0); assert.equal(result.remaining, 2);
});
await check("leitura parcial, duplicada e completa", async () => {
  assert.equal((await read(["m1", "m1"])).remaining, 1);
  assert.equal((await read(["m1"])).confirmed, 0);
  assert.equal((await read(["m2"])).remaining, 0);
  assert.equal(await count(), 1);
  assert.equal(await count(otherCompany), 1);
  assert.equal(await count(otherInstance), 1);
});
await check("replay de mensagem ja lida nao restaura indicador", async () => {
  await incoming("m1"); assert.equal(states[0].unreadCount, 0);
  await incoming("m4"); assert.equal(states[0].unreadCount, 1);
});
await check("exclusao preserva ledger e bloqueia reabertura ainda nao implementada", async () => {
  const before = messages.length;
  await ledger.hideConversationState(identity);
  assert.equal(messages.length, before); assert.equal(states[0].unreadCount, 0);
  assert.ok(states[0].hiddenAt);
  await incoming("m5"); assert.equal(states[0].unreadCount, 0);
  assert.equal(messages.length, before + 1);
});
await check("conflitos P2034 repetem e respeitam limite de tres tentativas", async () => {
  conflicts = 2; const before = transactions;
  await incoming("m6", otherChat); assert.equal(transactions - before, 3);
  conflicts = 3; const start = transactions;
  await assert.rejects(incoming("m7", otherChat), (error) => error.code === "P2034");
  assert.equal(transactions - start, 3); conflicts = 0;
});
await check("entrada invalida e leitura acima de 100 IDs sao rejeitadas", async () => {
  await assert.rejects(incoming(" "));
  await assert.rejects(read([]));
  await assert.rejects(read(Array.from({ length: 101 }, (_, index) => `x${index}`)));
});
console.log(`TF3-A: ${checks.length} cenarios comportamentais aprovados com persistencia simulada. Concorrencia real, JID/LID e Evolution nao validados.`);

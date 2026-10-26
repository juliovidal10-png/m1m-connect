import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = fs.readFileSync("src/services/tf3a-webhook-evidence.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const env = {};
const logs = [];
const mod = { exports: {} };
vm.runInNewContext(compiled, {
  module: mod, exports: mod.exports, process: { env }, Date,
  console: { info: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
  require(name) { assert.equal(name, "node:crypto"); return require(name); },
});
const { summarizeWebhookEvidence: summary, collectWebhookEvidence: collect } = mod.exports;
const payload = {
  event: "messages.upsert", instance: "synthetic-test", apikey: "SECRET_NOT_TO_LOG",
  data: { key: { id: "UNKNOWN-ID", remoteJid: "100@s.whatsapp.net", fromMe: false },
    messageTimestamp: 1, pushName: "PRIVATE_NAME", message: { conversation: "PRIVATE_TEXT" } },
};
const now = new Date("2026-10-26T20:00:00Z");
for (const label of ["replay historico com ID desconhecido", "mensagem nova atrasada", "repeticao fora de ordem",
  "replay em conversa oculta", "mensagem nova em conversa oculta"]) {
  assert.equal(summary(payload, "test-secret", now).classification, "UNCLASSIFIED");
  console.log(`PASSOU: ${label} nao recebe classificacao inventada de metadados ambiguos`);
}
const text = JSON.stringify(summary(payload, "test-secret", now));
for (const privateValue of ["UNKNOWN-ID", "100@s.whatsapp.net", "PRIVATE_NAME", "PRIVATE_TEXT", "SECRET_NOT_TO_LOG", "test-secret"]) {
  assert.ok(!text.includes(privateValue));
}
assert.equal(summary(payload, "test-secret", now).messageToken, summary(payload, "test-secret", now).messageToken);
assert.notEqual(summary(payload, "other-secret", now).messageToken, summary(payload, "test-secret", now).messageToken);
collect(payload); assert.equal(logs.length, 0);
env.M1M_TF3A_CAPTURE_WEBHOOK_EVIDENCE = "true";
collect(payload); assert.equal(logs.length, 0);
env.M1M_TF3A_EVIDENCE_INSTANCE = "other-instance";
env.M1M_WEBHOOK_SECRET = "test-secret";
collect(payload); assert.equal(logs.length, 0);
env.M1M_TF3A_EVIDENCE_INSTANCE = "synthetic-test";
collect(payload); assert.equal(logs.length, 1);
const historical = { ...payload, event: "messages.set", data: { ...payload.data, type: "append", isLatest: false } };
const observed = summary(historical, "test-secret", now);
assert.equal(observed.candidates.type.data, "append");
assert.equal(observed.candidates.isLatest.data, false);
assert.equal(observed.classification, "UNCLASSIFIED");
const unknown = summary({ ...payload, type: "PRIVATE_UNEXPECTED_VALUE" }, "test-secret", now);
assert.equal(unknown.candidates.type.envelope, "present:string");
assert.ok(!JSON.stringify(unknown).includes("PRIVATE_UNEXPECTED_VALUE"));
console.log("PASSOU: coleta opt-in, restrita por instancia, sem conteudo ou identificadores brutos; sinais observados nao autorizam ledger.");
console.log("DIAGNOSTICO: estes testes validam coleta e ausencia de inferencias, nao a correcao funcional de replay/reabertura.");

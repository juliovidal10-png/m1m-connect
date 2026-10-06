import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = fs.readFileSync("src/core/ai/openai-provider.service.ts", "utf8");
const compiled = ts.transpileModule(source + "\nexport const tf11Guard = applyDeterministicConversationGuard;", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, {
  module: mod, exports: mod.exports,
  require: (name) => {
    assert.equal(name, "openai");
    return {__esModule:true, default:class NoNetworkOpenAI {constructor(){throw new Error("API proibida neste teste");}}, toFile:()=>{throw new Error("API proibida");}};
  },
  process: {env: {}}, console
});
const after = mod.exports.tf11Guard;
const current = "MENSAGEM ATUAL DO CLIENTE:\nQuero fazer uma altera\u00e7\u00e3o.";
  const checks = [
    ["Caso observado", "Ol\u00e1 \u2014 tudo bem? Por favor, me diga qual material voc\u00ea quer alterar e quais mudan\u00e7as deseja (texto, imagens, cores, tamanho, formato, etc.).", "Por favor, me diga qual material voc\u00ea quer alterar?"],
    ["Saudacao e esclarecimento", "Ol\u00e1 \u2014 tudo bem? Qual material voc\u00ea quer alterar?", "Qual material voc\u00ea quer alterar?"],
    ["Pergunta direta", "Qual material voc\u00ea quer alterar?", "Qual material voc\u00ea quer alterar?"],
    ["Limite de uma pergunta", "Qual material voc\u00ea quer alterar? Quais mudan\u00e7as deseja?", "Qual material voc\u00ea quer alterar?"],
    ["Pergunta composta", "Qual material voc\u00ea quer alterar e quais mudan\u00e7as deseja?", "Qual material voc\u00ea quer alterar?"],
    ["Resposta factual", "Sim, desenvolvemos sites institucionais e landing pages.", "Sim, desenvolvemos sites institucionais e landing pages."],
    ["Saudacao isolada preservada", "Ol\u00e1 \u2014 tudo bem?", "Ol\u00e1 \u2014 tudo bem?"],
    ["Pergunta legitima preservada", "Seu site est\u00e1 funcionando bem? Qual erro apareceu?", "Seu site est\u00e1 funcionando bem?"]
  ];
  for (const [name, input, expected] of checks) {
    const actual = after(input, current, "NONE");
    console.log("PASSOU: " + name);
    assert.equal(actual, expected, name);
  }
  const courtesyPrompt = "MENSAGEM ATUAL DO CLIENTE:\nObrigado!";
  const courtesy = after("Por nada! \ud83d\ude0a", courtesyPrompt, "NONE");
  assert.equal(courtesy, "Por nada! \ud83d\ude0a");
  console.log("PASSOU: emoji de agradecimento preservado");
  const humanBefore = "Entendi. Vou encaminhar seu pedido para a equipe respons\u00e1vel dar continuidade.";
  const humanAfter = after("Texto original", current, "HUMAN_ACTION_REQUIRED");
  assert.equal(humanAfter, humanBefore);
  console.log("PASSOU: encaminhamento humano preservado");

console.log("PASSOU: 10 cenarios de regressao do filtro de esclarecimento.");

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = fs.readFileSync("src/core/ai/openai-provider.service.ts", "utf8");
let responseBody;
let lastRequest;
let responseOverride;
let apiError;
let calls = 0;
class FakeOpenAI {
  constructor() {
    this.responses = { create: async (request) => {
      lastRequest = request;
      calls++;
      if (apiError) throw apiError;
      if (responseOverride) return responseOverride;
      return { id: "test-response", model: "test-model", output_text: JSON.stringify(responseBody) };
    }};
  }
}
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
}}).outputText;
const fakeEnv = { OPENAI_API_KEY: "test-no-network" };
const context = { exports: {}, process: { env: fakeEnv }, console,
  require: (name) => {
    assert.equal(name, "openai", "Importacao inesperada no provider");
    return { __esModule: true, default: FakeOpenAI, toFile: () => { throw new Error("Nao permitido"); } };
  },
};
vm.runInNewContext(compiled, context);
const provider = context.exports.openAIProviderService;
async function check(label, body, expected, history = "") {
  responseBody = body;
  const result = await provider.classifyConversationIntent({currentMessage: label, conversationHistory: history});
  assert.equal(result.replyText, expected, label);
  assert.equal(result.intent, body.intent);
  assert.equal(result.canHandleWithoutHistory, body.intent === "SOCIAL" && body.canHandleWithoutHistory);
  assert.equal(lastRequest.text.format.schema.properties.socialTone.type, "string");
  console.log("PASSOU: " + label);
}
const social = (text, tone) => ({intent:"SOCIAL",replyText:text,socialTone:tone,canHandleWithoutHistory:true});
await check("agradecimento",social("Por nada! 👋👋", "THANKS"),"Por nada! 😊");
await check("parceria",social("Tamo junto!", "SOLIDARITY"),"Tamo junto! 🤝");
await check("confirmacao",social("Perfeito!", "APPROVAL"),"Perfeito! 👍");
await check("conquista",social("Que bom!", "CELEBRATION"),"Que bom! 🙌");
await check("despedida",{intent:"CLOSING",replyText:"Até mais!",socialTone:"FAREWELL",canHandleWithoutHistory:false},"Até mais! 👋");
await check("assunto delicado",social("Entendo.", "NONE"),"Entendo.");
await check("social nao recebe aceno",social("Por nada!", "FAREWELL"),"Por nada!");
await check("emoji recente do atendimento",social("Por nada!", "THANKS"),"Por nada! 🙂", "ATENDIMENTO: Obrigado! 😊");
await check("emoji do cliente nao controla escolha",social("Por nada!", "THANKS"),"Por nada! 😊", "CLIENTE: Obrigado! 😊");
await check("sem repetir todas as alternativas",social("Por nada!", "THANKS"),"Por nada!", "ATENDIMENTO: Obrigado! 😊\nATENDIMENTO: Certo! 🙂");
await check("outra intencao mantem fluxo normal",{intent:"OTHER",replyText:"",socialTone:"NONE",canHandleWithoutHistory:false},null);
responseBody = social("Por nada!", "INVALID");
await assert.rejects(() => provider.classifyConversationIntent({currentMessage:"teste"}), /invalida/);
console.log("PASSOU: tom invalido rejeitado");
for (const response of [
  { status: "completed", output_text: "" },
  { status: "incomplete", output_text: "", incomplete_details: { reason: "max_output_tokens" } },
  { status: "incomplete", output_text: '{"intent":"SOCIAL"', incomplete_details: { reason: "max_output_tokens" } },
]) {
  responseOverride = { id: "empty-response", model: "test-model", ...response };
  const previousCalls = calls;
  const result = await provider.classifyConversationIntent({ currentMessage: "Bom dia" });
  assert.equal(result.intent, "OTHER");
  assert.equal(result.replyText, null);
  assert.equal(result.canHandleWithoutHistory, false);
  assert.equal(result.responseId, "empty-response");
  assert.equal(calls, previousCalls + 1, "Nao repetir chamadas para uma classificacao auxiliar");
  assert.equal(lastRequest.max_output_tokens, 1024);
}
responseOverride = undefined;
apiError = new Error("synthetic authentication error");
await assert.rejects(() => provider.classifyConversationIntent({ currentMessage: "teste" }),
  /synthetic authentication error/);
console.log("PASSOU: saida vazia ou incompleta segue fluxo normal; erros da API continuam visiveis");
console.log("Testes de montagem passaram. Comportamento do modelo real ainda precisa de validacao funcional.");

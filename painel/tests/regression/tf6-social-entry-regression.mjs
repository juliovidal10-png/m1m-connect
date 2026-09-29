import fs from "node:fs";import path from "node:path";
const p=fs.readFileSync(path.resolve(process.cwd(),"src/core/ai/openai-provider.service.ts"),"utf8");
const q=fs.readFileSync(path.resolve(process.cwd(),"src/services/incoming-message-pipeline.service.ts"),"utf8");
function a(v,m){if(!v)throw new Error(`TF6 SOCIAL ENTRY FAIL: ${m}`)}
a(p.includes("canHandleWithoutHistory: boolean;"),"contrato");
a(p.includes('required: ["intent", "replyText", "canHandleWithoutHistory"]'),"schema");
a(p.includes("Agradecimento, cortesia ou socializacao autocontida podem ser true."),"cortesia");
a(p.includes("Saudacao de abertura isolada"),"abertura");
a(/intent === "SOCIAL"\r?\n\s*\? canHandleWithoutHistory\r?\n\s*: false/.test(p),"retorno SOCIAL");
a(q.includes("(Boolean(conversationalHistory) ||"),"gate");
a(q.includes("conversationalIntent.canHandleWithoutHistory"),"consumo");
a(q.includes("!ambiguousSectorAffirmation"),"ambigua");
console.log("TF6 SOCIAL ENTRY REGRESSION OK");
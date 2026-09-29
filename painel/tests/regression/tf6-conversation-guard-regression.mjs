import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const providerPath = path.resolve(
  process.cwd(),
  "src/core/ai/openai-provider.service.ts",
);

const source = fs.readFileSync(providerPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`TF6 REGRESSION FAIL: ${message}`);
  }
}

const pureCourtesyMatch = source.match(
  /if \(pureCourtesy\) \{([\s\S]*?)\n  \}/,
);

assert(
  pureCourtesyMatch,
  "bloco pureCourtesy nao encontrado.",
);

const pureCourtesyBlock = pureCourtesyMatch[1];

assert(
  pureCourtesyBlock.includes(
    "stripQuestionsForResolvedStage(replyText)",
  ),
  "pureCourtesy deixou de preservar a resposta contextual sem perguntas.",
);

assert(
  pureCourtesyBlock.includes(
    'return withoutQuestions || "Por nada! Até mais!";',
  ),
  "fallback cordial da TF6 foi removido ou alterado.",
);

assert(
  !/^\s*return "Por nada! Até mais!";\s*$/m.test(
    pureCourtesyBlock,
  ),
  "pureCourtesy voltou ao retorno fixo incondicional.",
);

assert(
  source.includes(
    'handoffReason === "HUMAN_ACTION_REQUIRED"',
  ),
  "guard de HUMAN_ACTION_REQUIRED nao encontrado.",
);

assert(
  source.includes(
    "keepOnlyFirstRequestedInformation(",
  ),
  "guard keepOnlyFirstRequestedInformation nao encontrado.",
);

assert(
  source.includes(
    "keepOnlyUnsupportedServiceAnswer(",
  ),
  "guard keepOnlyUnsupportedServiceAnswer nao encontrado.",
);

assert(
  source.includes(
    "stripQuestionsForResolvedStage(replyText)",
  ),
  "stripQuestionsForResolvedStage deixou de ser usado.",
);

console.log(
  "TF6 REGRESSION OK: cortesia contextual preservada; pergunta removida; fallback cordial e guards operacionais preservados.",
);
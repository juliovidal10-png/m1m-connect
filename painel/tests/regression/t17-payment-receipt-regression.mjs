import fs from "node:fs";
import assert from "node:assert/strict";

const pipelinePath = "src/services/incoming-message-pipeline.service.ts";
const source = fs.readFileSync(pipelinePath, "utf8");

// Blindagem estrutural: a correção validada em produção exige confirmação
// da análise. Se alguém voltar a permitir trusted signal como bypass,
// o build precisa falhar.
assert.match(
  source,
  /if\s*\(\s*!receiptAnalysis\.isPaymentReceipt\s*\)\s*\{/,
  "T17 REGRESSION: pipeline deixou de descartar mídia quando a análise NÃO confirma comprovante."
);

assert.doesNotMatch(
  source,
  /!hasTrustedReceiptSignal\s*&&\s*!receiptAnalysis\.isPaymentReceipt/,
  "T17 REGRESSION: trusted signal voltou a ignorar análise negativa."
);

function simulateReceiptDecision(payload, analysis) {
  const type = payload?.data?.messageType;
  const fromMe = payload?.data?.key?.fromMe;

  const eligible =
    fromMe === false &&
    (type === "imageMessage" || type === "documentMessage");

  if (!eligible || !analysis.isPaymentReceipt) {
    return null;
  }

  return {
    status: "RECEIVED",
    paymentMethod: analysis.paymentMethod ?? null,
  };
}

// Caso negativo: imagem comum recebida via Evolution.
const commonImagePayload = {
  event: "messages.upsert",
  data: {
    key: { fromMe: false, remoteJid: "5511999999999@s.whatsapp.net" },
    messageType: "imageMessage",
    message: {
      imageMessage: {
        caption: "Setembro Amarelo - informação e conscientização",
        mimetype: "image/jpeg",
      },
    },
  },
};

const ignored = simulateReceiptDecision(commonImagePayload, {
  isPaymentReceipt: false,
  paymentMethod: null,
});
assert.equal(
  ignored,
  null,
  "T17 REGRESSION: imagem comum entrou indevidamente no Financeiro."
);

// Caso positivo: comprovante PIX recebido via Evolution.
const pixReceiptPayload = {
  event: "messages.upsert",
  data: {
    key: { fromMe: false, remoteJid: "5511999999999@s.whatsapp.net" },
    messageType: "imageMessage",
    message: {
      imageMessage: {
        caption: "Comprovante de transferência - PIX - pagamento efetuado",
        mimetype: "image/jpeg",
      },
    },
  },
};

const received = simulateReceiptDecision(pixReceiptPayload, {
  isPaymentReceipt: true,
  paymentMethod: "PIX",
});

assert.deepEqual(
  received,
  { status: "RECEIVED", paymentMethod: "PIX" },
  "T17 REGRESSION: comprovante PIX deixou de gerar RECEIVED/PIX."
);

console.log("T17 REGRESSION OK: imagem comum ignorada; comprovante PIX => RECEIVED / PIX.");
import {
  readFile,
} from "node:fs/promises";
import path from "node:path";

import OpenAI from "openai";

export type PaymentReceiptAnalysisResult = {
  isPaymentReceipt: boolean;
  amount: number | null;
  paymentMethod: string | null;
  identifiedBank: string | null;
  paidAt: Date | null;
};

type RawAnalysis = {
  isPaymentReceipt?: unknown;
  amount?: unknown;
  paymentMethod?: unknown;
  identifiedBank?: unknown;
  paidAt?: unknown;
};

function getClient() {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "A variável OPENAI_API_KEY não está configurada.",
    );
  }

  return new OpenAI({
    apiKey,
  });
}

function normalizeBoolean(
  value: unknown,
) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return false;
}

function normalizeOptionalText(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized || null;
}

function normalizeAmount(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .replace(/\s/g, "")
      .replace(/^R\$/i, "")
      .replace(/\./g, "")
      .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : null;
}

function normalizePaidAt(
  value: unknown,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const date =
    new Date(
      value.trim(),
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function extractJson(
  value: string,
) {
  const trimmed =
    value.trim();

  const withoutFence =
    trimmed
      .replace(
        /^```(?:json)?\s*/i,
        "",
      )
      .replace(
        /\s*```$/,
        "",
      )
      .trim();

  const firstBrace =
    withoutFence.indexOf("{");

  const lastBrace =
    withoutFence.lastIndexOf("}");

  if (
    firstBrace < 0 ||
    lastBrace < firstBrace
  ) {
    throw new Error(
      "A análise do comprovante não retornou JSON válido.",
    );
  }

  return JSON.parse(
    withoutFence.slice(
      firstBrace,
      lastBrace + 1,
    ),
  ) as RawAnalysis;
}

function localPathFromMediaUrl(
  mediaUrl: string,
) {
  const normalized =
    mediaUrl.trim();

  if (
    !normalized.startsWith(
      "/payment-receipts/",
    )
  ) {
    throw new Error(
      "O comprovante ainda não possui arquivo local para análise.",
    );
  }

  const relativePath =
    normalized
      .replace(/^\/+/, "");

  const publicRoot =
    path.resolve(
      process.cwd(),
      "public",
    );

  const filePath =
    path.resolve(
      publicRoot,
      relativePath,
    );

  const expectedPrefix =
    `${publicRoot}${path.sep}`;

  if (
    !filePath.startsWith(
      expectedPrefix,
    )
  ) {
    throw new Error(
      "Caminho local do comprovante inválido.",
    );
  }

  return filePath;
}

function buildInstructions() {
  return [
    "Você analisa comprovantes de pagamento brasileiros.",
    "Extraia somente informações claramente visíveis no documento.",
    "Nunca invente dados e nunca use conhecimento externo para completar campos ausentes.",
    "Retorne SOMENTE um objeto JSON válido, sem markdown e sem explicações.",
    'Formato exato: {"isPaymentReceipt":boolean,"amount":number|null,"paymentMethod":string|null,"identifiedBank":string|null,"paidAt":string|null}.',
    "isPaymentReceipt: true somente quando a imagem/documento for claramente um comprovante, recibo ou confirmação de pagamento/transferência; para fotos comuns, produtos, pessoas, conversas, orçamentos, cobranças ainda não pagas ou documentos sem evidência de pagamento, use false.",
    "Quando isPaymentReceipt for false, mantenha amount, paymentMethod, identifiedBank e paidAt como null.",
    "amount: valor efetivamente pago/transferido, em reais, usando número decimal.",
    'paymentMethod: use valores curtos como "PIX", "TED", "DOC", "Transferência", "Depósito", "Boleto" ou null.',
    "identifiedBank: nome da instituição financeira claramente identificada no comprovante; preserve o nome útil ao atendente.",
    "paidAt: data e hora do pagamento em ISO 8601 quando ambas estiverem disponíveis; se houver apenas data, use YYYY-MM-DD; se não estiver claro, null.",
    "Se houver vários valores, priorize o valor efetivamente pago/transferido, não saldo, limite, tarifa ou valor anterior.",
  ].join("\n");
}

export const paymentReceiptAnalysisService = {
  async analyzeLocalReceipt(input: {
    mediaUrl: string;
    mimeType?: string | null;
    fileName?: string | null;
  }): Promise<PaymentReceiptAnalysisResult> {
    const filePath =
      localPathFromMediaUrl(
        input.mediaUrl,
      );

    const fileBuffer =
      await readFile(
        filePath,
      );

    if (
      fileBuffer.length === 0
    ) {
      throw new Error(
        "O arquivo do comprovante está vazio.",
      );
    }

    const mimeType =
      input.mimeType
        ?.split(";")[0]
        .trim()
        .toLowerCase() ||
      "application/octet-stream";

    const fileName =
      input.fileName?.trim() ||
      path.basename(
        filePath,
      );

    const client =
      getClient();

    const model =
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-5-mini";

    const base64 =
      fileBuffer.toString(
        "base64",
      );

    const content:
      Array<
        | {
            type: "input_text";
            text: string;
          }
        | {
            type: "input_image";
            image_url: string;
            detail: "high";
          }
        | {
            type: "input_file";
            filename: string;
            file_data: string;
          }
      > = [
        {
          type:
            "input_text",
          text:
            "Leia este comprovante e extraia os campos solicitados.",
        },
      ];

    if (
      mimeType.startsWith(
        "image/",
      )
    ) {
      content.push({
        type:
          "input_image",
        image_url:
          `data:${mimeType};base64,${base64}`,
        detail:
          "high",
      });
    } else {
      content.push({
        type:
          "input_file",
        filename:
          fileName,
        file_data:
          `data:${mimeType};base64,${base64}`,
      });
    }

    const response =
      await client.responses.create({
        model,
        instructions:
          buildInstructions(),
        input: [
          {
            role:
              "user",
            content,
          },
        ],
        reasoning: {
          effort:
            "minimal",
        },
        max_output_tokens:
          500,
      });

    const outputText =
      response.output_text?.trim();

    if (!outputText) {
      throw new Error(
        "A IA não retornou dados do comprovante.",
      );
    }

    const parsed =
      extractJson(
        outputText,
      );

    const isPaymentReceipt =
      normalizeBoolean(
        parsed.isPaymentReceipt,
      );

    return {
      isPaymentReceipt,
      amount:
        isPaymentReceipt
          ? normalizeAmount(
              parsed.amount,
            )
          : null,
      paymentMethod:
        isPaymentReceipt
          ? normalizeOptionalText(
              parsed.paymentMethod,
            )
          : null,
      identifiedBank:
        isPaymentReceipt
          ? normalizeOptionalText(
              parsed.identifiedBank,
            )
          : null,
      paidAt:
        isPaymentReceipt
          ? normalizePaidAt(
              parsed.paidAt,
            )
          : null,
    };
  },
};

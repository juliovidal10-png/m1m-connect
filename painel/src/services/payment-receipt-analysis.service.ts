
import OpenAI from "openai";
import { receiptStorageService } from "@/services/storage/receipt-storage.service";

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

function buildInstructions() {
  return [
    "Você analisa comprovantes de pagamento brasileiros.",
    "Extraia somente informações claramente visíveis no documento.",
    "Nunca invente dados e nunca use conhecimento externo para completar campos ausentes.",
    "Retorne SOMENTE um objeto JSON válido, sem markdown e sem explicações.",
    'Formato exato: {"isPaymentReceipt":boolean,"amount":number|null,"paymentMethod":string|null,"identifiedBank":string|null,"paidAt":string|null}.',
    "isPaymentReceipt: true somente quando houver evidência positiva e clara de que um pagamento, transferência ou quitação foi efetivamente realizado/concluído. A mera presença de valor, banco, PIX, boleto, cobrança, dados financeiros ou linguagem sobre pagamento não é suficiente. Diferencie documento/instrumento para pagamento de comprovante de pagamento realizado. Use false para boleto ainda a pagar, cobrança, fatura pendente, orçamento, holerite/contracheque, demonstrativo ou recibo salarial, e documentos que apenas informem valores, dados bancários ou obrigação de pagamento. Use true para PIX efetivamente realizado, transferência concluída, comprovante de boleto efetivamente pago e recibo que realmente documente quitação/pagamento realizado. Em caso de dúvida ou ausência de evidência suficiente de liquidação/pagamento realizado, use false.",
    "Quando isPaymentReceipt for false, mantenha amount, paymentMethod, identifiedBank e paidAt como null.",
    "amount: valor efetivamente pago/transferido, em reais, usando número decimal.",
    'paymentMethod: use valores curtos como "PIX", "TED", "DOC", "Transferência", "Depósito", "Boleto" ou null.',
    "identifiedBank: antes de preencher este campo, determine separadamente os papéis das instituições financeiras presentes no documento: pagador/remetente/origem, recebedor/beneficiário/destino e emissor do comprovante. Retorne somente a instituição financeira de origem/emissão ligada ao pagador/remetente. Uma instituição informada dentro dos dados ou da seção do recebedor/beneficiário representa o destino e não deve ser usada como identifiedBank por esse motivo, inclusive quando estiver rotulada simplesmente como Instituição. Quando o comprovante for claramente emitido pelo banco ou aplicativo da origem, cabeçalho, marca, logotipo e identidade visual inequívoca do emissor podem ser usados como evidência da instituição de origem/emissão, mesmo que a instituição do recebedor esteja explicitamente escrita em outro campo. Não escolha uma instituição apenas por ser o nome bancário textual mais explícito do documento. Se houver múltiplas instituições, resolva primeiro o papel de cada uma e só então preencha identifiedBank. Se a instituição de origem/emissão não puder ser determinada com segurança, use null. A ausência de identifiedBank, sozinha, não invalida um comprovante verdadeiro.",
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
    const fileBuffer =
      await receiptStorageService.read(
        input.mediaUrl,
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
      (input.mediaUrl.split("/").pop() || "comprovante");

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

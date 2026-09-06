import OpenAI from "openai";

export type AIProviderInput = {
  systemPrompt: string;
  userPrompt: string;
};

export type AIProviderHumanHandoffReason =
  | "CUSTOMER_REQUEST"
  | "INFORMATION_UNAVAILABLE"
  | "HUMAN_ACTION_REQUIRED"
  | "BUSINESS_RULE"
  | "OTHER";

export type AIProviderHandoffReason =
  | "NONE"
  | AIProviderHumanHandoffReason;

type AIProviderUsage = {
  responseId: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AIProviderResult =
  | (AIProviderUsage & {
      text: string;
      needsHuman: false;
      handoffReason: "NONE";
      subject: null;
      context: null;
    })
  | (AIProviderUsage & {
      text: string;
      needsHuman: true;
      handoffReason: AIProviderHumanHandoffReason;
      subject: string | null;
      context: string | null;
    });

type StructuredAIResponse =
  | {
      replyText: string;
      needsHuman: false;
      handoffReason: "NONE";
      subject: null;
      context: null;
    }
  | {
      replyText: string;
      needsHuman: true;
      handoffReason: AIProviderHumanHandoffReason;
      subject: string | null;
      context: string | null;
    };

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalizedValue;
}

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

function parseStructuredResponse(
  value: string,
): StructuredAIResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      "A OpenAI retornou uma resposta estruturada inválida.",
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "A OpenAI retornou uma resposta estruturada inválida.",
    );
  }

  const record =
    parsed as Record<string, unknown>;

  const replyText =
    typeof record.replyText === "string"
      ? record.replyText.trim()
      : "";

  if (!replyText) {
    throw new Error(
      "A OpenAI não retornou o texto da resposta ao cliente.",
    );
  }

  if (
    typeof record.needsHuman !==
    "boolean"
  ) {
    throw new Error(
      "A OpenAI não retornou uma decisão válida de atendimento humano.",
    );
  }

  const allowedReasons =
    new Set<AIProviderHandoffReason>([
      "NONE",
      "CUSTOMER_REQUEST",
      "INFORMATION_UNAVAILABLE",
      "HUMAN_ACTION_REQUIRED",
      "BUSINESS_RULE",
      "OTHER",
    ]);

  const handoffReason =
    typeof record.handoffReason ===
      "string" &&
    allowedReasons.has(
      record.handoffReason as AIProviderHandoffReason,
    )
      ? (record.handoffReason as AIProviderHandoffReason)
      : null;

  if (!handoffReason) {
    throw new Error(
      "A OpenAI não retornou um motivo válido para a decisão de atendimento humano.",
    );
  }

  const subject =
    typeof record.subject === "string"
      ? record.subject.trim() || null
      : null;

  const context =
    typeof record.context === "string"
      ? record.context.trim() || null
      : null;

  if (!record.needsHuman) {
    if (
      handoffReason !== "NONE" ||
      subject !== null ||
      context !== null
    ) {
      throw new Error(
        "A decisão estruturada da IA é inconsistente para atendimento sem handoff.",
      );
    }

    return {
      replyText,
      needsHuman: false,
      handoffReason: "NONE",
      subject: null,
      context: null,
    };
  }

  if (handoffReason === "NONE") {
    throw new Error(
      "A decisão estruturada da IA é inconsistente para atendimento com handoff.",
    );
  }

  return {
    replyText,
    needsHuman: true,
    handoffReason:
      handoffReason as AIProviderHumanHandoffReason,
    subject,
    context,
  };
}

export const openAIProviderService = {
  async generateResponse(
    input: AIProviderInput,
  ): Promise<AIProviderResult> {
    const systemPrompt =
      requireText(
        input.systemPrompt,
        "Prompt do sistema",
      );

    const userPrompt =
      requireText(
        input.userPrompt,
        "Mensagem do cliente",
      );

    const model =
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-5-mini";

    const client = getClient();

    const response =
      await client.responses.create({
        model,
        instructions:
          systemPrompt,
        input:
          userPrompt,
        reasoning: {
          effort: "minimal",
        },
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name:
              "m1m_customer_response",
            strict: true,
            description:
              "Resposta ao cliente e decisão operacional sobre necessidade de atendimento humano.",
            schema: {
              type: "object",
              additionalProperties:
                false,
              properties: {
                replyText: {
                  type: "string",
                  description:
                    "Texto natural, curto e pronto para ser enviado ao cliente no WhatsApp.",
                },
                needsHuman: {
                  type: "boolean",
                  description:
                    "True somente quando o atendimento precisa ser encaminhado para uma pessoa.",
                },
                handoffReason: {
                  type: "string",
                  enum: [
                    "NONE",
                    "CUSTOMER_REQUEST",
                    "INFORMATION_UNAVAILABLE",
                    "HUMAN_ACTION_REQUIRED",
                    "BUSINESS_RULE",
                    "OTHER",
                  ],
                  description:
                    "Motivo operacional da decisão. Use NONE quando needsHuman for false.",
                },
                subject: {
                  type: [
                    "string",
                    "null",
                  ],
                  description:
                    "Assunto principal do pedido do cliente quando houver handoff; caso contrário, null.",
                },
                context: {
                  type: [
                    "string",
                    "null",
                  ],
                  description:
                    "Resumo objetivo do que o atendente humano precisa saber quando houver handoff; caso contrário, null.",
                },
              },
              required: [
                "replyText",
                "needsHuman",
                "handoffReason",
                "subject",
                "context",
              ],
            },
          },
        },
      });

    const rawText =
      response.output_text?.trim();

    if (!rawText) {
      const incompleteReason =
        response.incomplete_details?.reason;

      throw new Error(
        incompleteReason
          ? `A OpenAI não retornou texto. Motivo: ${incompleteReason}.`
          : "A OpenAI não retornou uma resposta em texto.",
      );
    }

    const structuredResponse =
      parseStructuredResponse(
        rawText,
      );

    const usage: AIProviderUsage = {
      responseId:
        response.id,
      model:
        response.model,
      inputTokens:
        response.usage?.input_tokens ??
        null,
      outputTokens:
        response.usage?.output_tokens ??
        null,
      totalTokens:
        response.usage?.total_tokens ??
        null,
    };

    if (structuredResponse.needsHuman) {
      return {
        ...usage,
        text:
          structuredResponse.replyText,
        needsHuman: true,
        handoffReason:
          structuredResponse.handoffReason,
        subject:
          structuredResponse.subject,
        context:
          structuredResponse.context,
      };
    }

    return {
      ...usage,
      text:
        structuredResponse.replyText,
      needsHuman: false,
      handoffReason: "NONE",
      subject: null,
      context: null,
    };
  },
};

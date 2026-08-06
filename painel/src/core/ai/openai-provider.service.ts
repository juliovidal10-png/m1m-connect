import OpenAI from "openai";

export type AIProviderInput = {
  systemPrompt: string;
  userPrompt: string;
};

export type AIProviderResult = {
  text: string;
  responseId: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
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
        max_output_tokens: 1000,
      });

    const text =
      response.output_text?.trim();

    if (!text) {
      const incompleteReason =
        response.incomplete_details?.reason;

      throw new Error(
        incompleteReason
          ? `A OpenAI não retornou texto. Motivo: ${incompleteReason}.`
          : "A OpenAI não retornou uma resposta em texto.",
      );
    }

    return {
      text,
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
  },
};

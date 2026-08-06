import { NextResponse } from "next/server";

import {
  openAIProviderService,
} from "@/core/ai/openai-provider.service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result =
      await openAIProviderService.generateResponse({
        systemPrompt: [
          "Você está executando um teste técnico do M1M Connect.",
          "Responda em português do Brasil.",
          "Se a conexão estiver funcionando, responda somente com a frase:",
          "M1M Connect conectado com sucesso.",
        ].join("\n"),
        userPrompt:
          "Confirme a conexão.",
      });

    return NextResponse.json({
      success: true,
      message: result.text,
      model: result.model,
      usage: {
        inputTokens:
          result.inputTokens,
        outputTokens:
          result.outputTokens,
        totalTokens:
          result.totalTokens,
      },
    });
  } catch (error) {
    console.error(
      "[TESTE OPENAI]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível testar a OpenAI.",
      },
      {
        status: 500,
      },
    );
  }
}

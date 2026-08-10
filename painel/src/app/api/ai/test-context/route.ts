import { NextResponse } from "next/server";

import {
  contextBuilderService,
} from "@/core/context/context-builder.service";
import {
  openAIProviderService,
} from "@/core/ai/openai-provider.service";
import {
  promptBuilderService,
} from "@/core/ai/prompt-builder.service";
import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";

export const runtime = "nodejs";

type TestContextRequest = {
  sectorId?: unknown;
  message?: unknown;
};

function requireText(
  value: unknown,
  fieldName: string,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return value.trim();
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as TestContextRequest;

    const sectorId =
      requireText(
        body.sectorId,
        "Setor",
      );

    const customerMessage =
      requireText(
        body.message,
        "Mensagem",
      );

    const companyId =
      await getAuthenticatedCompanyId();

    const context =
      await contextBuilderService.buildSectorContext(
        companyId,
        sectorId,
      );

    const prompt =
      promptBuilderService.build({
        context,
        customerMessage,
      });

    const result =
      await openAIProviderService.generateResponse({
        systemPrompt:
          prompt.systemPrompt,
        userPrompt:
          prompt.userPrompt,
      });

    return NextResponse.json({
      success: true,
      company: {
        id:
          context.company.id,
        name:
          context.company.name,
      },
      sector: {
        id:
          context.sector.id,
        name:
          context.sector.name,
      },
      responsiblesCount:
        context.responsibles.length,
      hasKnowledge:
        Boolean(
          context.sector.knowledge?.trim(),
        ),
      response:
        result.text,
      model:
        result.model,
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
      "[TESTE CONTEXTO IA]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível testar o contexto da IA.",
      },
      {
        status: 500,
      },
    );
  }
}

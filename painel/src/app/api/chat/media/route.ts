import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

type MediaRequestBody = {
  message?: unknown;
  convertToMp4?: boolean;
};

type EvolutionMediaResponse = {
  mediaType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  size?: number | null;
  mimetype?: string | null;
  base64?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as MediaRequestBody;

    if (!body.message) {
      return NextResponse.json(
        {
          error:
            "A mensagem de mídia é obrigatória.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          message: body.message,
          convertToMp4: body.convertToMp4 ?? false,
        }),
        cache: "no-store",
      },
    );

    const data =
      (await response.json()) as EvolutionMediaResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível recuperar a mídia.",
          details: data,
        },
        { status: response.status },
      );
    }

    if (!data.base64) {
      return NextResponse.json(
        {
          error:
            "A Evolution API não retornou o conteúdo da mídia.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      mediaType: data.mediaType ?? null,
      fileName: data.fileName ?? null,
      caption: data.caption ?? null,
      size: data.size ?? null,
      mimetype:
        data.mimetype ?? "application/octet-stream",
      base64: data.base64,
    });
  } catch (error) {
    console.error("Erro ao recuperar mídia:", error);

    return NextResponse.json(
      {
        error:
          "Erro interno ao recuperar a mídia.",
      },
      { status: 500 },
    );
  }
}
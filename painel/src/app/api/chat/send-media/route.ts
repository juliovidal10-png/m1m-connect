import {
  after,
  NextRequest,
  NextResponse,
} from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

type MediaType =
  | "image"
  | "document"
  | "video"
  | "audio";

const ALLOWED_MEDIA_TYPES = new Set<MediaType>([
  "image",
  "document",
  "video",
  "audio",
]);

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

    const incomingFormData =
      await request.formData();

    const remoteJid = String(
      incomingFormData.get("remoteJid") ?? "",
    ).trim();

    const mediaType = String(
      incomingFormData.get("mediatype") ?? "",
    ).trim() as MediaType;

    const caption = String(
      incomingFormData.get("caption") ?? "",
    ).trim();

    const fileValue =
      incomingFormData.get("file");

    if (!remoteJid) {
      return NextResponse.json(
        {
          error: "Conversa não identificada.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
      return NextResponse.json(
        {
          error:
            "O tipo de mídia informado é inválido.",
        },
        { status: 400 },
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          error: "Nenhum arquivo foi selecionado.",
        },
        { status: 400 },
      );
    }

    if (fileValue.size === 0) {
      return NextResponse.json(
        {
          error: "O arquivo selecionado está vazio.",
        },
        { status: 400 },
      );
    }

    const fileName =
      fileValue.name || "arquivo";

    const mimeType =
      fileValue.type ||
      "application/octet-stream";

    const fileBuffer =
      await fileValue.arrayBuffer();

    after(async () => {
      try {
        const evolutionFormData =
          new FormData();

        evolutionFormData.append(
          "number",
          remoteJid,
        );

        evolutionFormData.append(
          "mediatype",
          mediaType,
        );

        evolutionFormData.append(
          "mimetype",
          mimeType,
        );

        evolutionFormData.append(
          "fileName",
          fileName,
        );

        if (caption) {
          evolutionFormData.append(
            "caption",
            caption,
          );
        }

        const evolutionFile = new File(
          [fileBuffer],
          fileName,
          {
            type: mimeType,
          },
        );

        evolutionFormData.append(
          "file",
          evolutionFile,
          fileName,
        );

        const response = await fetch(
          `${API_URL}/message/sendMedia/${INSTANCE_NAME}`,
          {
            method: "POST",
            headers: {
              apikey: API_KEY,
            },
            body: evolutionFormData,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const details =
            await response.text();

          console.error(
            "[ENVIO DE MÍDIA] Evolution recusou o arquivo:",
            {
              status: response.status,
              details,
            },
          );

          return;
        }

        await response.body?.cancel();

        console.log(
          "[ENVIO DE MÍDIA] Arquivo encaminhado com sucesso:",
          fileName,
        );
      } catch (error) {
        console.error(
          "[ENVIO DE MÍDIA] Falha no envio em segundo plano:",
          error,
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        status: "PROCESSING",
        message:
          "Arquivo recebido e encaminhado para envio.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(
      "Erro ao preparar envio de mídia:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao preparar o arquivo.",
      },
      { status: 500 },
    );
  }
}

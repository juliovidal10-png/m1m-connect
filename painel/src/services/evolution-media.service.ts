type EvolutionMediaResponse = {
  mediaType?: string | null;
  fileName?: string | null;
  caption?: string | null;
  size?: unknown;
  mimetype?: string | null;
  base64?: string | null;
};

export type RecoveredEvolutionMedia = {
  buffer: Buffer;
  mediaType: string | null;
  fileName: string | null;
  caption: string | null;
  size: unknown;
  mimeType: string | null;
};

export class EvolutionMediaRecoveryError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "EvolutionMediaRecoveryError";
    this.status = status;
  }
}

function text(value?: string | null) {
  return value?.trim() || null;
}

function stripDataUrl(value: string) {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma >= 0 ? value.slice(comma + 1) : value;
}

export const evolutionMediaService = {
  async recover(input: {
    instanceName: string;
    message: unknown;
    convertToMp4?: boolean;
  }): Promise<RecoveredEvolutionMedia> {
    const apiUrl = process.env.EVOLUTION_API_URL?.trim();
    const apiKey = process.env.EVOLUTION_API_KEY?.trim();
    const instanceName = input.instanceName.trim();

    if (!apiUrl || !apiKey) {
      throw new EvolutionMediaRecoveryError("Evolution API nao configurada.");
    }

    if (!instanceName || !input.message) {
      throw new EvolutionMediaRecoveryError(
        "Instancia e mensagem de midia sao obrigatorias.",
        400,
      );
    }

    const response = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: input.message,
          convertToMp4: input.convertToMp4 ?? false,
        }),
        cache: "no-store",
      },
    );

    const responseText = await response.text();
    let data: EvolutionMediaResponse = {};

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText) as EvolutionMediaResponse;
      } catch {
        throw new EvolutionMediaRecoveryError(
          "A Evolution retornou uma resposta de midia invalida.",
          response.ok ? 502 : response.status,
        );
      }
    }

    if (!response.ok) {
      throw new EvolutionMediaRecoveryError(
        `Evolution retornou ${response.status} ao recuperar a midia.`,
        response.status,
      );
    }

    const base64 = text(data.base64);
    if (!base64) {
      throw new EvolutionMediaRecoveryError(
        "A Evolution nao retornou o conteudo da midia.",
        502,
      );
    }

    const buffer = Buffer.from(stripDataUrl(base64), "base64");
    if (buffer.length === 0) {
      throw new EvolutionMediaRecoveryError(
        "A midia recuperada esta vazia.",
        502,
      );
    }

    return {
      buffer,
      mediaType: text(data.mediaType),
      fileName: text(data.fileName),
      caption: text(data.caption),
      size: data.size ?? null,
      mimeType: text(data.mimetype),
    };
  },
};

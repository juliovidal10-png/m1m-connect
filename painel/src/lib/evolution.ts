const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

const EVOLUTION_REQUEST_TIMEOUT_MS = 12_000;

function validateConfig() {
  if (!API_URL || !API_KEY) {
    throw new Error(
      "Configuração da Evolution API não encontrada.",
    );
  }
}

function validateInstance(instanceName: string) {
  if (!instanceName?.trim()) {
    throw new Error(
      "Instância do WhatsApp não informada.",
    );
  }
}

async function fetchEvolution(
  input: string,
  init: RequestInit = {},
) {
  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      EVOLUTION_REQUEST_TIMEOUT_MS,
    );

  try {
    return await fetch(
      input,
      {
        ...init,
        signal:
          controller.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "A Evolution API demorou demais para responder.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function consumeErrorBody(
  response: Response,
) {
  await response.text().catch(() => "");
}

export async function getInstances() {
  validateConfig();

  const response =
    await fetchEvolution(
      `${API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: API_KEY!,
        },
        cache: "no-store",
      },
    );

  if (!response.ok) {
    await consumeErrorBody(
      response,
    );

    throw new Error(
      "Erro ao buscar instâncias.",
    );
  }

  return response.json();
}

export async function getMessages(
  remoteJid: string,
  instanceName: string,
  maxPages = 100,
) {
  validateConfig();
  validateInstance(instanceName);

  const PAGE_SIZE = 50;
  const MAX_PAGES = Math.max(
    1,
    Math.min(
      Number.isFinite(maxPages)
        ? Math.trunc(maxPages)
        : 100,
      100,
    ),
  );
  const allRecords: unknown[] = [];

  for (
    let page = 1;
    page <= MAX_PAGES;
    page += 1
  ) {
    const requestStartedAt = Date.now();
    let response: Response;
    try {
      response = await fetchEvolution(
        `${API_URL}/chat/findMessages/${instanceName}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            apikey: API_KEY!,
          },
          body: JSON.stringify({
            where: {
              key: {
                remoteJid,
              },
            },
            page,
            offset: PAGE_SIZE,
          }),
          cache: "no-store",
        },
      );
    } catch (error) {
      const elapsedMs = Date.now() - requestStartedAt;
      console.warn("[M1M EVOLUTION PERF]", {
        operation: "chat.findMessages",
        page,
        outcome:
          error instanceof Error &&
          error.message === "A Evolution API demorou demais para responder."
            ? "timeout"
            : "error",
        elapsedMs,
      });
      throw error;
    }

    const responseHeadersMs = Date.now() - requestStartedAt;

    if (!response.ok) {
      const errorBodyStartedAt = Date.now();
      await consumeErrorBody(
        response,
      );
      console.warn("[M1M EVOLUTION PERF]", {
        operation: "chat.findMessages",
        page,
        outcome: "http_error",
        status: response.status,
        responseHeadersMs,
        errorBodyMs: Date.now() - errorBodyStartedAt,
      });

      throw new Error(
        "Erro ao buscar mensagens.",
      );
    }

    const responseBodyStartedAt = Date.now();
    let data: { messages?: { records?: unknown } };
    try {
      data = await response.json() as { messages?: { records?: unknown } };
    } catch (error) {
      console.warn("[M1M EVOLUTION PERF]", {
        operation: "chat.findMessages",
        page,
        outcome: "response_body_error",
        status: response.status,
        responseHeadersMs,
        responseBodyMs: Date.now() - responseBodyStartedAt,
      });
      throw error;
    }

    const responseBodyMs = Date.now() - responseBodyStartedAt;
    if (responseHeadersMs >= 500 || responseBodyMs >= 500) {
      console.info("[M1M EVOLUTION PERF]", {
        operation: "chat.findMessages",
        page,
        outcome: "success",
        status: response.status,
        responseHeadersMs,
        responseBodyMs,
        totalMs: responseHeadersMs + responseBodyMs,
      });
    }

    const records = Array.isArray(
      data?.messages?.records,
    )
      ? data.messages.records
      : [];

    allRecords.push(...records);

    if (records.length < PAGE_SIZE) {
      break;
    }
  }

  return allRecords;
}

export async function sendTextMessage(
  remoteJid: string,
  text: string,
  instanceName: string,
) {
  validateConfig();
  validateInstance(instanceName);

  const normalizedRemoteJid =
    remoteJid.trim();

  const normalizedText =
    text.trim();

  if (!normalizedRemoteJid) {
    throw new Error(
      "Conversa não identificada.",
    );
  }

  if (!normalizedText) {
    throw new Error(
      "A mensagem está vazia.",
    );
  }

  const response =
    await fetchEvolution(
      `${API_URL}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          apikey: API_KEY!,
        },
        body: JSON.stringify({
          number:
            normalizedRemoteJid,
          text:
            normalizedText,
        }),
      },
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Não foi possível enviar a mensagem.",
    );
  }

  return data;
}

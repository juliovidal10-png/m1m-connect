const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

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

export async function getInstances() {
  validateConfig();

  const response = await fetch(
    `${API_URL}/instance/fetchInstances`,
    {
      headers: {
        apikey: API_KEY!,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Erro ao buscar instâncias.",
    );
  }

  return response.json();
}

export async function getMessages(
  remoteJid: string,
  instanceName: string,
) {
  validateConfig();
  validateInstance(instanceName);

  const response = await fetch(
    `${API_URL}/chat/findMessages/${instanceName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY!,
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid,
          },
        },
        page: 1,
        offset: 50,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      "Erro ao buscar mensagens.",
    );
  }

  const data =
    await response.json();

  return data?.messages?.records ?? [];
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

  const response = await fetch(
    `${API_URL}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY!,
      },
      body: JSON.stringify({
        number: normalizedRemoteJid,
        text: normalizedText,
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

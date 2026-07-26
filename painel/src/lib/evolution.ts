const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

const DEFAULT_INSTANCE = "Financeiro";

function validateConfig() {
  if (!API_URL || !API_KEY) {
    throw new Error("Configuração da Evolution API não encontrada.");
  }
}

export async function getInstances() {
  validateConfig();

  const response = await fetch(`${API_URL}/instance/fetchInstances`, {
    headers: {
      apikey: API_KEY!,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar instâncias.");
  }

  return response.json();
}

export async function getMessages(
  remoteJid: string,
  instanceName = DEFAULT_INSTANCE,
) {
  validateConfig();

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
    throw new Error("Erro ao buscar mensagens.");
  }

  const data = await response.json();

  return data?.messages?.records ?? [];
}
import { NextResponse } from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

type EvolutionContact = {
  id?: string;
  remoteJid?: string;
  pushName?: string | null;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  isSaved?: boolean;
  type?: string;
};

function normalizeContactsResponse(data: unknown): EvolutionContact[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "value" in data &&
    Array.isArray(
      (data as { value?: EvolutionContact[] }).value,
    )
  ) {
    return (data as { value: EvolutionContact[] }).value;
  }

  return [];
}

export async function GET() {
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

    const response = await fetch(
      `${API_URL}/chat/findContacts/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          where: {},
        }),
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível buscar os contatos.",
          details: data,
        },
        { status: response.status },
      );
    }

    const contacts = normalizeContactsResponse(data)
      .filter(
        (contact) =>
          typeof contact.remoteJid === "string" &&
          contact.remoteJid.length > 0,
      )
      .map((contact) => ({
        id: contact.id ?? null,
        remoteJid: contact.remoteJid,
        pushName:
          typeof contact.pushName === "string"
            ? contact.pushName.trim() || null
            : null,
        profilePicUrl:
          contact.profilePicUrl ?? null,
        isGroup: Boolean(contact.isGroup),
        isSaved: Boolean(contact.isSaved),
        type: contact.type ?? null,
      }));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Erro ao buscar contatos:", error);

    return NextResponse.json(
      {
        error:
          "Erro interno ao buscar os contatos.",
      },
      { status: 500 },
    );
  }
}
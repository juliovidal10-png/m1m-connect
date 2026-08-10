import { NextResponse } from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

type EvolutionContact = {
  id?: string;
  remoteJid?: string;
  pushName?: string | null;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  isSaved?: boolean;
  type?: string;
};

type EvolutionInstance = {
  name?: string | null;
  ownerJid?: string | null;
  profileName?: string | null;
};

function normalizeContactsResponse(
  data: unknown,
): EvolutionContact[] {
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

function normalizeInstancesResponse(
  data: unknown,
): EvolutionInstance[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "value" in data &&
    Array.isArray(
      (data as { value?: EvolutionInstance[] }).value,
    )
  ) {
    return (data as { value: EvolutionInstance[] }).value;
  }

  return [];
}

function normalizeJid(
  value?: string | null,
) {
  return value?.trim().toLowerCase() || "";
}

function isPhoneLikeName(
  value?: string | null,
) {
  const normalized =
    value?.trim() || "";

  if (!normalized) {
    return true;
  }

  const digits =
    normalized.replace(/\D/g, "");

  const letters =
    normalized.replace(
      /[^A-Za-zÀ-ÿ]/g,
      "",
    );

  return (
    digits.length >= 8 &&
    letters.length === 0
  );
}

function repairText(
  value?: string | null,
) {
  const normalized =
    value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

async function getCurrentInstance(
  instanceName: string,
) {
  if (!API_URL || !API_KEY) {
    return null;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/instance/fetchInstances`,
        {
          headers: {
            apikey: API_KEY,
          },
          cache: "no-store",
        },
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    return (
      normalizeInstancesResponse(data)
        .find(
          (instance) =>
            instance.name === instanceName,
        ) ?? null
    );
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        {
          status: 500,
        },
      );
    }

    const companyId =
      await getAuthenticatedCompanyId();

    const company =
      await companyRepository.findById(
        companyId,
      );

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Empresa não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    const instanceName =
      company.whatsappInstanceName?.trim();

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância do WhatsApp não configurada para esta empresa.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      response,
      currentInstance,
    ] = await Promise.all([
      fetch(
        `${API_URL}/chat/findContacts/${instanceName}`,
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
      ),
      getCurrentInstance(instanceName),
    ]);

    const data =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível buscar os contatos.",
          details:
            data,
          instanceName,
        },
        {
          status: response.status,
        },
      );
    }

    const ownerJid =
      normalizeJid(
        currentInstance?.ownerJid,
      );

    const ownerName =
      repairText(
        currentInstance?.profileName,
      );

    const contacts =
      normalizeContactsResponse(data)
        .filter(
          (contact) =>
            typeof contact.remoteJid === "string" &&
            contact.remoteJid.length > 0,
        )
        .map(
          (contact) => {
            const remoteJid =
              normalizeJid(
                contact.remoteJid,
              );

            const originalName =
              repairText(
                contact.pushName,
              );

            const isOwner =
              Boolean(
                ownerJid &&
                remoteJid === ownerJid,
              );

            const pushName =
              isOwner &&
              ownerName &&
              isPhoneLikeName(originalName)
                ? ownerName
                : originalName;

            return {
              id:
                contact.id ?? null,
              remoteJid:
                contact.remoteJid,
              pushName,
              profilePicUrl:
                contact.profilePicUrl ?? null,
              isGroup:
                Boolean(contact.isGroup),
              isSaved:
                Boolean(contact.isSaved),
              type:
                contact.type ?? null,
            };
          },
        );

    return NextResponse.json(
      contacts,
    );
  } catch (error) {
    console.error(
      "Erro ao buscar contatos:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao buscar os contatos.",
      },
      {
        status: 500,
      },
    );
  }
}

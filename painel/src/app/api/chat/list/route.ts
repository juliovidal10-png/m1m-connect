import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

const COMPANY_ID =
  process.env.M1M_COMPANY_ID ||
  "empresa-teste";

type EvolutionChat = {
  remoteJid?: string | null;
  canonicalJid?: string | null;
  pushName?: string | null;
  profilePicUrl?: string | null;
  lastMessage?: {
    key?: {
      remoteJid?: string | null;
      remoteJidAlt?: string | null;
    } | null;
  } | null;
  [key: string]: unknown;
};

function normalizeText(
  value?: string | null,
) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function normalizeJid(
  value?: string | null,
) {
  return value
    ?.trim()
    .toLowerCase() || "";
}

function normalizePhone(
  value?: string | null,
) {
  return value?.replace(/\D/g, "") || "";
}

function getChatIdentities(
  chat: EvolutionChat,
) {
  const possibleValues = [
    chat.remoteJid,
    chat.canonicalJid,
    chat.lastMessage?.key?.remoteJid,
    chat.lastMessage?.key?.remoteJidAlt,
  ];

  const identities = new Set<string>();

  for (const value of possibleValues) {
    const jid = normalizeJid(value);
    const phone = normalizePhone(value);

    if (jid) {
      identities.add(jid);
    }

    if (phone) {
      identities.add(phone);
    }
  }

  return identities;
}

export async function GET() {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuracao da Evolution API nao encontrada.",
        },
        {
          status: 500,
        },
      );
    }

    const evolutionResponse = await fetch(
      `${API_URL}/chat/findChats/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          where: {},
          take: 200,
          skip: 0,
        }),
        cache: "no-store",
      },
    );

    const evolutionData =
      await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Nao foi possivel buscar as conversas.",
          details: evolutionData,
        },
        {
          status: evolutionResponse.status,
        },
      );
    }

    const chats: EvolutionChat[] =
      Array.isArray(evolutionData)
        ? evolutionData
        : Array.isArray(evolutionData?.value)
          ? evolutionData.value
          : [];

    const customers =
      await prisma.m1MCustomer.findMany({
        where: {
          companyId: COMPANY_ID,
        },
      });

    const customerMap = new Map<
      string,
      (typeof customers)[number]
    >();

    for (const customer of customers) {
      const remoteJid =
        normalizeJid(customer.remoteJid);

      const remoteJidPhone =
        normalizePhone(customer.remoteJid);

      const customerPhone =
        normalizePhone(customer.phone);

      if (remoteJid) {
        customerMap.set(
          remoteJid,
          customer,
        );
      }

      if (remoteJidPhone) {
        customerMap.set(
          remoteJidPhone,
          customer,
        );
      }

      if (customerPhone) {
        customerMap.set(
          customerPhone,
          customer,
        );
      }
    }

    const mergedChats = chats.map(
      (chat) => {
        const identities =
          getChatIdentities(chat);

        let customer:
          | (typeof customers)[number]
          | undefined;

        for (const identity of identities) {
          const matchingCustomer =
            customerMap.get(identity);

          if (matchingCustomer) {
            customer =
              matchingCustomer;

            break;
          }
        }

        if (!customer) {
          return chat;
        }

        const officialName =
          normalizeText(customer.name);

        return {
          ...chat,

          /*
           * O CRM e a fonte oficial do nome.
           * A Evolution so sera usada quando
           * ainda nao existir nome salvo.
           */
          pushName:
            officialName ||
            normalizeText(chat.pushName),

          crmCustomerId: customer.id,
          crmName: customer.name,
          crmPhone: customer.phone,
          crmCompany: customer.company,
          crmCity: customer.city,
          crmResponsible:
            customer.responsible,
          crmResponsibleId:
            customer.responsibleId,
          crmObservations:
            customer.observations,
          crmStatus:
            customer.status || "IA",
          crmAssignedAt:
            customer.assignedAt,
          crmReleasedAt:
            customer.releasedAt,
          crmUpdatedAt:
            customer.updatedAt,
        };
      },
    );

    return NextResponse.json(
      mergedChats,
    );
  } catch (error) {
    console.error(
      "Erro ao buscar e unificar conversas:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao buscar as conversas.",
      },
      {
        status: 500,
      },
    );
  }
}

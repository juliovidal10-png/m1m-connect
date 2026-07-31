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

type EvolutionGroupInfo = {
  id?: string | null;
  subject?: string | null;
};

const groupSubjectCache =
  new Map<string, string>();

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

function isGroupJid(
  value?: string | null,
) {
  return normalizeJid(value).endsWith(
    "@g.us",
  );
}

function getPrimaryRemoteJid(
  chat: EvolutionChat,
) {
  const possibleValues = [
    chat.remoteJid,
    chat.canonicalJid,
    chat.lastMessage?.key?.remoteJid,
    chat.lastMessage?.key?.remoteJidAlt,
  ];

  for (const value of possibleValues) {
    const jid = normalizeJid(value);

    if (jid) {
      return jid;
    }
  }

  return "";
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

async function getGroupSubject(
  groupJid: string,
) {
  const normalizedGroupJid =
    normalizeJid(groupJid);

  if (!normalizedGroupJid) {
    return null;
  }

  const cachedSubject =
    groupSubjectCache.get(
      normalizedGroupJid,
    );

  if (cachedSubject) {
    return cachedSubject;
  }

  try {
    const groupResponse = await fetch(
      `${API_URL}/group/findGroupInfos/${INSTANCE_NAME}?groupJid=${encodeURIComponent(
        normalizedGroupJid,
      )}`,
      {
        method: "GET",
        headers: {
          apikey: API_KEY || "",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      },
    );

    if (!groupResponse.ok) {
      return null;
    }

    const groupData =
      (await groupResponse.json()) as
        EvolutionGroupInfo;

    const subject =
      normalizeText(groupData.subject);

    if (subject) {
      groupSubjectCache.set(
        normalizedGroupJid,
        subject,
      );
    }

    return subject;
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

    const groupJids = Array.from(
      new Set(
        chats
          .map((chat) =>
            getPrimaryRemoteJid(chat),
          )
          .filter((jid) =>
            isGroupJid(jid),
          ),
      ),
    );

    const groupSubjectEntries =
      await Promise.all(
        groupJids.map(
          async (groupJid) => {
            const subject =
              await getGroupSubject(
                groupJid,
              );

            return [
              groupJid,
              subject,
            ] as const;
          },
        ),
      );

    const groupSubjectMap =
      new Map<string, string>();

    for (const [
      groupJid,
      subject,
    ] of groupSubjectEntries) {
      if (subject) {
        groupSubjectMap.set(
          groupJid,
          subject,
        );
      }
    }

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

        const primaryRemoteJid =
          getPrimaryRemoteJid(chat);

        const groupSubject =
          groupSubjectMap.get(
            primaryRemoteJid,
          ) || null;

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
          return {
            ...chat,
            pushName:
              groupSubject ||
              normalizeText(chat.pushName),
            groupSubject,
          };
        }

        const officialName =
          normalizeText(customer.name);

        const displayName =
          groupSubject ||
          officialName ||
          normalizeText(chat.pushName);

        return {
          ...chat,

          /*
           * Para grupos, o subject retornado
           * pela Evolution e o nome oficial.
           *
           * Para contatos individuais, o CRM
           * continua sendo a fonte oficial.
           */
          pushName: displayName,

          groupSubject,

          crmCustomerId: customer.id,
          crmName:
            groupSubject ||
            customer.name,
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

import {
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  M1MUserPermission,
} from "@/generated/prisma/enums";
import { NextResponse } from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  companyRepository,
} from "@/repositories/company.repository";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

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

  const identities =
    new Set<string>();

  for (const value of possibleValues) {
    const jid = normalizeJid(value);

    if (!jid) {
      continue;
    }

    identities.add(jid);

    /*
     * Numero puro so pode participar do merge
     * para JIDs individuais do WhatsApp.
     * IDs de grupo (@g.us) e LID nao podem
     * virar telefone, pois isso pode casar
     * chats diferentes com o mesmo cliente.
     */
    if (
      jid.endsWith("@s.whatsapp.net") ||
      !jid.includes("@")
    ) {
      const phone = normalizePhone(value);

      if (phone) {
        identities.add(phone);
      }
    }
  }

  return identities;
}

async function getGroupSubject(
  groupJid: string,
  instanceName: string,
) {
  const normalizedGroupJid =
    normalizeJid(groupJid);

  if (!normalizedGroupJid) {
    return null;
  }

  const cacheKey =
    `${instanceName}:${normalizedGroupJid}`;

  const cachedSubject =
    groupSubjectCache.get(cacheKey);

  if (cachedSubject) {
    return cachedSubject;
  }

  try {
    const groupResponse = await fetch(
      `${API_URL}/group/findGroupInfos/${encodeURIComponent(
        instanceName,
      )}?groupJid=${encodeURIComponent(
        normalizedGroupJid,
      )}`,
      {
        method: "GET",
        headers: {
          apikey: API_KEY || "",
        },
        cache: "no-store",
        signal:
          AbortSignal.timeout(2000),
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
        cacheKey,
        subject,
      );
    }

    return subject;
  } catch {
    return null;
  }
}

async function fetchAllEvolutionChats(
  instanceName: string,
) {
  const pageSize = 200;
  const maxPages = 50;

  const allChats: EvolutionChat[] = [];
  const seenIdentities =
    new Set<string>();

  for (
    let page = 0;
    page < maxPages;
    page += 1
  ) {
    const skip =
      page * pageSize;

    const response =
      await fetch(
        `${API_URL}/chat/findChats/${encodeURIComponent(
          instanceName,
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            apikey: API_KEY || "",
          },
          body: JSON.stringify({
            where: {},
            take: pageSize,
            skip,
          }),
          cache: "no-store",
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        `Nao foi possivel buscar as conversas da Evolution. HTTP ${response.status}`,
      );
    }

    const pageChats: EvolutionChat[] =
      Array.isArray(data)
        ? data
        : Array.isArray(
              data?.value,
            )
          ? data.value
          : [];

    if (pageChats.length === 0) {
      break;
    }

    let newIdentities = 0;

    for (const chat of pageChats) {
      const identity =
        getPrimaryRemoteJid(chat);

      if (
        identity &&
        seenIdentities.has(identity)
      ) {
        continue;
      }

      if (identity) {
        seenIdentities.add(identity);
      }

      allChats.push(chat);
      newIdentities += 1;
    }

    if (
      pageChats.length < pageSize ||
      newIdentities === 0
    ) {
      break;
    }
  }

  return allChats;
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

    const authenticatedUser =
      await authorizationService.getCurrentUser();

    const companyId =
      authenticatedUser.companyId;

    const canViewAllConversations =
      authorizationService.hasPermission(
        authenticatedUser,
        M1MUserPermission.VIEW_ALL_CONVERSATIONS,
      );

    const assignedSectorIds =
      canViewAllConversations
        ? []
        : (
            await prisma.m1MSectorUser.findMany({
              where: {
                userId:
                  authenticatedUser.userId,
              },
              select: {
                sectorId: true,
              },
            })
          ).map(
            (assignment) =>
              assignment.sectorId,
          );

    const assignedSectorIdSet =
      new Set(assignedSectorIds);

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
    const chats =
      await fetchAllEvolutionChats(
        instanceName,
      );

    const groupJids =
      Array.from(
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
                instanceName,
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
          companyId,
        },
      });

    const activeAttendances =
      await prisma.m1MAttendance.findMany({
        where: {
          companyId,
          state: {
            in: ["IA", "HUMANO"],
          },
        },
        orderBy: {
          startedAt: "desc",
        },
      });

    const attendanceByCustomerId =
      new Map<
        string,
        (typeof activeAttendances)[number]
      >();

    for (const attendance of activeAttendances) {
      if (
        !attendanceByCustomerId.has(
          attendance.customerId,
        )
      ) {
        attendanceByCustomerId.set(
          attendance.customerId,
          attendance,
        );
      }
    }

    const customerMap =
      new Map<
        string,
        (typeof customers)[number]
      >();

    for (const customer of customers) {
      const remoteJid =
        normalizeJid(
          customer.remoteJid,
        );

      const remoteJidPhone =
        normalizePhone(
          customer.remoteJid,
        );

      const customerPhone =
        normalizePhone(
          customer.phone,
        );

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

    const mergedChats =
      chats.map((chat) => {
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
              normalizeText(
                chat.pushName,
              ),
            groupSubject,
          };
        }

        const officialName =
          normalizeText(
            customer.name,
          );

        const displayName =
          groupSubject ||
          officialName ||
          normalizeText(
            chat.pushName,
          );

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

          attendanceId:
            attendanceByCustomerId.get(
              customer.id,
            )?.id ?? null,
          attendanceState:
            attendanceByCustomerId.get(
              customer.id,
            )?.state ?? null,
          attendanceSectorId:
            attendanceByCustomerId.get(
              customer.id,
            )?.sectorId ?? null,

          crmCustomerId:
            customer.id,
          crmName:
            groupSubject ||
            customer.name,
          crmPhone:
            customer.phone,
          crmCompany:
            customer.company,
          crmCity:
            customer.city,
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
      });

    const visibleChats =
      canViewAllConversations
        ? mergedChats
        : mergedChats.filter((chat) => {
            const sectorId =
              "attendanceSectorId" in chat
                ? chat.attendanceSectorId ??
                  null
                : null;

            const attendanceState =
              "attendanceState" in chat
                ? chat.attendanceState ?? null
                : null;

            return (
              attendanceState === "HUMANO" &&
              !!sectorId &&
              assignedSectorIdSet.has(sectorId)
            );
          });

    return NextResponse.json(
      visibleChats,
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

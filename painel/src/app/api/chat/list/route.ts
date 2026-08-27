import { authorizationService } from "@/services/auth/authorization.service";
import { M1MUserPermission } from "@/generated/prisma/enums";
import { NextResponse } from "next/server";

import { getAuthenticatedCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { companyRepository } from "@/repositories/company.repository";

const API_URL = process.env.EVOLUTION_API_URL;

const API_KEY = process.env.EVOLUTION_API_KEY;

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

type EnrichedChat = EvolutionChat & {
  pushName: string | null;
  groupSubject: string | null;
  attendanceId?: string | null;
  attendanceState?: string | null;
  attendanceSectorId?: string | null;
  attendanceResponsibleId?: string | null;
  crmCustomerId?: string | null;
  crmName?: string | null;
  crmPhone?: string | null;
  crmCompany?: string | null;
  crmCity?: string | null;
  crmResponsible?: string | null;
  crmResponsibleId?: string | null;
  crmObservations?: string | null;
  crmStatus?: string | null;
  crmAssignedAt?: unknown;
  crmReleasedAt?: unknown;
  crmUpdatedAt?: unknown;
};

const groupSubjectCache = new Map<string, string>();

function normalizeText(value?: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function normalizeJid(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") || "";
}

function isGroupJid(value?: string | null) {
  return normalizeJid(value).endsWith("@g.us");
}

function getPrimaryRemoteJid(chat: EvolutionChat) {
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

function getChatIdentities(chat: EvolutionChat) {
  const possibleValues = [
    chat.remoteJid,
    chat.canonicalJid,
    chat.lastMessage?.key?.remoteJid,
    chat.lastMessage?.key?.remoteJidAlt,
  ];

  const identities = new Set<string>();

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
    if (jid.endsWith("@s.whatsapp.net") || !jid.includes("@")) {
      const phone = normalizePhone(value);

      if (phone) {
        identities.add(phone);
      }
    }
  }

  return identities;
}

async function getGroupSubject(groupJid: string, instanceName: string) {
  const normalizedGroupJid = normalizeJid(groupJid);

  if (!normalizedGroupJid) {
    return null;
  }

  const cacheKey = `${instanceName}:${normalizedGroupJid}`;

  const cachedSubject = groupSubjectCache.get(cacheKey);

  if (cachedSubject) {
    return cachedSubject;
  }

  try {
    const groupResponse = await fetch(
      `${API_URL}/group/findGroupInfos/${encodeURIComponent(
        instanceName,
      )}?groupJid=${encodeURIComponent(normalizedGroupJid)}`,
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

    const groupData = (await groupResponse.json()) as EvolutionGroupInfo;

    const subject = normalizeText(groupData.subject);

    if (subject) {
      groupSubjectCache.set(cacheKey, subject);
    }

    return subject;
  } catch {
    return null;
  }
}

type EvolutionChatPageResult = {
  chats: EvolutionChat[];
  reachedEnd: boolean;
};

async function fetchEvolutionChatRange(
  instanceName: string,
  take: number,
  skip: number,
): Promise<EvolutionChatPageResult> {
const response = await fetch(
    `${API_URL}/chat/findChats/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY || "",
      },
      body: JSON.stringify({
        where: {},
        take,
        skip,
      }),
      cache: "no-store",
    },
  );
if (response.ok) {
    const data = await response.json();

    const chats: EvolutionChat[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.value)
        ? data.value
        : [];

    return {
      chats,
      reachedEnd: chats.length < take,
    };
  }

  if (take === 1) {
    console.warn(
      `[M1M CHAT] Evolution ignorou um registro defeituoso em skip=${skip}. HTTP ${response.status}`,
    );

    return {
      chats: [],
      reachedEnd: false,
    };
  }

  const firstTake = Math.floor(take / 2);

  const secondTake = take - firstTake;

  const [first, second] = await Promise.all([
    fetchEvolutionChatRange(instanceName, firstTake, skip),
    fetchEvolutionChatRange(
      instanceName,
      secondTake,
      skip + firstTake,
    ),
  ]);

  if (first.reachedEnd) {
    return first;
  }

  return {
    chats: [...first.chats, ...second.chats],
    reachedEnd: second.reachedEnd,
  };
}

async function fetchAllEvolutionChats(instanceName: string) {
  const pageSize = 200;
  const maxPages = 50;
  const allChats: EvolutionChat[] = [];
  const seenIdentities = new Set<string>();

  for (let page = 0; page < maxPages; page += 1) {
    const pageResult = await fetchEvolutionChatRange(instanceName, pageSize, page * pageSize);
    if (pageResult.chats.length === 0 && pageResult.reachedEnd) break;

    let newIdentities = 0;
    for (const chat of pageResult.chats) {
      const identity = getPrimaryRemoteJid(chat);
      if (identity && seenIdentities.has(identity)) continue;
      if (identity) seenIdentities.add(identity);
      allChats.push(chat);
      newIdentities += 1;
    }

    if (pageResult.reachedEnd || (pageResult.chats.length > 0 && newIdentities === 0)) break;
  }

  return allChats;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request: Request) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json({ error: "ConfiguraÃ§Ã£o da Evolution API nÃ£o encontrada." }, { status: 500 });
    }

    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || "30");
    const requestedOffset = Number(url.searchParams.get("offset") || "0");
    const search = normalizeSearch(url.searchParams.get("search") || "");
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 30, 1), 100);
    const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);

    const authenticatedUser = await authorizationService.getCurrentUser();
    const companyId = authenticatedUser.companyId;
    const canViewAllConversations = authorizationService.hasPermission(
      authenticatedUser,
      M1MUserPermission.VIEW_ALL_CONVERSATIONS,
    );

    const assignedSectorIds = canViewAllConversations
      ? []
      : (await prisma.m1MSectorUser.findMany({
          where: { userId: authenticatedUser.userId },
          select: { sectorId: true },
        })).map((assignment) => assignment.sectorId);
    const assignedSectorIdSet = new Set(assignedSectorIds);

    if (!canViewAllConversations && assignedSectorIds.length === 0) {
      return NextResponse.json({ items: [], hasMore: false });
    }

    const company = await companyRepository.findById(companyId);
    if (!company) return NextResponse.json({ error: "Empresa nÃ£o encontrada." }, { status: 404 });

    const instanceName = company.whatsappInstanceName?.trim();
    if (!instanceName) {
      return NextResponse.json({ error: "InstÃ¢ncia do WhatsApp nÃ£o configurada para esta empresa." }, { status: 400 });
    }

    const [customers, activeAttendances] = await Promise.all([
      prisma.m1MCustomer.findMany({ where: { companyId } }),
      prisma.m1MAttendance.findMany({
        where: { companyId, state: { in: ["IA", "HUMANO"] } },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    const attendanceByCustomerId = new Map<string, (typeof activeAttendances)[number]>();
    for (const attendance of activeAttendances) {
      if (!attendanceByCustomerId.has(attendance.customerId)) {
        attendanceByCustomerId.set(attendance.customerId, attendance);
      }
    }

    const customerMap = new Map<string, (typeof customers)[number]>();
    for (const customer of customers) {
      const remoteJid = normalizeJid(customer.remoteJid);
      const remoteJidPhone = normalizePhone(customer.remoteJid);
      const customerPhone = normalizePhone(customer.phone);
      if (remoteJid) customerMap.set(remoteJid, customer);
      if (remoteJidPhone) customerMap.set(remoteJidPhone, customer);
      if (customerPhone) customerMap.set(customerPhone, customer);
    }

    async function enrich(rawChats: EvolutionChat[]): Promise<EnrichedChat[]> {
      const groupJids: string[] = Array.from(
        new Set(
          rawChats
            .map((chat) => getPrimaryRemoteJid(chat))
            .filter((jid): jid is string => Boolean(jid) && isGroupJid(jid)),
        ),
      );
      const groupSubjectEntries = await Promise.all(
        groupJids.map(async (groupJid) => [groupJid, await getGroupSubject(groupJid, instanceName!)] as const),
      );
      const groupSubjectMap = new Map<string, string>();
      for (const [groupJid, subject] of groupSubjectEntries) if (subject) groupSubjectMap.set(groupJid, subject);

      return rawChats.map((chat) => {
        const identities = getChatIdentities(chat);
        const primaryRemoteJid = getPrimaryRemoteJid(chat);
        const groupSubject = groupSubjectMap.get(primaryRemoteJid) || null;
        let customer: (typeof customers)[number] | undefined;
        for (const identity of identities) {
          const matchingCustomer = customerMap.get(identity);
          if (matchingCustomer) { customer = matchingCustomer; break; }
        }

        if (!customer) {
          return {
            ...chat,
            pushName: groupSubject || normalizeText(chat.pushName),
            groupSubject,
            attendanceId: null,
            attendanceState: null,
            attendanceSectorId: null,
            attendanceResponsibleId: null,
            crmCustomerId: null,
            crmName: null,
            crmPhone: null,
            crmCompany: null,
            crmCity: null,
            crmResponsible: null,
            crmResponsibleId: null,
            crmObservations: null,
            crmStatus: null,
            crmAssignedAt: null,
            crmReleasedAt: null,
            crmUpdatedAt: null,
          };
        }
        const officialName = normalizeText(customer.name);
        const displayName = groupSubject || officialName || normalizeText(chat.pushName);
        const attendance = attendanceByCustomerId.get(customer.id);
        return {
          ...chat,
          pushName: displayName,
          groupSubject,
          attendanceId: attendance?.id ?? null,
          attendanceState: attendance?.state ?? null,
          attendanceSectorId: attendance?.sectorId ?? null,
          attendanceResponsibleId: attendance?.responsibleId ?? null,
          crmCustomerId: customer.id,
          crmName: groupSubject || customer.name,
          crmPhone: customer.phone,
          crmCompany: customer.company,
          crmCity: customer.city,
          crmResponsible: customer.responsible,
          crmResponsibleId: customer.responsibleId,
          crmObservations: customer.observations,
          crmStatus: customer.status || "IA",
          crmAssignedAt: customer.assignedAt,
          crmReleasedAt: customer.releasedAt,
          crmUpdatedAt: customer.updatedAt,
        };
      });
    }

    function visible(items: EnrichedChat[]): EnrichedChat[] {
      if (canViewAllConversations) return items;

      return items.filter((chat) => {
        const isHuman =
          chat.attendanceState === "HUMANO";

        const isAllowedSector =
          !!chat.attendanceSectorId &&
          assignedSectorIdSet.has(
            chat.attendanceSectorId,
          );

        const isAvailableOrMine =
          !chat.attendanceResponsibleId ||
          chat.attendanceResponsibleId ===
            authenticatedUser.userId;

        return (
          isHuman &&
          isAllowedSector &&
          isAvailableOrMine
        );
      });
    }

    if (search) {
      /*
       * Busca rapida:
       * 1) procura primeiro nos clientes do proprio M1M;
       * 2) para os clientes encontrados, consulta a Evolution diretamente
       *    pelo remoteJid, evitando varrer centenas de chats;
       * 3) se nao houver correspondencia no CRM, preserva o fallback
       *    completo para grupos, pushName e texto da ultima mensagem.
       */
      const matchingCustomers = customers.filter((customer) => {
        const haystack = normalizeSearch([
          customer.name,
          customer.phone,
          customer.remoteJid,
          customer.company,
          customer.city,
          customer.responsible,
        ].join(" "));

        return haystack.includes(search);
      });

      if (matchingCustomers.length > 0) {
        const directResults = await Promise.all(
          matchingCustomers.slice(0, 100).map(async (customer) => {
            const remoteJid = normalizeJid(customer.remoteJid);

            if (!remoteJid) {
              return [] as EvolutionChat[];
            }

            const response = await fetch(
              `${API_URL}/chat/findChats/${encodeURIComponent(instanceName)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: API_KEY || "",
                },
                body: JSON.stringify({
                  where: {
                    remoteJid,
                  },
                  take: 20,
                  skip: 0,
                }),
                cache: "no-store",
              },
            );

            if (!response.ok) {
              return [] as EvolutionChat[];
            }

            const data = await response.json();

            return Array.isArray(data)
              ? data
              : Array.isArray(data?.value)
                ? data.value
                : [];
          }),
        );

        const directRaw = directResults.flat();
        const directVisible = visible(await enrich(directRaw));

        const uniqueDirect = new Map<string, EnrichedChat>();

        for (const chat of directVisible) {
          const key =
            chat.crmCustomerId ||
            getPrimaryRemoteJid(chat);

          if (key && !uniqueDirect.has(key)) {
            uniqueDirect.set(key, chat);
          }
        }

        const directMatches = Array.from(
          uniqueDirect.values(),
        ).filter((chat) => {
          const haystack = normalizeSearch([
            chat.pushName,
            chat.groupSubject,
            chat.crmName,
            chat.crmPhone,
            getPrimaryRemoteJid(chat),
          ].join(" "));

          return haystack.includes(search);
        });

        if (directMatches.length > 0) {
          return NextResponse.json({
            items: directMatches.slice(0, 100),
            hasMore: directMatches.length > 100,
          });
        }
      }

      /*
       * Busca rapida de grupos:
       * - usa somente os grupos ja conhecidos no M1M (remoteJid @g.us);
       * - resolve o subject diretamente pelo endpoint de grupo/cache existente;
       * - quando encontra o nome pesquisado, busca apenas aquele JID na Evolution.
       *
       * Isso evita varrer centenas de chats para localizar grupos conhecidos.
       */
      const knownGroupCustomers =
        customers.filter((customer) =>
          isGroupJid(
            customer.remoteJid,
          ),
        );

      if (knownGroupCustomers.length > 0) {
        const groupCandidates =
          await Promise.all(
            knownGroupCustomers.map(
              async (customer) => {
                const groupJid =
                  normalizeJid(
                    customer.remoteJid,
                  );

                if (!groupJid) {
                  return null;
                }

                const groupSubject =
                  await getGroupSubject(
                    groupJid,
                    instanceName,
                  );

                if (
                  !groupSubject ||
                  !normalizeSearch(
                    groupSubject,
                  ).includes(search)
                ) {
                  return null;
                }

                return {
                  customer,
                  groupJid,
                  groupSubject,
                };
              },
            ),
          );

        const matchingGroups =
          groupCandidates.filter(
            (
              item,
            ): item is NonNullable<
              (typeof groupCandidates)[number]
            > => Boolean(item),
          );

        if (matchingGroups.length > 0) {
          const groupDirectResults =
            await Promise.all(
              matchingGroups
                .slice(0, 100)
                .map(async (group) => {
                  const response =
                    await fetch(
                      `${API_URL}/chat/findChats/${encodeURIComponent(instanceName)}`,
                      {
                        method:
                          "POST",
                        headers: {
                          "Content-Type":
                            "application/json",
                          apikey:
                            API_KEY || "",
                        },
                        body:
                          JSON.stringify({
                            where: {
                              remoteJid:
                                group.groupJid,
                            },
                            take:
                              20,
                            skip:
                              0,
                          }),
                        cache:
                          "no-store",
                      },
                    );

                  if (!response.ok) {
                    return [] as EvolutionChat[];
                  }

                  const data =
                    await response.json();

                  return Array.isArray(data)
                    ? data
                    : Array.isArray(
                          data?.value,
                        )
                      ? data.value
                      : [];
                }),
            );

          const groupDirectRaw =
            groupDirectResults.flat();

          const groupDirectVisible =
            visible(
              await enrich(
                groupDirectRaw,
              ),
            );

          const uniqueGroups =
            new Map<
              string,
              EnrichedChat
            >();

          for (
            const chat of
            groupDirectVisible
          ) {
            const key =
              getPrimaryRemoteJid(
                chat,
              );

            if (
              key &&
              !uniqueGroups.has(
                key,
              )
            ) {
              uniqueGroups.set(
                key,
                chat,
              );
            }
          }

          const groupMatches =
            Array.from(
              uniqueGroups.values(),
            ).filter((chat) =>
              normalizeSearch(
                [
                  chat.pushName,
                  chat.groupSubject,
                  chat.crmName,
                  getPrimaryRemoteJid(
                    chat,
                  ),
                ].join(" "),
              ).includes(search),
            );

          if (
            groupMatches.length > 0
          ) {
            return NextResponse.json({
              items:
                groupMatches.slice(
                  0,
                  100,
                ),
              hasMore:
                groupMatches.length >
                100,
            });
          }
        }
      }

      const allRaw = await fetchAllEvolutionChats(instanceName);
      const allVisible = visible(await enrich(allRaw));
      const matches = allVisible.filter((chat) => {
        const haystack = normalizeSearch([
          chat.pushName,
          chat.groupSubject,
          chat.crmName,
          chat.crmPhone,
          getPrimaryRemoteJid(chat),
          JSON.stringify(chat.lastMessage ?? ""),
        ].join(" "));

        return haystack.includes(search);
      });

      return NextResponse.json({
        items: matches.slice(0, 100),
        hasMore: matches.length > 100,
      });
    }

    const wanted = offset + limit + 1;
    const collected: EnrichedChat[] = [];
    const seen = new Set<string>();
    const scanSize = Math.max(60, limit * 2);
    const maxPages = 50;

    for (let page = 0; page < maxPages && collected.length < wanted; page += 1) {
      const result = await fetchEvolutionChatRange(instanceName, scanSize, page * scanSize);
      const uniqueRaw = result.chats.filter((chat) => {
        const id = getPrimaryRemoteJid(chat);
        if (id && seen.has(id)) return false;
        if (id) seen.add(id);
        return true;
      });
      collected.push(...visible(await enrich(uniqueRaw)));
      if (result.reachedEnd) break;
    }

    const pageItems = collected.slice(offset, offset + limit);
    return NextResponse.json({ items: pageItems, hasMore: collected.length > offset + limit });
  } catch (error) {
    console.error("Erro ao buscar e unificar conversas:", error);
    return NextResponse.json({ error: "Erro interno ao buscar as conversas." }, { status: 500 });
  }
}


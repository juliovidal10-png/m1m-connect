import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMessages,
} from "@/lib/evolution";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  authorizationService,
} from "@/services/auth/authorization.service";

type UnknownRecord =
  Record<string, unknown>;

function getRecord(
  value: unknown,
): UnknownRecord | null {
  return value &&
    typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function getText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeDigits(
  value: string,
) {
  return value.replace(/\D/g, "");
}

function getMessageId(
  raw: unknown,
) {
  const record =
    getRecord(raw);

  const key =
    getRecord(record?.key);

  return (
    getText(key?.id) ||
    getText(record?.id)
  );
}

function getMessageTimestamp(
  raw: unknown,
) {
  const record =
    getRecord(raw);

  return Number(
    record?.messageTimestamp ??
      0,
  );
}

function getRemoteJidsFromMessage(
  raw: unknown,
) {
  const record =
    getRecord(raw);

  const key =
    getRecord(record?.key);

  return [
    getText(key?.remoteJid),
    getText(key?.remoteJidAlt),
  ].filter(Boolean);
}

function getChatJids(
  raw: unknown,
) {
  const chat =
    getRecord(raw);

  const lastMessage =
    getRecord(chat?.lastMessage);

  const lastKey =
    getRecord(lastMessage?.key);

  return [
    getText(chat?.remoteJid),
    getText(chat?.canonicalJid),
    getText(lastKey?.remoteJid),
    getText(lastKey?.remoteJidAlt),
  ].filter(Boolean);
}

function getChatArray(
  payload: unknown,
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record =
    getRecord(payload);

  if (
    Array.isArray(record?.records)
  ) {
    return record.records;
  }

  if (
    Array.isArray(record?.value)
  ) {
    return record.value;
  }

  return [];
}

function isIndividualJid(
  jid: string,
) {
  return (
    jid.endsWith(
      "@s.whatsapp.net",
    ) ||
    jid.endsWith("@lid")
  );
}

function jidPhone(
  jid: string,
) {
  if (
    !jid.endsWith(
      "@s.whatsapp.net",
    )
  ) {
    return "";
  }

  return normalizeDigits(
    jid.replace(
      "@s.whatsapp.net",
      "",
    ),
  );
}

function phoneMatches(
  first: string,
  second: string,
) {
  const a =
    normalizeDigits(first);

  const b =
    normalizeDigits(second);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  const aTail =
    a.slice(-11);

  const bTail =
    b.slice(-11);

  return (
    aTail.length >= 10 &&
    bTail.length >= 10 &&
    aTail === bTail
  );
}

function isMediaMessage(
  raw: unknown,
) {
  const record =
    getRecord(raw);

  const explicitType =
    getText(
      record?.messageType,
    );

  if (
    [
      "imageMessage",
      "audioMessage",
      "videoMessage",
      "documentMessage",
    ].includes(explicitType)
  ) {
    return true;
  }

  const message =
    getRecord(record?.message);

  return Boolean(
    message?.imageMessage ||
    message?.audioMessage ||
    message?.videoMessage ||
    message?.documentMessage,
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const authenticatedUser =
      await authorizationService
        .getCurrentUser();

    const companyId =
      authenticatedUser.companyId;

    const remoteJid =
      request.nextUrl.searchParams
        .get("remoteJid")
        ?.trim();

    const phone =
      request.nextUrl.searchParams
        .get("phone")
        ?.trim() ??
      "";

    if (!remoteJid) {
      return NextResponse.json(
        {
          error:
            "remoteJid é obrigatório.",
        },
        {
          status: 400,
        },
      );
    }

    const company =
      await companyRepository
        .findById(companyId);

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
      company
        .whatsappInstanceName
        ?.trim();

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância do WhatsApp não configurada.",
        },
        {
          status: 400,
        },
      );
    }

    const apiUrl =
      process.env
        .EVOLUTION_API_URL
        ?.trim()
        .replace(/\/$/, "");

    const apiKey =
      process.env
        .EVOLUTION_API_KEY
        ?.trim();

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        {
          error:
            "Evolution API não configurada.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * CENTRAL ISOLADA:
     * conjunto proprio de identidades.
     * Nao usa ChatWindow, ChatInbox,
     * conversationSyncService ou banco
     * de mensagens do M1M.
     */
    const candidateJids =
      new Set<string>();

    candidateJids.add(
      remoteJid,
    );

    /*
     * 1) Consulta inicial do JID recebido.
     * Se as mensagens trouxerem remoteJidAlt,
     * adicionamos somente para esta Central.
     */
    const firstMessages =
      (await getMessages(
        remoteJid,
        instanceName,
      )) as unknown[];

    for (
      const message of
        firstMessages
    ) {
      for (
        const jid of
          getRemoteJidsFromMessage(
            message,
          )
      ) {
        if (
          isIndividualJid(jid)
        ) {
          candidateJids.add(jid);
        }
      }
    }

    /*
     * 2) Consulta findChats DIRETAMENTE
     * na Evolution.
     *
     * Serve apenas para a Central localizar
     * identidades PN/LID que a consulta
     * inicial nao revelou.
     */
    try {
      const chatsResponse =
        await fetch(
          `${apiUrl}/chat/findChats/${encodeURIComponent(
            instanceName,
          )}`,
          {
            method: "POST",
            headers: {
              apikey: apiKey,
              "Content-Type":
                "application/json",
            },
            body: "{}",
            cache: "no-store",
          },
        );

      if (chatsResponse.ok) {
        const chatsPayload =
          await chatsResponse.json();

        const chats =
          getChatArray(
            chatsPayload,
          );

        const requestedPhone =
          normalizeDigits(
            phone ||
              jidPhone(
                remoteJid,
              ),
          );

        for (
          const chat of chats
        ) {
          const jids =
            getChatJids(chat);

          if (
            jids.includes(
              remoteJid,
            )
          ) {
            for (
              const jid of jids
            ) {
              if (
                isIndividualJid(
                  jid,
                )
              ) {
                candidateJids.add(
                  jid,
                );
              }
            }

            continue;
          }

          if (
            requestedPhone
          ) {
            const pnMatch =
              jids.some(
                (jid) =>
                  phoneMatches(
                    jidPhone(jid),
                    requestedPhone,
                  ),
              );

            if (pnMatch) {
              for (
                const jid of jids
              ) {
                if (
                  isIndividualJid(
                    jid,
                  )
                ) {
                  candidateJids.add(
                    jid,
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        "CUSTOMER CENTER findChats:",
        error,
      );
    }

    /*
     * 3) Busca independente de mensagens
     * em todas as identidades encontradas.
     */
    const allMessages:
      unknown[] = [];

    for (
      const jid of candidateJids
    ) {
      const records =
        jid === remoteJid
          ? firstMessages
          : ((await getMessages(
              jid,
              instanceName,
            )) as unknown[]);

      allMessages.push(
        ...records,
      );
    }

    /*
     * 4) Somente midias.
     * Deduplicacao apenas dentro da Central.
     */
    const messageMap =
      new Map<string, unknown>();

    for (
      const raw of allMessages
    ) {
      if (!isMediaMessage(raw)) {
        continue;
      }

      const id =
        getMessageId(raw);

      if (!id) {
        continue;
      }

      if (
        !messageMap.has(id)
      ) {
        messageMap.set(
          id,
          raw,
        );
      }
    }

    const mediaMessages =
      [...messageMap.values()]
        .sort(
          (
            first,
            second,
          ) =>
            getMessageTimestamp(
              second,
            ) -
            getMessageTimestamp(
              first,
            ),
        );

    /*
     * Headers temporarios de diagnostico:
     * ajudam a saber se a Central achou
     * mais de uma identidade sem expor dados
     * na interface.
     */
    return NextResponse.json(
      mediaMessages,
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          "X-M1M-Central-Identities":
            String(
              candidateJids.size,
            ),
          "X-M1M-Central-Media":
            String(
              mediaMessages.length,
            ),
        },
      },
    );
  } catch (error) {
    console.error(
      "ERRO CUSTOMER CENTER MEDIA GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar arquivos da Central do Cliente.",
      },
      {
        status: 500,
      },
    );
  }
}
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  customerRepository,
} from "@/repositories/customer.repository";
import {
  messageService,
} from "@/services/message.service";

function getRecord(
  value: unknown,
): Record<string, unknown> | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const authenticatedUser =
      await authorizationService.getCurrentUser();

    const companyId =
      authenticatedUser.companyId;

    const remoteJid =
      request.nextUrl.searchParams
        .get("remoteJid")
        ?.trim();

    if (!remoteJid) {
      return NextResponse.json(
        { error: "remoteJid e obrigatorio." },
        { status: 400 },
      );
    }

    const customer =
      await customerRepository.findByRemoteJid(
        companyId,
        remoteJid,
      );

    if (!customer) {
      return NextResponse.json([]);
    }

    const storedMessages =
      await messageService.listRecentMessagesByCustomer(
        companyId,
        customer.id,
        100,
      );

    const messages =
      storedMessages.flatMap(
        (storedMessage) => {
          const rawPayload =
            getRecord(storedMessage.rawPayload);

          if (!rawPayload) {
            return [];
          }

          if (!storedMessage.authorType) {
            return [rawPayload];
          }

          return [
            {
              ...rawPayload,
              m1mAuthor: {
                type: storedMessage.authorType,
                id: storedMessage.authorId,
                name: storedMessage.authorName,
              },
            },
          ];
        },
      );

    return NextResponse.json(messages);
  } catch (error) {
    console.error(
      "ERRO CHAT RECENT MESSAGES GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar mensagens recentes.",
      },
      { status: 500 },
    );
  }
}

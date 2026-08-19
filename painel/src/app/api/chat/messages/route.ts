import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  conversationSyncService,
} from "@/services/conversation-sync.service";
import {
  messageReconciliationService,
} from "@/services/message-reconciliation.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const authenticatedUser =       await authorizationService.getCurrentUser();      const companyId =       authenticatedUser.companyId;

    const remoteJid =
      request.nextUrl.searchParams.get(
        "remoteJid",
      );

    if (!remoteJid?.trim()) {
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

    const messages =
      await conversationSyncService.syncConversation(
        remoteJid,
        instanceName,
        companyId,
      );

    try {
      const reconciliation =
        await messageReconciliationService
          .reconcileReceiptMediaForConversation(
            companyId,
            instanceName,
            remoteJid,
          );

      if (
        reconciliation.candidates > 0
      ) {
        console.log(
          "[M1M RECONCILIACAO] Conversa verificada:",
          {
            remoteJid,
            ...reconciliation,
          },
        );
      }
    } catch (reconciliationError) {
      console.warn(
        "[M1M RECONCILIACAO] Falha nao bloqueante:",
        reconciliationError,
      );
    }

    return NextResponse.json(
      messages,
    );
  } catch (error) {
    console.error(
      "ERRO CHAT MESSAGES GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao sincronizar mensagens.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  conversationSyncService,
} from "@/services/conversation-sync.service";

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
    const companyId =
      await getAuthenticatedCompanyId();

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

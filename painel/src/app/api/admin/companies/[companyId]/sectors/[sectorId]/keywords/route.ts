import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  sectorKeywordService,
} from "@/services/sector-keyword.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
    sectorId: string;
  }>;
};

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
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
      sectorId,
    } = await context.params;

    const keywords =
      await sectorKeywordService.list(
        companyId,
        sectorId,
      );

    return NextResponse.json(keywords);
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR KEYWORDS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar palavras-chave do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
      sectorId,
    } = await context.params;

    const body = await request.json();

    const keyword =
      await sectorKeywordService.create(
        companyId,
        sectorId,
        body.keyword,
      );

    return NextResponse.json(keyword, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR KEYWORDS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao adicionar palavra-chave ao setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  if (
    !adminAuthService.isAuthorizedRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Acesso administrativo não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const {
      companyId,
    } = await context.params;

    const body = await request.json();

    await sectorKeywordService.remove(
      companyId,
      body.keywordId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN SECTOR KEYWORDS DELETE:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao remover palavra-chave do setor.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

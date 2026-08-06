import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentCompanyId,
} from "@/lib/tenant";
import {
  sectorKeywordService,
} from "@/services/sector-keyword.service";

type RouteContext = {
  params: Promise<{
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

function getErrorStatus(
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message.includes(
      "não encontrado",
    )
  ) {
    return 404;
  }

  if (
    error.message.includes(
      "obrigatório",
    ) ||
    error.message.includes(
      "pelo menos",
    ) ||
    error.message.includes(
      "já existe",
    )
  ) {
    return 400;
  }

  return 500;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const {
      sectorId,
    } = await context.params;

    const keywords =
      await sectorKeywordService.list(
        companyId,
        sectorId,
      );

    return NextResponse.json(
      keywords,
    );
  } catch (error) {
    console.error(
      "ERRO SECTOR KEYWORDS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar as palavras-chave.",
        ),
      },
      {
        status:
          getErrorStatus(error),
      },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const {
      sectorId,
    } = await context.params;

    const body =
      await request.json();

    const keyword =
      await sectorKeywordService.create(
        companyId,
        sectorId,
        body.keyword,
      );

    return NextResponse.json(
      keyword,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO SECTOR KEYWORDS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao cadastrar a palavra-chave.",
        ),
      },
      {
        status:
          getErrorStatus(error),
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  _context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const body =
      await request.json();

    const deletedKeyword =
      await sectorKeywordService.remove(
        companyId,
        body.keywordId,
      );

    return NextResponse.json({
      success: true,
      keyword:
        deletedKeyword,
    });
  } catch (error) {
    console.error(
      "ERRO SECTOR KEYWORDS DELETE:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao excluir a palavra-chave.",
        ),
      },
      {
        status:
          getErrorStatus(error),
      },
    );
  }
}

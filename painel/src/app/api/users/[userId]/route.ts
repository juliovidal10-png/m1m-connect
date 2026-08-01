import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getCurrentCompanyId } from "@/lib/tenant";
import { userService } from "@/services/user.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const { userId } =
      await context.params;

    const body = await request.json();

    const user =
      await userService.updateUser(
        companyId,
        userId,
        {
          name: body.name,
          displayName:
            body.displayName,
          email: body.email,
          jobTitle:
            body.jobTitle,
          phone:
            body.phone,
          role:
            body.role,
          active:
            body.active,
        },
      );

    return NextResponse.json(user);
  } catch (error) {
    console.error(
      "ERRO USERS PUT:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao atualizar o usuário.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}


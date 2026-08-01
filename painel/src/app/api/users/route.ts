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

export async function GET() {
  try {
    const companyId =
      getCurrentCompanyId();

    const users =
      await userService.listUsers(
        companyId,
      );

    return NextResponse.json(users);
  } catch (error) {
    console.error(
      "ERRO USERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar os usuários.",
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
) {
  try {
    const companyId =
      getCurrentCompanyId();

    const body = await request.json();

    const user =
      await userService.createUser(
        companyId,
        {
          name: body.name,
          displayName:
            body.displayName,
          email: body.email,
          jobTitle:
            body.jobTitle,
          phone:
            body.phone,
          active:
            body.active,
        },
      );

    return NextResponse.json(
      user,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO USERS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao criar o usuário.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

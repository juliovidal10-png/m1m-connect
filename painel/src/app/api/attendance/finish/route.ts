import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";

import {
  sessionService,
} from "@/services/auth/session.service";

import {
  userRepository,
} from "@/repositories/user.repository";

import {
  attendanceService,
} from "@/services/attendance.service";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 400;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const token =
      request.cookies.get("m1m_session")?.value;

    if (!token) {
      throw new AuthorizationError(
        "Sessão não encontrada.",
      );
    }

    const session =
      await sessionService.verifyToken(token);

    const user =
      await userRepository.findById(
        session.companyId,
        session.userId,
      );

    if (!user || !user.active) {
      throw new AuthorizationError(
        "Usuário autenticado não encontrado ou inativo.",
      );
    }

    const authorizedUser = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      isPrimary: user.isPrimary,
      useCustomPermissions:
        user.useCustomPermissions,
      permissions: user.permissions,
    };

    if (
      !authorizationService.hasPermission(
        authorizedUser,
        M1MUserPermission.CLOSE_ATTENDANCE,
      )
    ) {
      throw new AuthorizationError();
    }

    const body =
      await request.json();

    const attendanceId =
      typeof body?.attendanceId === "string"
        ? body.attendanceId.trim()
        : "";

    if (!attendanceId) {
      return NextResponse.json(
        {
          error:
            "Atendimento não informado.",
        },
        {
          status: 400,
        },
      );
    }

    const attendance =
      await attendanceService.finishAttendance(
        authorizedUser.companyId,
        attendanceId,
        authorizedUser.userId,
      );

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error(
      "ERRO ATTENDANCE FINISH POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao finalizar o atendimento.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}



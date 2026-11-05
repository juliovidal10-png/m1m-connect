import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MAttendanceActorType,
  M1MUserPermission,
} from "@/generated/prisma/enums";

import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";

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
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.TRANSFER_ATTENDANCE,
      );

    const body =
      await request.json();

    const attendanceId =
      typeof body?.attendanceId === "string"
        ? body.attendanceId.trim()
        : "";

    const sectorId =
      typeof body?.sectorId === "string"
        ? body.sectorId.trim()
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

    if (!sectorId) {
      return NextResponse.json(
        {
          error:
            "Setor de destino não informado.",
        },
        {
          status: 400,
        },
      );
    }

    const attendance =
      await attendanceService.transferAttendanceToSector({
        companyId:
          authorizedUser.companyId,
        attendanceId,
        sectorId,
        actorType:
          M1MAttendanceActorType.USER,
        actorId:
          authorizedUser.userId,
      });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error(
      "ERRO ATTENDANCE TRANSFER POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao transferir o atendimento.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}

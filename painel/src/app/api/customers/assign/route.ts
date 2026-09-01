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
  AttendanceConflictError,
  attendanceService,
} from "@/services/attendance.service";
import { customerService } from "@/services/customer.service";

function getErrorStatus(
  error: unknown,
) {
  if (error instanceof AuthorizationError) {
    return error.statusCode;
  }

  if (error instanceof AttendanceConflictError) {
    return 409;
  }

  return 500;
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
        M1MUserPermission.ASSUME_ATTENDANCE,
      );

    const companyId =
      authorizedUser.companyId;

    const responsibleId =
      authorizedUser.userId;

    const body = await request.json();

    const existingAttendance =
      await attendanceService.getOpenAttendanceByCustomer(
        companyId,
        body.customerId,
      );

    const attendance =
      existingAttendance ??
      (await attendanceService.startAttendance(
        companyId,
        body.customerId,
      ));

    const assumedAttendance =
      await attendanceService.assumeAttendance(
        companyId,
        attendance.id,
        responsibleId,
      );

    const customer =
      await customerService.assignResponsible({
        companyId,
        customerId: body.customerId,
        responsibleId,
      });

    return NextResponse.json({
      customer,
      attendance: assumedAttendance,
    });
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS ASSIGN POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao assumir o atendimento.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}

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
import { attendanceService } from "@/services/attendance.service";
import { customerService } from "@/services/customer.service";

function getErrorStatus(
  error: unknown,
) {
  return error instanceof AuthorizationError
    ? error.statusCode
    : 500;
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

    const customer =
      await customerService.assignResponsible({
        companyId,
        customerId: body.customerId,
        responsibleId,
      });

    const existingAttendance =
      await attendanceService.getOpenAttendanceByCustomer(
        customer.companyId,
        customer.id,
      );

    const attendance =
      existingAttendance ??
      (await attendanceService.startAttendance(
        customer.companyId,
        customer.id,
      ));

    const assumedAttendance =
      await attendanceService.assumeAttendance(
        customer.companyId,
        attendance.id,
        responsibleId,
      );

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

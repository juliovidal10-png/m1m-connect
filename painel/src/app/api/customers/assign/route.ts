import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { attendanceService } from "@/services/attendance.service";
import { customerService } from "@/services/customer.service";

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
    const companyId =
      await getAuthenticatedCompanyId();

    const body = await request.json();

    const customer =
      await customerService.assignResponsible({
        companyId,
        customerId: body.customerId,
        responsibleId: body.responsibleId,
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
        body.responsibleId,
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
        status: 500,
      },
    );
  }
}

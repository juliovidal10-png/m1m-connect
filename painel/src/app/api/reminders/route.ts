import { NextRequest, NextResponse } from "next/server";

import { reminderService } from "@/services/reminder.service";

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
      request.nextUrl.searchParams.get(
        "companyId",
      );

    const customerId =
      request.nextUrl.searchParams.get(
        "customerId",
      );

    if (!companyId) {
      return NextResponse.json(
        {
          error: "companyId é obrigatório.",
        },
        {
          status: 400,
        },
      );
    }

    if (customerId) {
      const reminders =
        await reminderService.listCustomerReminders(
          companyId,
          customerId,
        );

      return NextResponse.json(reminders);
    }

    const reminders =
      await reminderService.listCompanyReminders(
        companyId,
      );

    return NextResponse.json(reminders);
  } catch (error) {
    console.error(
      "ERRO REMINDERS GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar lembretes.",
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
    const body = await request.json();

    const reminder =
      await reminderService.createReminder(
        body,
      );

    return NextResponse.json(
      reminder,
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO REMINDERS POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao criar lembrete.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const id =
      typeof body.id === "string"
        ? body.id
        : "";

    const companyId =
      typeof body.companyId === "string"
        ? body.companyId
        : "";

    const action =
      typeof body.action === "string"
        ? body.action
        : "";

    if (action === "complete") {
      const reminder =
        await reminderService.completeReminder(
          id,
          companyId,
        );

      return NextResponse.json(reminder);
    }

    if (action === "postpone") {
      const remindAt =
        typeof body.remindAt === "string"
          ? body.remindAt
          : "";

      const reminder =
        await reminderService.postponeReminder(
          id,
          companyId,
          remindAt,
        );

      return NextResponse.json(reminder);
    }

    if (action === "notify") {
      const reminder =
        await reminderService.markReminderAsNotified(
          id,
          companyId,
        );

      return NextResponse.json(reminder);
    }

    return NextResponse.json(
      {
        error:
          "Ação inválida. Use complete, postpone ou notify.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "ERRO REMINDERS PATCH:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao atualizar lembrete.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";
import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

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
    } = await context.params;

    const body =
      await request.json();

    const company =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
        },
      });

    if (!company) {
      return NextResponse.json(
        {
          error:
            "Empresa não encontrada.",
        },
        {
          status: 404,
        },
      );
    }

    const amountCents =
      Number(
        body?.amountCents,
      );

    if (
      !Number.isInteger(
        amountCents,
      ) ||
      amountCents <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Informe um valor de pagamento válido.",
        },
        {
          status: 400,
        },
      );
    }

    const paidAt =
      new Date(
        body?.paidAt,
      );

    if (
      Number.isNaN(
        paidAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Informe uma data de pagamento válida.",
        },
        {
          status: 400,
        },
      );
    }

    const normalizeOptionalText =
      (
        value: unknown,
      ) => {
        if (
          typeof value !==
          "string"
        ) {
          return null;
        }

        const normalized =
          value.trim();

        return normalized ||
          null;
      };

    const subscriptionEvents =
      await prisma.m1MSubscriptionEvent.findMany({
        where: {
          companyId,
          amountCents: {
            not: null,
          },
        },
        orderBy: {
          createdAt:
            "desc",
        },
        select: {
          id: true,
          amountCents: true,
          payments: {
            select: {
              amountCents: true,
            },
          },
        },
      });

    const openEvent =
      subscriptionEvents.find(
        (
          event,
        ) => {
          const eventAmount =
            event.amountCents ??
            0;

          const paidAmount =
            event.payments.reduce(
              (
                total,
                payment,
              ) =>
                total +
                payment.amountCents,
              0,
            );

          return (
            eventAmount >
            paidAmount
          );
        },
      );

    const payment =
      await prisma.m1MSubscriptionPayment.create({
        data: {
          companyId,
          subscriptionEventId:
            openEvent?.id ??
            null,
          amountCents,
          paidAt,
          paymentMethod:
            normalizeOptionalText(
              body?.paymentMethod,
            ),
          notes:
            normalizeOptionalText(
              body?.notes,
            ),
        },
        select: {
          id: true,
          companyId: true,
          subscriptionEventId:
            true,
          amountCents: true,
          paidAt: true,
          paymentMethod: true,
          notes: true,
          createdAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        payment,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN SUBSCRIPTION PAYMENT POST:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento.",
      },
      {
        status: 400,
      },
    );
  }
}

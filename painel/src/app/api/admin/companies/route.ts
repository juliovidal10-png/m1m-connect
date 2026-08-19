import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  adminCompanyProvisioningService,
} from "@/services/admin/admin-company-provisioning.service";
import {
  prisma,
} from "@/lib/prisma";

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Erro ao processar a empresa.";
}

export async function GET(
  request: NextRequest,
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
    const now =
      new Date();

    const monthStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );

    const nextMonthStart =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0,
        0,
      );

    const [
      companies,
      users,
      receivedThisMonth,
      subscriptionEvents,
      subscriptionPayments,
    ] = await Promise.all([
      prisma.m1MCompany.findMany({
        orderBy: {
          createdAt:
            "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          segment: true,
          email: true,
          phone: true,
          active: true,
          subscriptionStatus:
            true,
          trialEndsAt:
            true,
          accessEndsAt:
            true,
          onboardingCompleted:
            true,
          aiEnabled:
            true,
          whatsappInstanceName:
            true,
          createdAt:
            true,
        },
      }),

      prisma.m1MUser.findMany({
        select: {
          id: true,
          companyId:
            true,
          name: true,
          displayName:
            true,
          email: true,
          role: true,
          active: true,
          isPrimary: true,
        },
      }),

      prisma.m1MSubscriptionPayment.aggregate({
        where: {
          paidAt: {
            gte:
              monthStart,
            lt:
              nextMonthStart,
          },
        },
        _sum: {
          amountCents:
            true,
        },
      }),

      prisma.m1MSubscriptionEvent.findMany({
        where: {
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
          companyId: true,
          type: true,
          amountCents: true,
          newAccessEndsAt:
            true,
          createdAt:
            true,
          company: {
            select: {
              id: true,
              name: true,
              subscriptionStatus:
                true,
              accessEndsAt:
                true,
            },
          },
          payments: {
            select: {
              amountCents: true,
            },
          },
        },
      }),

      prisma.m1MSubscriptionPayment.findMany({
        orderBy: {
          paidAt:
            "desc",
        },
        select: {
          id: true,
          companyId: true,
          subscriptionEventId:
            true,
          amountCents: true,
          paidAt: true,
          paymentMethod:
            true,
          notes: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const receivableByCompany =
      new Map<
        string,
        {
          companyId: string;
          companyName: string;
          amountCents: number;
          accessEndsAt: Date | null;
          subscriptionStatus:
            | "TRIAL"
            | "ACTIVE"
            | "SUSPENDED"
            | "EXPIRED";
        }
      >();

    for (
      const event of
      subscriptionEvents
    ) {
      const eventAmount =
        event.amountCents ??
        0;

      const paidAmount =
        event.payments.reduce(
          (
            paymentTotal,
            payment,
          ) =>
            paymentTotal +
            payment.amountCents,
          0,
        );

      const openAmount =
        Math.max(
          0,
          eventAmount -
            paidAmount,
        );

      if (
        openAmount <=
        0
      ) {
        continue;
      }

      const current =
        receivableByCompany.get(
          event.companyId,
        );

      if (current) {
        current.amountCents +=
          openAmount;
      } else {
        receivableByCompany.set(
          event.companyId,
          {
            companyId:
              event.company.id,
            companyName:
              event.company.name,
            amountCents:
              openAmount,
            accessEndsAt:
              event.company
                .accessEndsAt,
            subscriptionStatus:
              event.company
                .subscriptionStatus,
          },
        );
      }
    }

    const receivableDetails =
      Array.from(
        receivableByCompany.values(),
      ).sort(
        (
          a,
          b,
        ) =>
          b.amountCents -
          a.amountCents,
      );

    const receivableCents =
      receivableDetails.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.amountCents,
        0,
      );

    const result =
      companies.map(
        (
          company,
        ) => {
          const companyUsers =
            users.filter(
              (
                user,
              ) =>
                user.companyId ===
                company.id,
            );

          const admin =
            companyUsers.find(
              (
                user,
              ) =>
                user.isPrimary,
            ) ??
            companyUsers.find(
              (
                user,
              ) =>
                user.role ===
                  "ADMIN" &&
                user.active,
            ) ??
            companyUsers.find(
              (
                user,
              ) =>
                user.role ===
                "ADMIN",
            ) ??
            null;

          return {
            ...company,
            usersCount:
              companyUsers.length,
            admin:
              admin
                ? {
                    id:
                      admin.id,
                    name:
                      admin.name,
                    displayName:
                      admin.displayName,
                    email:
                      admin.email,
                    active:
                      admin.active,
                  }
                : null,
          };
        },
      );

    const financialHistory = [
      ...subscriptionEvents.map(
        (event) => ({
          id:
            `event-${event.id}`,
          companyId:
            event.companyId,
          companyName:
            event.company.name,
          kind:
            "CHARGE" as const,
          eventType:
            event.type,
          amountCents:
            event.amountCents ?? 0,
          date:
            event.createdAt,
          accessEndsAt:
            event.newAccessEndsAt,
          paymentMethod:
            null,
          notes:
            null,
        }),
      ),
      ...subscriptionPayments.map(
        (payment) => ({
          id:
            `payment-${payment.id}`,
          companyId:
            payment.companyId,
          companyName:
            payment.company.name,
          kind:
            "PAYMENT" as const,
          eventType:
            null,
          amountCents:
            payment.amountCents,
          date:
            payment.paidAt,
          accessEndsAt:
            null,
          paymentMethod:
            payment.paymentMethod,
          notes:
            payment.notes,
        }),
      ),
    ].sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime(),
    );

    return NextResponse.json({
      companies:
        result,
      financialSummary: {
        receivedThisMonthCents:
          receivedThisMonth
            ._sum
            .amountCents ??
          0,
        receivableCents,
        receivableDetails,
        financialHistory,
        monthStart,
        nextMonthStart,
      },
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANIES GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error,
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
    const body =
      await request.json();

    const result =
      await adminCompanyProvisioningService.provisionCompany({
        companyName:
          body.companyName,
        slug:
          body.slug,
        segment:
          body.segment,
        companyEmail:
          body.companyEmail,
        companyPhone:
          body.companyPhone,
        companyCity:
          body.companyCity,
        companyState:
          body.companyState,

        adminName:
          body.adminName,
        adminDisplayName:
          body.adminDisplayName,
        adminEmail:
          body.adminEmail,
        adminPhone:
          body.adminPhone,
        adminPassword:
          body.adminPassword,
      });

    return NextResponse.json(
      {
        success: true,
        company:
          result.company,
        admin:
          result.admin,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY POST:",
      error,
    );

    const message =
      getErrorMessage(
        error,
      );

    const conflict =
      message.includes(
        "Já existe",
      );

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          conflict
            ? 409
            : 400,
      },
    );
  }
}

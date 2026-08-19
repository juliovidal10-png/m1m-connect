import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  adminAuthService,
} from "@/services/admin/admin-auth.service";
import {
  prisma,
} from "@/lib/prisma";
import {
  adminCompanyDeletionService,
} from "@/services/admin/admin-company-deletion.service";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

export async function GET(
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

    const company =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          segment: true,
          presentation: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          whatsapp: true,
          email: true,
          website: true,
          instagram: true,
          active: true,
          subscriptionStatus:
            true,
          trialEndsAt:
            true,
          accessEndsAt:
            true,
          planName:
            true,
          subscriptionPriceCents:
            true,
          billingCycle:
            true,
          subscriptionStartedAt:
            true,
          onboardingCompleted:
            true,
          aiEnabled:
            true,
          whatsappInstanceName:
            true,
          createdAt:
            true,
          updatedAt:
            true,
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

    const [
      users,
      sectorsCount,
      customersCount,
      attendancesCount,
      subscriptionEvents,
      subscriptionPayments,
    ] = await Promise.all([
      prisma.m1MUser.findMany({
        where: {
          companyId,
        },
        orderBy: [
          {
            active:
              "desc",
          },
          {
            name:
              "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          displayName:
            true,
          email: true,
          phone: true,
          jobTitle: true,
          role: true,
          active: true,
        },
      }),
      prisma.m1MSector.count({
        where: {
          companyId,
        },
      }),
      prisma.m1MCustomer.count({
        where: {
          companyId,
        },
      }),
      prisma.m1MAttendance.count({
        where: {
          companyId,
        },
      }),
      prisma.m1MSubscriptionEvent.findMany({
        where: {
          companyId,
        },
        orderBy: {
          createdAt:
            "desc",
        },
        take: 20,
        select: {
          id: true,
          type: true,
          planName: true,
          amountCents: true,
          billingCycle: true,
          previousAccessEndsAt:
            true,
          newAccessEndsAt:
            true,
          createdAt:
            true,
        },
      }),
      prisma.m1MSubscriptionPayment.findMany({
        where: {
          companyId,
        },
        orderBy: {
          paidAt:
            "desc",
        },
        take: 20,
        select: {
          id: true,
          amountCents: true,
          paidAt: true,
          paymentMethod: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      company,
      users,
      sectorsCount,
      customersCount,
      attendancesCount,
      subscriptionEvents,
      subscriptionPayments,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY DETAIL GET:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar os detalhes da empresa.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
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

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Informe o nome da empresa.",
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

    const stateRaw =
      normalizeOptionalText(
        body?.state,
      );

    const state =
      stateRaw
        ? stateRaw.toUpperCase()
        : null;

    if (
      state &&
      !/^[A-Z]{2}$/.test(
        state,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "UF inválida.",
        },
        {
          status: 400,
        },
      );
    }

    const company =
      await prisma.m1MCompany.update({
        where: {
          id: companyId,
        },
        data: {
          name,
          segment:
            normalizeOptionalText(
              body?.segment,
            ),
          email:
            normalizeOptionalText(
              body?.email,
            ),
          phone:
            normalizeOptionalText(
              body?.phone,
            ),
          city:
            normalizeOptionalText(
              body?.city,
            ),
          state,
        },
        select: {
          id: true,
          name: true,
          segment: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY DETAIL PATCH:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os dados da empresa.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
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

    const confirmationName =
      typeof body?.confirmationName ===
      "string"
        ? body.confirmationName.trim()
        : "";

    const company =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          name: true,
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

    if (
      confirmationName !==
      company.name
    ) {
      return NextResponse.json(
        {
          error:
            "Digite exatamente o nome da empresa para confirmar a exclusão.",
        },
        {
          status: 400,
        },
      );
    }

    const deletedCompany =
      await adminCompanyDeletionService.deleteCompany(
        companyId,
      );

    return NextResponse.json({
      success: true,
      deletedCompany,
    });
  } catch (error) {
    console.error(
      "ERRO ADMIN COMPANY DELETE:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a empresa.",
      },
      {
        status: 400,
      },
    );
  }
}

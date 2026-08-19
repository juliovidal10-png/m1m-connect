import {
  M1MBillingCycle,
  M1MSubscriptionEventType,
  M1MSubscriptionStatus,
} from "@/generated/prisma/enums";
import {
  prisma,
} from "@/lib/prisma";

export type SaveCompanySubscriptionInput = {
  companyId: string;
  planName: string;
  subscriptionPriceCents: number;
  billingCycle: M1MBillingCycle;
  accessEndsAt: Date;
};

function getCycleMonths(
  cycle: M1MBillingCycle,
) {
  switch (cycle) {
    case M1MBillingCycle.MONTHLY:
      return 1;
    case M1MBillingCycle.QUARTERLY:
      return 3;
    case M1MBillingCycle.SEMIANNUAL:
      return 6;
    case M1MBillingCycle.ANNUAL:
      return 12;
  }
}

function addMonthsClamped(
  baseDate: Date,
  monthsToAdd: number,
) {
  const originalDay =
    baseDate.getDate();

  const target =
    new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() +
        monthsToAdd,
      1,
      23,
      59,
      59,
      999,
    );

  const lastDay =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0,
    ).getDate();

  target.setDate(
    Math.min(
      originalDay,
      lastDay,
    ),
  );

  return target;
}

export const adminCompanySubscriptionService = {
  async saveSubscription(
    input: SaveCompanySubscriptionInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const current =
          await tx.m1MCompany.findUnique({
            where: {
              id: input.companyId,
            },
            select: {
              id: true,
              planName: true,
              subscriptionStartedAt:
                true,
              accessEndsAt:
                true,
            },
          });

        if (!current) {
          throw new Error(
            "Empresa não encontrada.",
          );
        }

        const isFirstActivation =
          current.subscriptionStartedAt ===
            null;

        const startedAt =
          current.subscriptionStartedAt ??
          new Date();

        const company =
          await tx.m1MCompany.update({
            where: {
              id: input.companyId,
            },
            data: {
              active: true,
              subscriptionStatus:
                M1MSubscriptionStatus.ACTIVE,
              planName:
                input.planName,
              subscriptionPriceCents:
                input.subscriptionPriceCents,
              billingCycle:
                input.billingCycle,
              subscriptionStartedAt:
                startedAt,
              accessEndsAt:
                input.accessEndsAt,
            },
            select: {
              id: true,
              name: true,
              subscriptionStatus:
                true,
              planName: true,
              subscriptionPriceCents:
                true,
              billingCycle: true,
              subscriptionStartedAt:
                true,
              accessEndsAt:
                true,
            },
          });

        if (
          isFirstActivation
        ) {
          await tx.m1MSubscriptionEvent.create({
            data: {
              companyId:
                input.companyId,
              type:
                M1MSubscriptionEventType.ACTIVATION,
              planName:
                input.planName,
              amountCents:
                input.subscriptionPriceCents,
              billingCycle:
                input.billingCycle,
              previousAccessEndsAt:
                current.accessEndsAt,
              newAccessEndsAt:
                input.accessEndsAt,
            },
          });
        }

        return company;
      },
    );
  },

  async renewSubscription(
    companyId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const company =
          await tx.m1MCompany.findUnique({
            where: {
              id: companyId,
            },
            select: {
              id: true,
              planName: true,
              subscriptionPriceCents:
                true,
              billingCycle:
                true,
              subscriptionStartedAt:
                true,
              accessEndsAt:
                true,
            },
          });

        if (!company) {
          throw new Error(
            "Empresa não encontrada.",
          );
        }

        if (
          !company.planName ||
          company.subscriptionPriceCents ===
            null ||
          !company.billingCycle
        ) {
          throw new Error(
            "A assinatura precisa estar configurada antes da renovação.",
          );
        }

        const now =
          new Date();

        const baseDate =
          company.accessEndsAt &&
          company.accessEndsAt > now
            ? company.accessEndsAt
            : now;

        const nextAccessEndsAt =
          addMonthsClamped(
            baseDate,
            getCycleMonths(
              company.billingCycle,
            ),
          );

        const updated =
          await tx.m1MCompany.update({
            where: {
              id: companyId,
            },
            data: {
              active: true,
              subscriptionStatus:
                M1MSubscriptionStatus.ACTIVE,
              subscriptionStartedAt:
                company.subscriptionStartedAt ??
                now,
              accessEndsAt:
                nextAccessEndsAt,
            },
            select: {
              id: true,
              name: true,
              subscriptionStatus:
                true,
              planName: true,
              subscriptionPriceCents:
                true,
              billingCycle: true,
              subscriptionStartedAt:
                true,
              accessEndsAt:
                true,
            },
          });

        await tx.m1MSubscriptionEvent.create({
          data: {
            companyId,
            type:
              M1MSubscriptionEventType.RENEWAL,
            planName:
              company.planName,
            amountCents:
              company.subscriptionPriceCents,
            billingCycle:
              company.billingCycle,
            previousAccessEndsAt:
              company.accessEndsAt,
            newAccessEndsAt:
              nextAccessEndsAt,
          },
        });

        return updated;
      },
    );
  },
};

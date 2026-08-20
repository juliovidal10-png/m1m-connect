import {
  M1MSubscriptionStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const TRIAL_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

export type CompanyAccessResult = {
  allowed: boolean;
  status: M1MSubscriptionStatus;
  trialEndsAt: Date | null;
  accessEndsAt: Date | null;
  reason:
    | "TRIAL_ACTIVE"
    | "ACTIVE"
    | "TRIAL_EXPIRED"
    | "ACCESS_EXPIRED"
    | "SUSPENDED";
};



export const companyAccessService = {
  async activateCompany(
    companyId: string,
  ) {
    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        active: true,
        subscriptionStatus:
          M1MSubscriptionStatus.ACTIVE,
        accessEndsAt: null,
      },
      select: {
        id: true,
        active: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        accessEndsAt: true,
        whatsappInstanceName: true,
      },
    });
  },

  async suspendCompany(
    companyId: string,
  ) {
    const company =
      await prisma.m1MCompany.update({
        where: {
          id: companyId,
        },
        data: {
          subscriptionStatus:
            M1MSubscriptionStatus.SUSPENDED,
        },
        select: {
          id: true,
          active: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          accessEndsAt: true,
          whatsappInstanceName: true,
        },
      });
return company;
  },

  async extendTrialSevenDays(
    companyId: string,
  ) {
    const current =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          trialEndsAt: true,
        },
      });

    if (!current) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    const now = new Date();

    const baseDate =
      current.trialEndsAt &&
      current.trialEndsAt > now
        ? current.trialEndsAt
        : now;

    const trialEndsAt =
      new Date(
        baseDate.getTime() +
          TRIAL_DURATION_MS,
      );

    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        active: true,
        subscriptionStatus:
          M1MSubscriptionStatus.TRIAL,
        trialEndsAt,
        accessEndsAt: null,
      },
      select: {
        id: true,
        active: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        accessEndsAt: true,
        whatsappInstanceName: true,
      },
    });
  },

  async reduceTrialOneDay(
    companyId: string,
  ) {
    const current =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          trialEndsAt: true,
        },
      });

    if (!current) {
      throw new Error(
        "Empresa não encontrada.",
      );
    }

    if (!current.trialEndsAt) {
      throw new Error(
        "A empresa não possui prazo de teste definido.",
      );
    }

    const now = new Date();

    const trialEndsAt =
      new Date(
        current.trialEndsAt.getTime() -
          24 * 60 * 60 * 1000,
      );

    if (trialEndsAt <= now) {
      throw new Error(
        "Não é possível reduzir mais um dia sem encerrar o teste.",
      );
    }

    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        active: true,
        subscriptionStatus:
          M1MSubscriptionStatus.TRIAL,
        trialEndsAt,
        accessEndsAt: null,
      },
      select: {
        id: true,
        active: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        accessEndsAt: true,
        whatsappInstanceName: true,
      },
    });
  },

  async resetTrialSevenDays(
    companyId: string,
  ) {
    const trialEndsAt =
      new Date(
        Date.now() +
          TRIAL_DURATION_MS,
      );

    return prisma.m1MCompany.update({
      where: {
        id: companyId,
      },
      data: {
        active: true,
        subscriptionStatus:
          M1MSubscriptionStatus.TRIAL,
        trialEndsAt,
        accessEndsAt: null,
      },
      select: {
        id: true,
        active: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        accessEndsAt: true,
        whatsappInstanceName: true,
      },
    });
  },

  async checkCompanyAccess(
    companyId: string,
  ): Promise<CompanyAccessResult> {
    const company =
      await prisma.m1MCompany.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          active: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          accessEndsAt: true,
          whatsappInstanceName: true,
        },
      });

    if (!company || !company.active) {
      return {
        allowed: false,
        status:
          M1MSubscriptionStatus.SUSPENDED,
        trialEndsAt: null,
        accessEndsAt: null,
        reason: "SUSPENDED",
      };
    }

    const now = new Date();

    if (
      company.subscriptionStatus ===
      M1MSubscriptionStatus.SUSPENDED
    ) {
      return {
        allowed: false,
        status:
          M1MSubscriptionStatus.SUSPENDED,
        trialEndsAt:
          company.trialEndsAt,
        accessEndsAt:
          company.accessEndsAt,
        reason: "SUSPENDED",
      };
    }

    if (
      company.subscriptionStatus ===
      M1MSubscriptionStatus.EXPIRED
    ) {
      return {
        allowed: false,
        status:
          M1MSubscriptionStatus.EXPIRED,
        trialEndsAt:
          company.trialEndsAt,
        accessEndsAt:
          company.accessEndsAt,
        reason:
          company.accessEndsAt
            ? "ACCESS_EXPIRED"
            : "TRIAL_EXPIRED",
      };
    }

    if (
      company.subscriptionStatus ===
      M1MSubscriptionStatus.TRIAL
    ) {
      let trialEndsAt =
        company.trialEndsAt;

      if (!trialEndsAt) {
        trialEndsAt = new Date(
          now.getTime() +
            TRIAL_DURATION_MS,
        );

        await prisma.m1MCompany.update({
          where: {
            id: company.id,
          },
          data: {
            trialEndsAt,
          },
        });
      }

      if (trialEndsAt <= now) {
        await prisma.m1MCompany.update({
          where: {
            id: company.id,
          },
          data: {
            subscriptionStatus:
              M1MSubscriptionStatus.EXPIRED,
          },
        });
return {
          allowed: false,
          status:
            M1MSubscriptionStatus.EXPIRED,
          trialEndsAt,
          accessEndsAt:
            company.accessEndsAt,
          reason: "TRIAL_EXPIRED",
        };
      }

      return {
        allowed: true,
        status:
          M1MSubscriptionStatus.TRIAL,
        trialEndsAt,
        accessEndsAt:
          company.accessEndsAt,
        reason: "TRIAL_ACTIVE",
      };
    }

    if (
      company.accessEndsAt &&
      company.accessEndsAt <= now
    ) {
      await prisma.m1MCompany.update({
        where: {
          id: company.id,
        },
        data: {
          subscriptionStatus:
            M1MSubscriptionStatus.EXPIRED,
        },
      });
return {
        allowed: false,
        status:
          M1MSubscriptionStatus.EXPIRED,
        trialEndsAt:
          company.trialEndsAt,
        accessEndsAt:
          company.accessEndsAt,
        reason: "ACCESS_EXPIRED",
      };
    }

    return {
      allowed: true,
      status:
        M1MSubscriptionStatus.ACTIVE,
      trialEndsAt:
        company.trialEndsAt,
      accessEndsAt:
        company.accessEndsAt,
      reason: "ACTIVE",
    };
  },
};

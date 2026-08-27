import {
  M1MSubscriptionStatus,
  M1MUserRole,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  accessTokenService,
} from "@/services/auth/access-token.service";

const TRIAL_DURATION_MS =
  7 * 24 * 60 * 60 * 1000;

const FIRST_ACCESS_PURPOSE =
  "FIRST_ACCESS";

export type ProvisionCompanyInput = {
  companyName: string;
  slug?: string;
  segment?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyCity?: string | null;
  companyState?: string | null;

  adminName: string;
  adminDisplayName?: string | null;
  adminEmail: string;
  adminPhone?: string | null;
};

function requireText(
  value: string | null | undefined,
  fieldName: string,
) {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} é obrigatório.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
) {
  const normalized =
    value?.trim();

  return normalized || null;
}

function normalizeEmail(
  value: string,
  fieldName: string,
) {
  const email =
    requireText(
      value,
      fieldName,
    ).toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new Error(
      `${fieldName} inválido.`,
    );
  }

  return email;
}

function slugify(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function normalizeSlug(
  slug: string | undefined,
  companyName: string,
) {
  const candidate =
    slugify(
      slug?.trim() ||
        companyName,
    );

  if (!candidate) {
    throw new Error(
      "Não foi possível gerar o identificador da empresa.",
    );
  }

  return candidate;
}

export const adminCompanyProvisioningService = {
  async provisionCompany(
    input: ProvisionCompanyInput,
  ) {
    const companyName =
      requireText(
        input.companyName,
        "Nome da empresa",
      );

    const companySlug =
      normalizeSlug(
        input.slug,
        companyName,
      );

    const adminName =
      requireText(
        input.adminName,
        "Nome do administrador",
      );

    const adminEmail =
      normalizeEmail(
        input.adminEmail,
        "E-mail do administrador",
      );

    const companyEmail =
      input.companyEmail?.trim()
        ? normalizeEmail(
            input.companyEmail,
            "E-mail da empresa",
          )
        : null;

    const [
      existingCompanyBySlug,
      existingAdminEmail,
    ] = await Promise.all([
      prisma.m1MCompany.findUnique({
        where: {
          slug: companySlug,
        },
        select: {
          id: true,
        },
      }),
      prisma.m1MUser.findUnique({
        where: {
          email: adminEmail,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (existingCompanyBySlug) {
      throw new Error(
        "Já existe uma empresa com este identificador.",
      );
    }

    if (existingAdminEmail) {
      throw new Error(
        "Já existe um usuário com este e-mail.",
      );
    }

    const now =
      new Date();

    const trialEndsAt =
      new Date(
        now.getTime() +
          TRIAL_DURATION_MS,
      );

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const company =
            await transaction.m1MCompany.create({
              data: {
                name:
                  companyName,
                slug:
                  companySlug,
                segment:
                  normalizeOptionalText(
                    input.segment,
                  ),
                email:
                  companyEmail,
                phone:
                  normalizeOptionalText(
                    input.companyPhone,
                  ),
                city:
                  normalizeOptionalText(
                    input.companyCity,
                  ),
                state:
                  normalizeOptionalText(
                    input.companyState,
                  ),
                active:
                  true,
                subscriptionStatus:
                  M1MSubscriptionStatus.TRIAL,
                trialEndsAt,
                accessEndsAt:
                  null,
                onboardingCompleted:
                  false,
                aiEnabled:
                  false,
              },
            });

          const admin =
            await transaction.m1MUser.create({
              data: {
                companyId:
                  company.id,
                name:
                  adminName,
                displayName:
                  normalizeOptionalText(
                    input.adminDisplayName,
                  ),
                email:
                  adminEmail,
                passwordHash:
                  null,
                phone:
                  normalizeOptionalText(
                    input.adminPhone,
                  ),
                jobTitle:
                  "Administrador",
                role:
                  M1MUserRole.ADMIN,
                useCustomPermissions:
                  false,
                permissions:
                  [],
                active:
                  true,
                isPrimary:
                  true,
              },
            });

          return {
            company,
            admin,
          };
        },
      );

    const firstAccess =
      await accessTokenService.createToken(
        result.admin.id,
        FIRST_ACCESS_PURPOSE,
      );

    return {
      company: {
        id:
          result.company.id,
        name:
          result.company.name,
        slug:
          result.company.slug,
        segment:
          result.company.segment,
        email:
          result.company.email,
        phone:
          result.company.phone,
        city:
          result.company.city,
        state:
          result.company.state,
        active:
          result.company.active,
        subscriptionStatus:
          result.company.subscriptionStatus,
        trialEndsAt:
          result.company.trialEndsAt,
        accessEndsAt:
          result.company.accessEndsAt,
        onboardingCompleted:
          result.company.onboardingCompleted,
        aiEnabled:
          result.company.aiEnabled,
        createdAt:
          result.company.createdAt,
      },
      admin: {
        id:
          result.admin.id,
        companyId:
          result.admin.companyId,
        name:
          result.admin.name,
        displayName:
          result.admin.displayName,
        email:
          result.admin.email,
        phone:
          result.admin.phone,
        jobTitle:
          result.admin.jobTitle,
        role:
          result.admin.role,
        active:
          result.admin.active,
        createdAt:
          result.admin.createdAt,
      },
      firstAccess,
    };
  },
};

import { NextResponse } from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import { companyService } from "@/services/company.service";

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export async function GET() {
  try {
    const companyId =
      await getAuthenticatedCompanyId();

    const company =
      await companyService.getCompanyProfile(
        companyId,
      );

    return NextResponse.json({
      onboardingCompleted:
        company.onboardingCompleted,
      company: {
        id: company.id,
        name: company.name,
        segment: company.segment,
      },
    });
  } catch (error) {
    console.error(
      "ERRO ONBOARDING GET:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao carregar o onboarding.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST() {
  try {
    await authorizationService.requirePermission(
      M1MUserPermission.ACCESS_SETTINGS,
    );
    const companyId =
      await getAuthenticatedCompanyId();

    const company =
      await companyService.completeOnboarding(
        companyId,
      );

    return NextResponse.json({
      onboardingCompleted:
        company.onboardingCompleted,
      company: {
        id: company.id,
        name: company.name,
        segment: company.segment,
      },
    });
  } catch (error) {
    console.error(
      "ERRO ONBOARDING POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao concluir o onboarding.",
        ),
      },
      {
        status: 500,
      },
    );
  }
}



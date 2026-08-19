import { NextResponse } from "next/server";

import { M1MUserPermission } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";

import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

async function parseJson(response: Response) {
  return response.json().catch(() => null);
}

export async function POST() {
  if (!API_URL || !API_KEY) {
    return NextResponse.json(
      {
        error:
          "Configuração da conexão do WhatsApp não encontrada.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    await authorizationService.requirePermission(
      M1MUserPermission.ACCESS_SETTINGS,
    );
    const companyId =
      await getAuthenticatedCompanyId();

    const company =
      await companyRepository.findById(
        companyId,
      );

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

    const instanceName =
      company.whatsappInstanceName?.trim();

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Instância do WhatsApp não configurada para esta empresa.",
        },
        {
          status: 400,
        },
      );
    }

    const response =
      await fetch(
        `${API_URL}/instance/logout/${encodeURIComponent(instanceName)}`,
        {
          method:
            "DELETE",
          headers: {
            apikey:
              API_KEY,
          },
          cache:
            "no-store",
        },
      );

    const data =
      await parseJson(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível desconectar o WhatsApp.",
          details:
            data,
        },
        {
          status:
            response.status,
        },
      );
    }

    return NextResponse.json({
      success:
        true,
      state:
        "DISCONNECTED",
      instanceName,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP DISCONNECT]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao desconectar o WhatsApp.",
      },
      {
        status:
          500,
      },
    );
  }
}



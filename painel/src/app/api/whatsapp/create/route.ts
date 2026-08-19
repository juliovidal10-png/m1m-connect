import { NextResponse } from "next/server";

import {
  M1MUserPermission,
} from "@/generated/prisma/enums";
import {
  getAuthenticatedCompanyId,
} from "@/lib/tenant";
import {
  companyRepository,
} from "@/repositories/company.repository";
import {
  authorizationService,
} from "@/services/auth/authorization.service";

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

const PUBLIC_URL =
  process.env.M1M_PUBLIC_URL?.trim() ||
  "";

const WEBHOOK_SECRET =
  process.env.M1M_WEBHOOK_SECRET?.trim() ||
  "";

function normalizePublicUrl(
  value: string,
) {
  return value.replace(
    /\/+$/,
    "",
  );
}

async function parseJson(
  response: Response,
) {
  return response.json().catch(
    () => null,
  );
}

export async function POST(
  request: Request,
) {
  try {
    await authorizationService.requirePermission(
      M1MUserPermission.ACCESS_SETTINGS,
    );

    const companyId =
      await getAuthenticatedCompanyId();

    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      process.env.NODE_ENV ===
        "production" &&
      (
        !PUBLIC_URL ||
        !WEBHOOK_SECRET
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Webhook seguro de produção não configurado. Defina M1M_PUBLIC_URL e M1M_WEBHOOK_SECRET.",
        },
        {
          status: 500,
        },
      );
    }

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

    const body =
      await request.json().catch(
        () => ({}),
      );

    const requestedInstanceName =
      typeof body.instanceName === "string"
        ? body.instanceName.trim()
        : "";

    const currentInstanceName =
      company.whatsappInstanceName?.trim() ||
      "";

    const instanceName =
      currentInstanceName ||
      requestedInstanceName;

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Informe o nome da conexão.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      currentInstanceName &&
      requestedInstanceName &&
      requestedInstanceName !==
        currentInstanceName
    ) {
      return NextResponse.json(
        {
          error:
            "Esta empresa já possui uma instância do WhatsApp vinculada.",
          instanceName:
            currentInstanceName,
        },
        {
          status: 409,
        },
      );
    }

    const instanceOwner =
      await companyRepository
        .findByWhatsappInstanceName(
          instanceName,
        );

    if (
      instanceOwner &&
      instanceOwner.id !== companyId
    ) {
      return NextResponse.json(
        {
          error:
            "Este nome de instância já está vinculado a outra empresa.",
        },
        {
          status: 409,
        },
      );
    }

    const webhook =
      PUBLIC_URL &&
      WEBHOOK_SECRET
        ? {
            enabled: true,
            url:
              `${normalizePublicUrl(
                PUBLIC_URL,
              )}/api/webhooks/evolution/messages`,
            byEvents: false,
            base64: false,
            events: [
              "MESSAGES_UPSERT",
            ],
            headers: {
              "x-m1m-webhook-secret":
                WEBHOOK_SECRET,
            },
          }
        : undefined;

    const response =
      await fetch(
        `${API_URL}/instance/create`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            apikey:
              API_KEY,
          },
          body:
            JSON.stringify({
              instanceName,
              integration:
                "WHATSAPP-BAILEYS",
              qrcode:
                true,
              ...(webhook
                ? {
                    webhook,
                  }
                : {}),
            }),
          cache:
            "no-store",
        },
      );

    const data =
      await parseJson(
        response,
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.message ??
            "Não foi possível criar a conexão.",
          details:
            data,
        },
        {
          status:
            response.status,
        },
      );
    }

    if (!currentInstanceName) {
      await companyRepository
        .updateWhatsappInstanceName(
          companyId,
          instanceName,
        );
    }

    return NextResponse.json({
      ...(
        data &&
        typeof data === "object"
          ? data
          : {}
      ),
      instanceName,
      companyId,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP CREATE]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar a conexão.",
      },
      {
        status: 500,
      },
    );
  }
}
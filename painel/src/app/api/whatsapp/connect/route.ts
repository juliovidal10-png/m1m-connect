import { NextResponse } from "next/server";

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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractQr(value: unknown) {
  if (!isRecord(value)) {
    return {
      base64: null as string | null,
      code: null as string | null,
    };
  }

  const qrcode =
    isRecord(value.qrcode)
      ? value.qrcode
      : null;

  return {
    base64:
      getText(
        value.base64 ?? qrcode?.base64,
      ) || null,
    code:
      getText(
        value.code ??
          qrcode?.code ??
          value.pairingCode,
      ) || null,
  };
}

async function parseJson(response: Response) {
  return response.json().catch(() => null);
}

async function fetchInstances() {
  const response =
    await fetch(
      `${API_URL}/instance/fetchInstances`,
      {
        headers: {
          apikey: API_KEY!,
        },
        cache: "no-store",
      },
    );

  return {
    response,
    data:
      await parseJson(response),
  };
}

function instanceExists(
  data: unknown,
  instanceName: string,
) {
  const list =
    Array.isArray(data)
      ? data
      : isRecord(data) &&
          Array.isArray(data.data)
        ? data.data
        : [];

  return list.some((item) => {
    if (!isRecord(item)) {
      return false;
    }

    const nested =
      isRecord(item.instance)
        ? item.instance
        : null;

    const name =
      getText(
        item.name ??
          item.instanceName ??
          nested?.instanceName ??
          nested?.name,
      );

    return (
      name.toLowerCase() ===
      instanceName.toLowerCase()
    );
  });
}

export async function POST() {
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

  try {
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

    const instances =
      await fetchInstances();

    if (!instances.response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível consultar as instâncias do WhatsApp.",
          details:
            instances.data,
        },
        {
          status:
            instances.response.status,
        },
      );
    }

    if (!instanceExists(
      instances.data,
      instanceName,
    )) {
      const createResponse =
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
              }),
            cache:
              "no-store",
          },
        );

      const createData =
        await parseJson(createResponse);

      if (!createResponse.ok) {
        return NextResponse.json(
          {
            error:
              "Não foi possível criar a conexão do WhatsApp.",
            details:
              createData,
          },
          {
            status:
              createResponse.status,
          },
        );
      }

      return NextResponse.json({
        instanceName,
        created:
          true,
        ...extractQr(createData),
        raw:
          createData,
      });
    }

    const connectResponse =
      await fetch(
        `${API_URL}/instance/connect/${encodeURIComponent(instanceName)}`,
        {
          method:
            "GET",
          headers: {
            apikey:
              API_KEY,
          },
          cache:
            "no-store",
        },
      );

    const connectData =
      await parseJson(connectResponse);

    if (!connectResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível gerar o QR Code do WhatsApp.",
          details:
            connectData,
        },
        {
          status:
            connectResponse.status,
        },
      );
    }

    return NextResponse.json({
      instanceName,
      created:
        false,
      ...extractQr(connectData),
      raw:
        connectData,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP CONNECT]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao gerar o QR Code do WhatsApp.",
      },
      {
        status:
          500,
      },
    );
  }
}

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
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeState(value: unknown) {
  const raw =
    getText(value).toLowerCase();

  if (
    raw === "open" ||
    raw === "connected" ||
    raw === "online"
  ) {
    return "CONNECTED";
  }

  if (
    raw === "connecting" ||
    raw === "opening"
  ) {
    return "CONNECTING";
  }

  return "DISCONNECTED";
}

export async function GET() {
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
          instanceName: null,
          exists: false,
          state: "DISCONNECTED",
          phone: null,
          profileName: null,
        },
        {
          status: 200,
        },
      );
    }

    const response =
      await fetch(
        `${API_URL}/instance/fetchInstances`,
        {
          headers: {
            apikey:
              API_KEY,
          },
          cache:
            "no-store",
        },
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível consultar a conexão do WhatsApp.",
          details:
            data,
        },
        {
          status:
            response.status,
        },
      );
    }

    const list =
      Array.isArray(data)
        ? data
        : isRecord(data) &&
            Array.isArray(data.data)
          ? data.data
          : [];

    const instance =
      list.find((item) => {
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
      }) ?? null;

    if (!instance || !isRecord(instance)) {
      return NextResponse.json({
        instanceName,
        exists:
          false,
        state:
          "DISCONNECTED",
        phone:
          null,
        profileName:
          null,
      });
    }

    const nested =
      isRecord(instance.instance)
        ? instance.instance
        : null;

    const state =
      normalizeState(
        instance.connectionStatus ??
          instance.state ??
          instance.status ??
          nested?.connectionStatus ??
          nested?.state ??
          nested?.status,
      );

    const owner =
      getText(
        instance.ownerJid ??
          nested?.ownerJid,
      );

    const phone =
      owner
        ? owner
            .replace(
              /@s\.whatsapp\.net$/i,
              "",
            )
            .replace(/\D/g, "")
        : null;

    const profileName =
      getText(
        instance.profileName ??
          (isRecord(instance.profile)
            ? instance.profile.name
            : undefined) ??
          nested?.profileName,
      ) || null;

    return NextResponse.json({
      instanceName,
      exists:
        true,
      state,
      phone,
      profileName,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP STATUS]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao consultar a conexão do WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}

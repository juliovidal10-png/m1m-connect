import { NextResponse } from "next/server";
import { getAuthenticatedCompanyId } from "@/lib/tenant";
import { companyRepository } from "@/repositories/company.repository";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME =
  process.env.EVOLUTION_INSTANCE_NAME ||
  process.env.EVOLUTION_INSTANCE;

function clean(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function POST(request: Request) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuração da Evolution API não encontrada.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      messageId?: unknown;
      remoteJid?: unknown;
      text?: unknown;
    };

    const messageId = clean(body.messageId);
    const remoteJid = clean(body.remoteJid);
    const text = clean(body.text);

    if (!messageId || !remoteJid || !text) {
      return NextResponse.json(
        {
          error:
            "messageId, remoteJid e text são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const companyId = await getAuthenticatedCompanyId();
    const company = await companyRepository.findById(companyId);

    if (!company) {
      return NextResponse.json(
        { error: "Empresa não encontrada." },
        { status: 404 },
      );
    }

    const companyInstanceName =
      company.whatsappInstanceName?.trim();

    let instanceName =
      companyInstanceName || INSTANCE_NAME;

    if (!instanceName) {
      const instancesResponse = await fetch(
        `${API_URL}/instance/fetchInstances`,
        {
          headers: {
            apikey: API_KEY,
          },
          cache: "no-store",
        },
      );

      const instancesData =
        await instancesResponse.json();

      if (!instancesResponse.ok) {
        return NextResponse.json(
          {
            error:
              "Não foi possível localizar a instância do WhatsApp.",
          },
          { status: 502 },
        );
      }

      const instances = Array.isArray(instancesData)
        ? instancesData
        : [];

      instanceName =
        instances.find(
          (item: any) =>
            item?.connectionStatus === "open" ||
            item?.instance?.state === "open" ||
            item?.instance?.status === "open",
        )?.name ||
        instances.find(
          (item: any) =>
            item?.instance?.instanceName,
        )?.instance?.instanceName ||
        instances[0]?.name ||
        instances[0]?.instance?.instanceName;
    }

    if (!instanceName) {
      return NextResponse.json(
        {
          error:
            "Nenhuma instância do WhatsApp foi encontrada.",
        },
        { status: 404 },
      );
    }

    const evolutionResponse = await fetch(
      `${API_URL}/chat/updateMessage/${encodeURIComponent(
        instanceName,
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          number: remoteJid,
          text,
          key: {
            id: messageId,
            remoteJid,
            fromMe: true,
          },
        }),
        cache: "no-store",
      },
    );

    const raw = await evolutionResponse.text();

    let data: unknown = raw;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // Mantém resposta textual da Evolution.
    }

    if (!evolutionResponse.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "message" in data
          ? String((data as any).message)
          : raw;

      return NextResponse.json(
        {
          error:
            detail ||
            "Não foi possível editar a mensagem.",
        },
        { status: evolutionResponse.status },
      );
    }

    return NextResponse.json({
      ok: true,
      text,
      evolution: data,
    });
  } catch (error) {
    console.error(
      "Erro ao editar mensagem:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao editar mensagem.",
      },
      { status: 500 },
    );
  }
}

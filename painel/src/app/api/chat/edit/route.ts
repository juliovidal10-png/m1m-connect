import { NextResponse } from "next/server";
import { getAuthenticatedCompanyId } from "@/lib/tenant";
import { getMessageById } from "@/lib/evolution";
import { companyRepository } from "@/repositories/company.repository";
import { messageService } from "@/services/message.service";
import type { Prisma } from "@/generated/prisma/client";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeEditedPayload(
  storedPayload: unknown,
  originalPayload: unknown,
  text: string,
): Prisma.InputJsonValue {
  const source = isRecord(storedPayload)
    ? storedPayload
    : isRecord(originalPayload)
      ? originalPayload
      : {};
  const payload = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
  const originalMessage = isRecord(payload.message) ? payload.message : {};
  const updatedMessage = { ...originalMessage };

  if (typeof updatedMessage.conversation === "string") {
    updatedMessage.conversation = text;
  } else if (isRecord(updatedMessage.extendedTextMessage)) {
    updatedMessage.extendedTextMessage = {
      ...updatedMessage.extendedTextMessage,
      text,
    };
  } else {
    updatedMessage.conversation = text;
  }

  payload.message = updatedMessage;
  payload.m1mEditedText = text;
  return payload as Prisma.InputJsonValue;
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
      participant?: unknown;
      text?: unknown;
    };

    const messageId = clean(body.messageId);
    const text = clean(body.text);

    if (!messageId || !text) {
      return NextResponse.json(
        {
          error:
            "messageId e text são obrigatórios.",
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

    const originalMessage = await getMessageById(
      messageId,
      instanceName,
    );
    const originalKey =
      typeof originalMessage === "object" &&
      originalMessage !== null &&
      "key" in originalMessage &&
      typeof originalMessage.key === "object" &&
      originalMessage.key !== null
        ? originalMessage.key as Record<string, unknown>
        : null;

    if (
      !originalKey ||
      clean(originalKey.id) !== messageId
    ) {
      return NextResponse.json(
        { error: "Mensagem original não encontrada na instância desta empresa." },
        { status: 404 },
      );
    }

    const storedMessage = await messageService.getMessageByEvolutionId(
      companyId,
      instanceName,
      messageId,
    );

    if (!storedMessage) {
      return NextResponse.json(
        { error: "Mensagem original não encontrada no histórico desta empresa." },
        { status: 404 },
      );
    }

    if (!storedMessage.fromMe) {
      return NextResponse.json(
        { error: "Só é possível editar mensagens enviadas por esta conta." },
        { status: 403 },
      );
    }

    if (originalKey.fromMe !== true) {
      return NextResponse.json(
        { error: "Só é possível editar mensagens enviadas por esta conta." },
        { status: 403 },
      );
    }

    const remoteJid = clean(originalKey.remoteJid);
    const participant = clean(originalKey.participant);

    if (!remoteJid) {
      return NextResponse.json(
        { error: "A conversa original não possui um identificador válido." },
        { status: 422 },
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
            ...(participant ? { participant } : {}),
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

    try {
      await messageService.updateEditedMessage(
        companyId,
        instanceName,
        messageId,
        text,
        makeEditedPayload(
          storedMessage.rawPayload,
          originalMessage,
          text,
        ),
      );
    } catch (error) {
      console.error("Falha ao atualizar mensagem editada no histórico local.", {
        companyId,
        instanceName,
        messageId,
        error,
      });
      return NextResponse.json(
        { error: "O WhatsApp aceitou a edição, mas o histórico do Centralizap não pôde ser atualizado." },
        { status: 500 },
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

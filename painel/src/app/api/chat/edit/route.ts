import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getAuthenticatedCompanyId } from "@/lib/tenant";
import { companyRepository } from "@/repositories/company.repository";
import { messageService } from "@/services/message.service";

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

function getEditedPayload(
  rawPayload: unknown,
  text: string,
): Prisma.InputJsonValue {
  if (!isRecord(rawPayload) || !isRecord(rawPayload.message)) {
    throw new Error("O conteúdo original da mensagem não está disponível para edição.");
  }

  const originalMessage = rawPayload.message;
  let editedMessage: Record<string, unknown>;

  if (typeof originalMessage.conversation === "string") {
    editedMessage = { ...originalMessage, conversation: text };
  } else if (isRecord(originalMessage.extendedTextMessage)) {
    editedMessage = {
      ...originalMessage,
      extendedTextMessage: {
        ...originalMessage.extendedTextMessage,
        text,
      },
    };
  } else {
    throw new Error("Esta mensagem não é um texto que possa ser editado.");
  }

  return JSON.parse(JSON.stringify({
    ...rawPayload,
    message: editedMessage,
    m1mEditedText: text,
  })) as Prisma.InputJsonValue;
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

    const storedMessage = await messageService.getMessageByEvolutionId(
      companyId,
      instanceName,
      messageId,
    );

    if (!storedMessage) {
      return NextResponse.json(
        { error: "Mensagem não encontrada no histórico desta empresa." },
        { status: 404 },
      );
    }

    if (!storedMessage.fromMe) {
      return NextResponse.json(
        { error: "Só é possível editar mensagens enviadas pela empresa." },
        { status: 403 },
      );
    }

    const storedPayload = isRecord(storedMessage.rawPayload)
      ? storedMessage.rawPayload
      : null;
    const storedKey = storedPayload && isRecord(storedPayload.key)
      ? storedPayload.key
      : null;
    const storedPayloadMessageId = clean(storedKey?.id);
    const actualRemoteJid = clean(storedKey?.remoteJid) || storedMessage.remoteJid;
    const actualParticipant = clean(storedKey?.participant);

    if (storedPayloadMessageId && storedPayloadMessageId !== messageId) {
      return NextResponse.json(
        { error: "O identificador da mensagem não corresponde ao histórico salvo." },
        { status: 409 },
      );
    }

    if (!actualRemoteJid) {
      return NextResponse.json(
        { error: "Não foi possível identificar a conversa original da mensagem." },
        { status: 409 },
      );
    }

    let editedPayload: Prisma.InputJsonValue;
    try {
      editedPayload = getEditedPayload(storedMessage.rawPayload, text);
    } catch (payloadError) {
      return NextResponse.json(
        {
          error: payloadError instanceof Error
            ? payloadError.message
            : "Não foi possível preparar a mensagem editada.",
        },
        { status: 409 },
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
          number: actualRemoteJid,
          text,
          key: {
            id: messageId,
            remoteJid: actualRemoteJid,
            fromMe: true,
            ...(actualParticipant ? { participant: actualParticipant } : {}),
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
        editedPayload,
      );
    } catch (persistenceError) {
      console.error("Evolution edit succeeded but local message history could not be updated:", persistenceError);
      return NextResponse.json(
        { error: "A Evolution aceitou a edição, mas não foi possível salvá-la no histórico do Centralizap." },
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

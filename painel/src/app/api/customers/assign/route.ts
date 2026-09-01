import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  M1MMessageAuthorType,
  M1MUserPermission,
} from "@/generated/prisma/enums";
import {
  AuthorizationError,
  authorizationService,
} from "@/services/auth/authorization.service";
import {
  AttendanceConflictError,
  attendanceService,
} from "@/services/attendance.service";
import { prisma } from "@/lib/prisma";
import {
  companyRepository,
} from "@/repositories/company.repository";
import { customerService } from "@/services/customer.service";
import {
  conversationSyncService,
} from "@/services/conversation-sync.service";
import {
  manualOutgoingAuthorRegistryService,
} from "@/services/manual-outgoing-author-registry.service";

type EvolutionResponseRecord =
  Record<string, unknown>;

function getEvolutionMessageId(
  value: unknown,
): string {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return "";
  }

  const record =
    value as EvolutionResponseRecord;

  const key =
    typeof record.key === "object" &&
    record.key !== null &&
    !Array.isArray(record.key)
      ? (record.key as EvolutionResponseRecord)
      : null;

  return typeof key?.id === "string"
    ? key.id.trim()
    : "";
}

const API_URL =
  process.env.EVOLUTION_API_URL;

const API_KEY =
  process.env.EVOLUTION_API_KEY;

function getErrorStatus(
  error: unknown,
) {
  if (error instanceof AuthorizationError) {
    return error.statusCode;
  }

  if (error instanceof AttendanceConflictError) {
    return 409;
  }

  return 500;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

async function sendHumanIntroduction(input: {
  companyId: string;
  responsibleId: string;
  remoteJid: string;
}) {
  if (!API_URL || !API_KEY) {
    throw new Error(
      "Configuração da Evolution API não encontrada.",
    );
  }

  const messageAuthor =
    await prisma.m1MUser.findFirst({
      where: {
        id: input.responsibleId,
        companyId: input.companyId,
      },
      select: {
        name: true,
        displayName: true,
      },
    });

  const messageAuthorName =
    messageAuthor?.displayName?.trim() ||
    messageAuthor?.name?.trim() ||
    "Atendente";

  const company =
    await companyRepository.findById(
      input.companyId,
    );

  if (!company) {
    throw new Error(
      "Empresa não encontrada.",
    );
  }

  const instanceName =
    company.whatsappInstanceName?.trim();

  if (!instanceName) {
    throw new Error(
      "Instância do WhatsApp não configurada para esta empresa.",
    );
  }

  const text =
    `Olá! Meu nome é ${messageAuthorName} e, a partir de agora, vou continuar seu atendimento por aqui.`;

  const response =
    await fetch(
      `${API_URL}/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          number:
            input.remoteJid,
          text,
        }),
      },
    );

  const rawText =
    await response.text();

  let data: unknown = null;

  if (rawText) {
    try {
      data =
        JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao enviar apresentação do atendente pela Evolution API (${response.status}).`,
    );
  }

  const evolutionMessageId =
    getEvolutionMessageId(data);

  if (!evolutionMessageId) {
    throw new Error(
      "A Evolution não confirmou o envio da apresentação do atendente.",
    );
  }

  manualOutgoingAuthorRegistryService.register(
    instanceName,
    evolutionMessageId,
    input.responsibleId,
    messageAuthorName,
  );

  await conversationSyncService.syncConversation(
    input.remoteJid,
    instanceName,
    input.companyId,
  );

  await prisma.m1MMessage.updateMany({
    where: {
      companyId:
        input.companyId,
      instanceName,
      evolutionMessageId,
      fromMe: true,
    },
    data: {
      authorType:
        M1MMessageAuthorType.HUMAN,
      authorId:
        input.responsibleId,
      authorName:
        messageAuthorName,
    },
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorizedUser =
      await authorizationService.requirePermission(
        M1MUserPermission.ASSUME_ATTENDANCE,
      );

    const companyId =
      authorizedUser.companyId;

    const responsibleId =
      authorizedUser.userId;

    const body = await request.json();

    const existingAttendance =
      await attendanceService.getOpenAttendanceByCustomer(
        companyId,
        body.customerId,
      );

    const attendance =
      existingAttendance ??
      (await attendanceService.startAttendance(
        companyId,
        body.customerId,
      ));

    const assumption =
      await attendanceService.assumeAttendanceWithAcquisitionResult(
        companyId,
        attendance.id,
        responsibleId,
      );

    const assumedAttendance =
      assumption.attendance;

    const customer =
      await customerService.assignResponsible({
        companyId,
        customerId: body.customerId,
        responsibleId,
      });

    let introductionSent = false;

    if (assumption.acquiredNow) {
      try {
        await sendHumanIntroduction({
          companyId,
          responsibleId,
          remoteJid:
            customer.remoteJid,
        });

        introductionSent = true;
      } catch (error) {
        console.error(
          "ERRO AO ENVIAR APRESENTAÇÃO AUTOMÁTICA DO ATENDENTE:",
          error,
        );
      }
    }

    return NextResponse.json({
      customer,
      attendance:
        assumedAttendance,
      introductionSent,
    });
  } catch (error) {
    console.error(
      "ERRO CUSTOMERS ASSIGN POST:",
      error,
    );

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro ao assumir o atendimento.",
        ),
      },
      {
        status: getErrorStatus(error),
      },
    );
  }
}
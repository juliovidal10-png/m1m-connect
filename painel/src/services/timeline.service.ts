import { timelineRepository } from "@/repositories/timeline.repository";

export type CustomerTimelineItem = {
  id: string;
  source:
    | "MESSAGE"
    | "ATTENDANCE"
    | "RECEIPT"
    | "REMINDER";
  type: string;
  title: string;
  description: string | null;
  occurredAt: string;
  actor: {
    id: string | null;
    name: string;
    type: string;
  } | null;
  metadata: Record<string, unknown>;
};

const attendanceLabels: Record<
  string,
  string
> = {
  STARTED_BY_AI:
    "Atendimento iniciado pela IA",
  TRANSFERRED_TO_SECTOR:
    "Atendimento transferido de setor",
  TAKEN_BY_HUMAN:
    "Atendimento assumido por atendente",
  FINISHED_BY_HUMAN:
    "Atendimento finalizado por atendente",
  FINISHED_BY_AI:
    "Atendimento finalizado pela IA",
};

const receiptLabels: Record<
  string,
  string
> = {
  RECEIVED:
    "Comprovante recebido",
  CLASSIFIED:
    "Comprovante classificado",
  REVIEW_STARTED:
    "Análise do comprovante iniciada",
  APPROVED:
    "Comprovante aprovado",
  REJECTED:
    "Comprovante recusado",
  AWAITING_NEW_RECEIPT:
    "Novo comprovante solicitado",
  CUSTOMER_NOTIFIED:
    "Cliente notificado sobre o comprovante",
  FINISHED:
    "Análise do comprovante finalizada",
  NOTE_ADDED:
    "Observação adicionada ao comprovante",
};

const messageLabels: Record<
  string,
  string
> = {
  TEXT: "Mensagem de texto",
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  AUDIO: "Áudio",
  DOCUMENT: "Documento",
  LOCATION: "Localização",
  CONTACT: "Contato",
  STICKER: "Figurinha",
  UNKNOWN: "Mensagem",
};

function actorName(
  actor:
    | {
        id: string;
        name: string;
        displayName: string | null;
      }
    | null,
  actorType: string,
) {
  if (actor) {
    return {
      id: actor.id,
      name:
        actor.displayName?.trim() ||
        actor.name,
      type: actorType,
    };
  }

  if (actorType === "AI") {
    return {
      id: null,
      name: "Inteligência artificial",
      type: actorType,
    };
  }

  if (actorType === "SYSTEM") {
    return {
      id: null,
      name: "Sistema",
      type: actorType,
    };
  }

  return null;
}

function messageDescription(
  message: {
    type: string;
    content: string | null;
    mimeType: string | null;
  },
) {
  const content =
    message.content?.trim();

  if (content) {
    return content;
  }

  if (message.type === "IMAGE") {
    return "Imagem enviada na conversa.";
  }

  if (message.type === "VIDEO") {
    return "Vídeo enviado na conversa.";
  }

  if (message.type === "AUDIO") {
    return "Áudio enviado na conversa.";
  }

  if (message.type === "DOCUMENT") {
    return message.mimeType
      ? `Documento ${message.mimeType}.`
      : "Documento enviado na conversa.";
  }

  return null;
}

function receiptDescription(
  event: {
    receipt: {
      amount: {
        toString(): string;
      } | null;
      paymentMethod: string | null;
      identifiedBank: string | null;
    };
  },
) {
  const parts: string[] = [];

  if (event.receipt.amount) {
    parts.push(
      `Valor: R$ ${event.receipt.amount
        .toString()
        .replace(".", ",")}`,
    );
  }

  if (event.receipt.paymentMethod) {
    parts.push(
      `Forma: ${event.receipt.paymentMethod}`,
    );
  }

  if (event.receipt.identifiedBank) {
    parts.push(
      `Banco: ${event.receipt.identifiedBank}`,
    );
  }

  return parts.length > 0
    ? parts.join(" • ")
    : null;
}

function normalizeLimit(
  value?: number,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 100;
  }

  return Math.min(
    Math.max(
      Math.trunc(value),
      20,
    ),
    300,
  );
}

export const timelineService = {
  async listCustomerTimeline(
    companyId: string,
    customerId: string,
    requestedLimit?: number,
  ) {
    const customer =
      await timelineRepository.findCustomer(
        companyId,
        customerId,
      );

    if (!customer) {
      throw new Error(
        "Cliente não encontrado.",
      );
    }

    const limit =
      normalizeLimit(
        requestedLimit,
      );

    const sourceLimit =
      Math.min(limit, 150);

    const [
      messages,
      attendanceEvents,
      receiptEvents,
      reminders,
    ] = await Promise.all([
      timelineRepository.listMessages(
        companyId,
        customerId,
        sourceLimit,
      ),
      timelineRepository.listAttendanceEvents(
        companyId,
        customerId,
        sourceLimit,
      ),
      timelineRepository.listReceiptEvents(
        companyId,
        customerId,
        sourceLimit,
      ),
      timelineRepository.listReminders(
        companyId,
        customerId,
        sourceLimit,
      ),
    ]);

    const items: CustomerTimelineItem[] =
      [];

    for (const message of messages) {
      items.push({
        id: `message:${message.id}`,
        source: "MESSAGE",
        type: message.type,
        title: message.fromMe
          ? `${messageLabels[message.type] || "Mensagem"} enviada`
          : `${messageLabels[message.type] || "Mensagem"} recebida`,
        description:
          messageDescription(message),
        occurredAt:
          message.sentAt.toISOString(),
        actor: message.fromMe
          ? {
              id: null,
              name: "Equipe",
              type: "USER",
            }
          : {
              id: null,
              name: "Cliente",
              type: "CUSTOMER",
            },
        metadata: {
          messageId: message.id,
          direction: message.direction,
          mediaUrl: message.mediaUrl,
          mimeType: message.mimeType,
        },
      });
    }

    for (
      const event of attendanceEvents
    ) {
      items.push({
        id: `attendance:${event.id}`,
        source: "ATTENDANCE",
        type: event.type,
        title:
          attendanceLabels[event.type] ||
          "Evento de atendimento",
        description:
          event.attendance.sector?.name
            ? `Setor: ${event.attendance.sector.name}`
            : null,
        occurredAt:
          event.createdAt.toISOString(),
        actor: actorName(
          event.actor,
          event.actorType,
        ),
        metadata: {
          attendanceId:
            event.attendance.id,
          attendanceNumber:
            event.attendance.number,
          sector:
            event.attendance.sector,
          eventMetadata:
            event.metadata,
        },
      });
    }

    for (
      const event of receiptEvents
    ) {
      items.push({
        id: `receipt:${event.id}`,
        source: "RECEIPT",
        type: event.type,
        title:
          receiptLabels[event.type] ||
          "Evento de comprovante",
        description:
          receiptDescription(event),
        occurredAt:
          event.createdAt.toISOString(),
        actor: actorName(
          event.actor,
          event.actorType,
        ),
        metadata: {
          receiptId:
            event.receipt.id,
          status:
            event.receipt.status,
          mediaUrl:
            event.receipt.mediaUrl,
          fileName:
            event.receipt.fileName,
          eventMetadata:
            event.metadata,
        },
      });
    }

    for (
      const reminder of reminders
    ) {
      items.push({
        id: `reminder-created:${reminder.id}`,
        source: "REMINDER",
        type: "CREATED",
        title: "Lembrete criado",
        description:
          reminder.description?.trim() ||
          reminder.title,
        occurredAt:
          reminder.createdAt.toISOString(),
        actor: reminder.responsible
          ? {
              id: null,
              name:
                reminder.responsible,
              type: "USER",
            }
          : null,
        metadata: {
          reminderId:
            reminder.id,
          remindAt:
            reminder.remindAt.toISOString(),
          status:
            reminder.status,
        },
      });

      if (reminder.completedAt) {
        items.push({
          id: `reminder-completed:${reminder.id}`,
          source: "REMINDER",
          type: "COMPLETED",
          title: "Lembrete concluído",
          description:
            reminder.title,
          occurredAt:
            reminder.completedAt.toISOString(),
          actor: reminder.responsible
            ? {
                id: null,
                name:
                  reminder.responsible,
                type: "USER",
              }
            : null,
          metadata: {
            reminderId:
              reminder.id,
          },
        });
      }
    }

    items.sort(
      (first, second) =>
        new Date(
          second.occurredAt,
        ).getTime() -
        new Date(
          first.occurredAt,
        ).getTime(),
    );

    return {
      customer: {
        id: customer.id,
        name:
          customer.name?.trim() ||
          customer.phone ||
          "Cliente",
        phone: customer.phone,
      },
      total: items.length,
      items: items.slice(0, limit),
    };
  },
};

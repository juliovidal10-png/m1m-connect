import type { ReactNode } from "react";

export type CustomerMediaMessageLike = {
  id: string;
  messageType?: string | null;
  messageTimestamp: number | string | Date;
  key: {
    fromMe: boolean;
  };
  message?: {
    imageMessage?: {
      caption?: string | null;
    } | null;
    audioMessage?: {
      seconds?: number | null;
    } | null;
    videoMessage?: {
      caption?: string | null;
    } | null;
    documentMessage?: {
      fileName?: string | null;
      title?: string | null;
    } | null;
  } | null;
};

export function getInitial(
  value?: string | null,
) {
  return (
    value?.trim().charAt(0).toUpperCase() ||
    "?"
  );
}

export function formatMessageTime(
  value: number | string | Date,
) {
  const date =
    typeof value === "number"
      ? new Date(value * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatReminderDate(
  value: string | Date,
) {
  const reminderDate = new Date(value);

  if (Number.isNaN(reminderDate.getTime())) {
    return "Data indisponível";
  }

  const now = new Date();
  const differenceInMilliseconds =
    reminderDate.getTime() - now.getTime();

  const minuteInMilliseconds = 60_000;
  const hourInMilliseconds =
    60 * minuteInMilliseconds;
  const dayInMilliseconds =
    24 * hourInMilliseconds;

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const startOfReminderDay = new Date(
    reminderDate.getFullYear(),
    reminderDate.getMonth(),
    reminderDate.getDate(),
  );

  const calendarDayDifference = Math.round(
    (startOfReminderDay.getTime() -
      startOfToday.getTime()) /
      dayInMilliseconds,
  );

  if (differenceInMilliseconds < 0) {
    const delayInMilliseconds =
      Math.abs(differenceInMilliseconds);

    if (delayInMilliseconds < hourInMilliseconds) {
      const minutes = Math.max(
        1,
        Math.floor(
          delayInMilliseconds /
            minuteInMilliseconds,
        ),
      );

      return `Atrasado há ${minutes} minuto${
        minutes === 1 ? "" : "s"
      }`;
    }

    if (delayInMilliseconds < dayInMilliseconds) {
      const hours = Math.max(
        1,
        Math.floor(
          delayInMilliseconds /
            hourInMilliseconds,
        ),
      );

      return `Atrasado há ${hours} hora${
        hours === 1 ? "" : "s"
      }`;
    }

    const days = Math.max(
      1,
      Math.floor(
        delayInMilliseconds /
          dayInMilliseconds,
      ),
    );

    return `Atrasado há ${days} dia${
      days === 1 ? "" : "s"
    }`;
  }

  if (calendarDayDifference === 0) {
    return `Retorno previsto para hoje às ${formatTime(
      reminderDate,
    )}`;
  }

  if (calendarDayDifference === 1) {
    return `Retorno amanhã às ${formatTime(
      reminderDate,
    )}`;
  }

  if (calendarDayDifference > 1) {
    return `Retorno em ${calendarDayDifference} dias`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(reminderDate);
}

export function getLocalDateInputValue() {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
}

export function getLocalTimeInputValue() {
  const date = new Date(
    Date.now() + 30 * 60_000,
  );

  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
  ].join(":");
}

export function getDocumentName(
  message: CustomerMediaMessageLike,
) {
  return (
    message.message?.documentMessage?.fileName?.trim() ||
    message.message?.documentMessage?.title?.trim() ||
    "Documento"
  );
}

export function getMediaLabel(
  message: CustomerMediaMessageLike,
) {
  if (message.messageType === "imageMessage") {
    return (
      message.message?.imageMessage?.caption?.trim() ||
      "Imagem"
    );
  }

  if (message.messageType === "audioMessage") {
    const seconds =
      message.message?.audioMessage?.seconds;

    return typeof seconds === "number"
      ? `Áudio de ${seconds} segundo${
          seconds === 1 ? "" : "s"
        }`
      : "Áudio";
  }

  if (message.messageType === "videoMessage") {
    return (
      message.message?.videoMessage?.caption?.trim() ||
      "Vídeo"
    );
  }

  if (message.messageType === "documentMessage") {
    return getDocumentName(message);
  }

  return "Arquivo";
}

export function getMediaIcon(
  messageType?: string | null,
): ReactNode {
  if (messageType === "imageMessage") {
    return "📷";
  }

  if (messageType === "audioMessage") {
    return "🎤";
  }

  if (messageType === "videoMessage") {
    return "🎥";
  }

  if (messageType === "documentMessage") {
    return "📄";
  }

  return "📎";
}

export function getFilterLabel(
  filter: string,
) {
  if (filter === "imageMessage") {
    return "Imagens";
  }

  if (filter === "audioMessage") {
    return "Áudios";
  }

  if (filter === "videoMessage") {
    return "Vídeos";
  }

  if (filter === "documentMessage") {
    return "Documentos";
  }

  return "Todos os arquivos";
}

export function isReminderOverdue(
  remindAt: string | Date,
) {
  const date = new Date(remindAt);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
}

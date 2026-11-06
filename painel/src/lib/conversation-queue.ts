export type ConversationQueue = "OPEN" | "WAITING" | "IN_SERVICE";

type OperationalConversation = {
  attendanceState?: string | null;
  attendanceResponsibleId?: string | null;
  attendanceManualWhatsApp?: boolean;
};

export function isManualWhatsAppTakeover(event: unknown): boolean {
  if (!event || typeof event !== "object" || Array.isArray(event)) return false;
  const value = event as { type?: unknown; metadata?: unknown };
  if (value.type !== "TAKEN_BY_HUMAN" || !value.metadata || typeof value.metadata !== "object" || Array.isArray(value.metadata)) return false;
  return (value.metadata as { source?: unknown }).source === "WHATSAPP_MANUAL_MESSAGE";
}

// O estado do atendimento prevalece sobre o status comercial do cliente.
export function getConversationQueue(chat: OperationalConversation): ConversationQueue | null {
  if (chat.attendanceState === "HUMANO") {
    if (chat.attendanceResponsibleId) return "IN_SERVICE";
    return chat.attendanceManualWhatsApp === true ? "OPEN" : "WAITING";
  }
  if (chat.attendanceState == null || chat.attendanceState === "IA" || chat.attendanceState === "FINALIZADO") return "OPEN";
  return null;
}

export function isConversationQueue(value: string): value is ConversationQueue {
  return value === "OPEN" || value === "WAITING" || value === "IN_SERVICE";
}

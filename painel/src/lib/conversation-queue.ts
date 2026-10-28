export type ConversationQueue = "OPEN" | "WAITING" | "IN_SERVICE";

type OperationalConversation = {
  attendanceState?: string | null;
  attendanceResponsibleId?: string | null;
};

// O estado do atendimento prevalece sobre o status comercial do cliente.
export function getConversationQueue(chat: OperationalConversation): ConversationQueue | null {
  if (chat.attendanceState === "HUMANO") {
    return chat.attendanceResponsibleId ? "IN_SERVICE" : "WAITING";
  }
  if (chat.attendanceState == null || chat.attendanceState === "IA") return "OPEN";
  return null;
}

export function isConversationQueue(value: string): value is ConversationQueue {
  return value === "OPEN" || value === "WAITING" || value === "IN_SERVICE";
}

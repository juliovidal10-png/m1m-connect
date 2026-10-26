import { createHmac } from "node:crypto";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue : {};
const kinds = (value: unknown) => Object.fromEntries(
  Object.entries(record(value)).slice(0, 60).map(([key, entry]) => [key.slice(0, 80),
    entry === null ? "null" : Array.isArray(entry) ? "array" : typeof entry]),
);
const markers = new Set(["notify", "append", "history", "historical", "live", "realtime",
  "messages.upsert", "messages.set", "MESSAGES_UPSERT", "MESSAGES_SET"]);
function candidate(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && markers.has(value)) return value;
  return value === undefined ? "absent" : `present:${typeof value}`;
}

/** Observacao apenas: nenhum campo abaixo autoriza contagem ou reabertura. */
export function summarizeWebhookEvidence(body: unknown, secret: string, receivedAt: Date) {
  const root = record(body);
  const data = record(root.data);
  const key = record(data.key ?? root.key);
  const token = (value: unknown) => typeof value === "string" && value.length > 0
    ? createHmac("sha256", secret).update(value).digest("hex").slice(0, 24) : null;
  const message = Object.keys(data).length > 0 ? data : root;
  return {
    classification: "UNCLASSIFIED",
    receivedAt: receivedAt.toISOString(),
    instanceToken: token(root.instance ?? root.instanceName ?? data.instance),
    messageToken: token(key.id),
    conversationToken: token(key.remoteJid),
    alternateConversationToken: token(key.remoteJidAlt),
    fromMe: typeof key.fromMe === "boolean" ? key.fromMe : null,
    // Apenas timestamp numerico original; nenhuma janela temporal e aplicada.
    sourceTimestamp: typeof message.messageTimestamp === "number" && Number.isFinite(message.messageTimestamp)
      ? message.messageTimestamp : null,
    envelopeFields: kinds(root), dataFields: kinds(data), keyFields: kinds(key),
    candidates: Object.fromEntries(["event", "type", "upsertType", "isLatest", "isHistory", "isNew", "source",
      "isOffline", "offline", "sequence", "syncType", "isSync", "isHistorySync"].map(
      (name) => [name, { envelope: candidate(root[name]), data: candidate(data[name]) }],
    )),
    batchSize: Array.isArray(root.data) ? root.data.length
      : Array.isArray(data.messages) ? data.messages.length : null,
  };
}

export function collectWebhookEvidence(body: unknown) {
  if (process.env.M1M_TF3A_CAPTURE_WEBHOOK_EVIDENCE !== "true") return;
  const target = process.env.M1M_TF3A_EVIDENCE_INSTANCE?.trim();
  const secret = process.env.M1M_WEBHOOK_SECRET?.trim();
  if (!target || !secret) return;
  const root = record(body);
  const instance = root.instance ?? root.instanceName ?? record(root.data).instance;
  if (instance !== target) return;
  try {
    console.info("[TF3-A WEBHOOK EVIDENCE]", JSON.stringify(summarizeWebhookEvidence(body, secret, new Date())));
  } catch {
    // Instrumentacao nunca interrompe atendimento nem imprime o payload.
    console.warn("[TF3-A WEBHOOK EVIDENCE] CAPTURE_FAILED");
  }
}

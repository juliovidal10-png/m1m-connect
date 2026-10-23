import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { M1MUserRole } from "@/generated/prisma/enums";
import { authorizationService } from "@/services/auth/authorization.service";
import { companyRepository } from "@/repositories/company.repository";
import { GET as productionList } from "../list/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Chat = { remoteJid?: unknown; canonicalJid?: unknown; unreadCount?: unknown; lastMessage?: { key?: { remoteJid?: unknown; remoteJidAlt?: unknown } } };
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: HEADERS });
const jid = (value: unknown) => typeof value === "string" && /@(lid|s\.whatsapp\.net|g\.us)$/.test(value.toLowerCase().trim()) ? value.toLowerCase().trim() : "";
const ids = (chat: Chat) => new Set([jid(chat.remoteJid), jid(chat.canonicalJid), jid(chat.lastMessage?.key?.remoteJid), jid(chat.lastMessage?.key?.remoteJidAlt)].filter(Boolean));
const unread = (chat: Chat) => typeof chat.unreadCount === "number" && Number.isSafeInteger(chat.unreadCount) && chat.unreadCount >= 0 ? chat.unreadCount : null;

export async function GET(request: Request) {
  if (process.env.TF3_DIAG_ENABLED !== "true" || !process.env.TF3_DIAG_COMPANY_ID ||
      !process.env.TF3_DIAG_HMAC_SECRET || process.env.TF3_DIAG_HMAC_SECRET.length < 32)
    return reply({ error: "Indisponivel" }, 404);
  try {
    const user = await authorizationService.getCurrentUser();
    if (user.companyId !== process.env.TF3_DIAG_COMPANY_ID ||
        !(user.isPrimary || user.role === M1MUserRole.ADMIN))
      return reply({ error: "Acesso negado" }, 403);
    const company = await companyRepository.findById(user.companyId);
    const instance = company?.whatsappInstanceName?.trim();
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!instance || !apiUrl || !apiKey) return reply({ error: "Fonte indisponivel" }, 503);
    const deadline = Date.now() + 25000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
    const url = new URL("/api/chat/list?limit=100&offset=0", request.url);
    // Calls the production handler itself, preserving its CRM, JID/LID, permissions and deduplication.
    // Timeout bounds response only; it cannot cancel work already started by that handler.
    const listResponse = await productionList(new Request(url, { signal: controller.signal }));
    if (controller.signal.aborted) return reply({ error: "Tempo limite excedido" }, 504);
    if (!listResponse.ok) return reply({ error: "Listagem indisponivel" }, 502);
    const listPayload: unknown = await listResponse.json();
    const list = listPayload && typeof listPayload === "object" && "items" in listPayload
      ? (listPayload as { items: unknown }).items : null;
    if (!Array.isArray(list)) return reply({ error: "Resposta inesperada" }, 502);
    const raw: Chat[] = [];
    let complete = false;
    let pages = 0;
    for (let page = 0; page < 3 && !controller.signal.aborted && Date.now() < deadline; page++) {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat/findChats/${encodeURIComponent(instance)}`, {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ where: {}, take: 200, skip: page * 200 }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(Math.min(7000, Math.max(1, deadline - Date.now())))]),
      });
      if (!response.ok) return reply({ error: "Consulta indisponivel" }, 502);
      const data: unknown = await response.json();
      const rows = Array.isArray(data) ? data :
        data && typeof data === "object" && "value" in data ? (data as { value: unknown }).value : null;
      if (!Array.isArray(rows) || rows.length > 200) return reply({ error: "Formato inesperado" }, 502);
      raw.push(...rows as Chat[]);
      pages++;
      if (rows.length < 200) { complete = true; break; }
    }
    if (controller.signal.aborted) return reply({ error: "Tempo limite excedido" }, 504);
    const nonce = randomBytes(24);
    const alias = (value: string) => createHmac("sha256", process.env.TF3_DIAG_HMAC_SECRET!)
      .update(nonce).update(value).digest("hex").slice(0, 16);
    const entries = (list as Chat[]).slice(0, 100).map((chat, index) => {
      const identity = ids(chat);
      const matched = raw.filter((candidate) => [...ids(candidate)].some((id) => identity.has(id)));
      const values = matched.map(unread);
      const valid = values.filter((value): value is number => value !== null);
      const result = unread(chat);
      return {
        alias: alias([...identity].sort().join("|") || `row:${index}`),
        kind: jid(chat.remoteJid).endsWith("@g.us") ? "group" : "individual",
        listUnreadCount: result,
        rawRecordsMatched: matched.length,
        rawUnreadCounts: valid.slice(0, 20),
        rawMissingCount: values.length - valid.length,
        rawCountsTruncated: valid.length > 20,
        comparison: !matched.length ? "NO_RAW_MATCH" : !valid.length ? "NO_VALID_RAW_COUNT" :
          valid.every((value) => value === result) ? "AGREES_ON_EXPLICIT_IDS" : "OBSERVED_DIFFERENCE",
        conclusive: false,
      };
    });
    if (controller.signal.aborted) return reply({ error: "Tempo limite excedido" }, 504);
    return reply({
      diagnostic: "TF3-A", source: "production_list_handler_plus_raw_evolution",
      rawPagesRead: pages, rawRecordsRead: raw.length, rawScanComplete: complete,
      listItemsReturned: list.length,
      limitations: [
        "Only first 100 list entries and up to 600 raw records compared",
        "CRM-only identity links cannot be established using explicit JIDs",
        "Independent upstream requests are not an atomic snapshot",
        "Cancellation is cooperative; in-flight auxiliary enrichment may finish before termination",
        "findChats unreadCount does not independently prove message read status",
      ],
      entries,
    });
    } finally { clearTimeout(timeout); }
  } catch (error) {
    return reply({ error: error instanceof Error && error.message === "TF3_TIMEOUT"
      ? "Tempo limite excedido" : "Falha no diagnostico" }, 500);
  }
}

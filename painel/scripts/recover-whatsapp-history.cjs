const { createRequire } = require("node:module");

const instance = "M1MTesteIA";
const company = "empresa-teste";
const start = "2026-11-06T23:35:00Z";
const end = "2026-11-07T01:14:59Z";
const webhook = "https://connect.marketing1minuto.com/api/webhooks/evolution/messages";
const pageSize = 100;
const batchSize = 10;

async function post(url, headers, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

async function listHistory(base, apikey) {
  const storedIds = new Set();
  const candidates = new Map();
  let total;
  for (let page = 1; page <= 20; page++) {
    const { messages } = await post(`${base}/chat/findMessages/${instance}`, { apikey }, {
      where: { messageTimestamp: { gte: start, lte: end } },
      page,
      offset: pageSize,
    });
    total ??= messages?.total;
    if (!Number.isSafeInteger(total) || messages?.total !== total ||
        messages?.currentPage !== page || messages?.pages !== Math.ceil(total / pageSize) ||
        !Array.isArray(messages?.records)) {
      throw new Error("PAGINACAO_INCONSISTENTE");
    }
    for (const record of messages.records) {
      const timestamp = Number(record.messageTimestamp) * 1000;
      if (!(timestamp >= Date.parse(start) && timestamp <= Date.parse(end)) ||
          typeof record.id !== "string" || storedIds.has(record.id)) {
        throw new Error("HISTORICO_INCONSISTENTE");
      }
      storedIds.add(record.id);
      const { key } = record;
      if (key?.fromMe === false && typeof key.id === "string" && key.id &&
          /@(?:s\.whatsapp\.net|lid|g\.us)$/.test(key.remoteJid ?? "") &&
          record.message && typeof record.message === "object" && !Array.isArray(record.message)) {
        candidates.set(key.id, record);
      }
    }
    if (page >= messages.pages) {
      if (storedIds.size !== total) throw new Error("HISTORICO_INCOMPLETO");
      return [...candidates.values()];
    }
  }
  throw new Error("LIMITE_DE_PAGINAS");
}

async function getMissing(db, records) {
  await db.query("BEGIN READ ONLY");
  try {
    const binding = await db.query(
      'SELECT 1 FROM m1m_companies WHERE id = $1 AND "whatsappInstanceName" = $2',
      [company, instance],
    );
    if (binding.rowCount !== 1) throw new Error("VINCULO_NAO_CONFIRMADO");
    const { rows } = await db.query(
      'SELECT "evolutionMessageId" FROM m1m_messages WHERE "companyId" = $1 AND "instanceName" = $2 AND "evolutionMessageId" = ANY($3::text[])',
      [company, instance, records.map(record => record.key.id)],
    );
    const saved = new Set(rows.map(row => row.evolutionMessageId));
    return records.filter(record => !saved.has(record.key.id));
  } finally {
    await db.query("ROLLBACK");
  }
}

async function main() {
  const [mode, expected, ...extra] = process.argv.slice(2);
  const apply = mode === "--apply";
  if (extra.length || (mode && (!apply || !/^[1-9]\d*$/.test(expected ?? "")))) {
    throw new Error("ARGUMENTOS_INVALIDOS");
  }
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const apikey = process.env.EVOLUTION_API_KEY;
  const secret = process.env.M1M_WEBHOOK_SECRET?.trim();
  if (!base || !apikey || !process.env.DATABASE_URL || (apply && !secret)) {
    throw new Error("CONFIGURACAO_AUSENTE");
  }

  const { Client } = createRequire("/app/package.json")("pg");
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });
  await db.connect();
  try {
    const records = await listHistory(base, apikey);
    const missing = await getMissing(db, records);
    const summary = {
      elegiveis_na_evolution: records.length,
      ja_gravadas: records.length - missing.length,
      faltantes: missing.length,
    };
    console.log(JSON.stringify({ modo: apply ? "aplicar" : "previa", ...summary }));
    if (!apply) return;
    if (missing.length !== Number(expected)) throw new Error("CONTAGEM_MUDOU");

    const headers = { "x-m1m-webhook-secret": secret };
    const batch = data => ({ event: "messages.set", instance, data });
    const check = await post(webhook, { ...headers, "x-m1m-dry-run": "true" }, batch([]));
    if (check?.action !== "HISTORY_DRY_RUN") throw new Error("ROTA_DE_HISTORICO_INDISPONIVEL");

    missing.sort((a, b) => Number(a.messageTimestamp) - Number(b.messageTimestamp));
    for (let i = 0; i < missing.length; i += batchSize) {
      const result = await post(webhook, headers, batch(missing.slice(i, i + batchSize)));
      if (result?.action !== "HISTORY_BATCH_PROCESSED") throw new Error("LOTE_NAO_CONFIRMADO");
    }
    const remaining = await getMissing(db, missing);
    console.log(JSON.stringify({
      recuperadas: missing.length - remaining.length,
      ainda_ausentes: remaining.length,
    }));
  } finally {
    await db.end();
  }
}

main().catch(error => {
  const code = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "RECUPERACAO_INTERROMPIDA";
  console.log(JSON.stringify({ erro: code }));
  process.exitCode = 1;
});

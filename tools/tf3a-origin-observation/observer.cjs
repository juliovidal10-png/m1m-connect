'use strict';
// Observacao passiva. Nao classifica novidade nem altera payloads.
module.exports = function observe(input) {
  if (input.instance !== 'M1MTesteIA') return;
  try {
    const fs = require('node:fs');
    const filename = '/tmp/m1m-tf3a-origin-enable.json';
    const info = fs.statSync(filename);
    if (!info.isFile() || info.size > 4096 || (info.mode & 0o077) !== 0) return;
    const config = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (config.enabled !== true || typeof config.secret !== 'string' || config.secret.length < 64) return;
    if (!['messages.upsert', 'messaging-history.set'].includes(input.handler)) return;
    const { createHmac } = require('node:crypto');
    const token = (kind, value) => typeof value === 'string' && value.length > 0
      ? createHmac('sha256', config.secret).update(kind + '\0M1MTesteIA\0' + value).digest('hex') : undefined;
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const record = {
      schemaVersion: 1, instance: 'M1MTesteIA', handler: input.handler,
      observedAt: new Date().toISOString(), classification: 'UNCLASSIFIED',
      upsertType: ['notify', 'append'].includes(input.type) ? input.type : undefined,
      hasRequestId: typeof input.requestId === 'string' && input.requestId.length > 0,
      isLatest: typeof input.isLatest === 'boolean' ? input.isLatest : undefined,
      progress: Number.isFinite(input.progress) ? input.progress : undefined,
      total: messages.length, truncated: messages.length > 100,
      messages: messages.slice(0, 100).map(m => ({
        idToken: token('message', m?.key?.id),
        conversationToken: token('conversation', m?.key?.remoteJid),
        conversationAltToken: token('conversation', m?.key?.remoteJidAlt),
        fromMe: typeof m?.key?.fromMe === 'boolean' ? m.key.fromMe : undefined,
        sourceTimestamp: typeof m?.messageTimestamp === 'number' && Number.isFinite(m.messageTimestamp)
          ? m.messageTimestamp : undefined,
      })),
    };
    console.log('[TF3-A ORIGIN EVIDENCE] ' + JSON.stringify(record));
  } catch { /* Falha de observacao nao pode interromper a entrega. */ }
};

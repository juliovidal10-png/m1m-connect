import assert from 'node:assert/strict';

export const INSTANCE = 'M1MTesteIA';
function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortObject(value[k])]));
  return value;
}
export function comparable(config) {
  return JSON.stringify(sortObject({
    id: config.id, instanceId: config.instanceId, enabled: config.enabled,
    url: config.url, headers: config.headers ?? null,
    webhookByEvents: config.webhookByEvents, webhookBase64: config.webhookBase64,
    events: [...config.events].sort(),
  }));
}
export function plan(config) {
  assert.ok(config && typeof config === 'object', 'Webhook ausente');
  assert.equal(config.enabled, true, 'Webhook precisa estar habilitado');
  assert.ok(typeof config.instanceId === 'string' && config.instanceId, 'Identidade interna ausente');
  assert.equal(config.url, 'https://connect.marketing1minuto.com/api/webhooks/evolution/messages', 'URL diferente da revisada');
  assert.equal(config.webhookByEvents, false, 'Roteamento por evento exige nova revisao');
  assert.equal(typeof config.webhookBase64, 'boolean', 'Configuracao base64 desconhecida');
  assert.deepEqual([...config.events].sort(), ['MESSAGES_UPSERT'], 'Eventos diferentes do estado aprovado');
  const after = { ...config, events: ['MESSAGES_UPSERT', 'MESSAGES_SET'] };
  // Campos omitidos permanecem intactos no update Prisma do controlador 2.3.7.
  return { before: config, after, request: { webhook: { enabled: true, url: config.url, events: after.events } } };
}
export function restoreRequest(saved, current) {
  assert.equal(saved.instance, INSTANCE, 'Backup de outra instancia');
  const expected = plan(saved.before).after;
  assert.equal(comparable(current), comparable(expected), 'Configuracao mudou; rollback automatico interrompido');
  return { webhook: { enabled: true, url: saved.before.url, events: saved.before.events } };
}

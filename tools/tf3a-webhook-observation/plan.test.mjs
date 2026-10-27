import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTANCE, comparable, plan, restoreRequest } from './plan.mjs';
const initial = () => ({ id: 'synthetic-webhook', instanceId: 'synthetic-instance', enabled: true,
  url: 'https://connect.marketing1minuto.com/api/webhooks/evolution/messages',
  headers: { 'x-test': 'synthetic-secret' }, webhookByEvents: false, webhookBase64: false, events: ['MESSAGES_UPSERT'] });
test('plano acrescenta somente MESSAGES_SET sem mutar origem', () => {
  const before = initial(); const copy = structuredClone(before); const change = plan(before);
  assert.deepEqual(before, copy);
  assert.deepEqual(change.request, { webhook: { enabled: true, url: before.url, events: ['MESSAGES_UPSERT', 'MESSAGES_SET'] } });
  assert.deepEqual({ ...change.after, events: before.events }, before);
});
test('restauracao exige estado esperado e retorna apenas eventos originais', () => {
  const before = initial(); const after = plan(before).after;
  assert.deepEqual(restoreRequest({ instance: INSTANCE, before }, after), { webhook: { enabled: true, url: before.url, events: ['MESSAGES_UPSERT'] } });
  assert.throws(() => restoreRequest({ instance: 'other', before }, after));
  for (const delta of [{ url: 'https://changed.invalid' }, { headers: {} }, { webhookBase64: true },
    { instanceId: 'other' }, { events: ['MESSAGES_SET'] }, { enabled: false }]) {
    assert.throws(() => restoreRequest({ instance: INSTANCE, before }, { ...after, ...delta }));
  }
});
test('plano recusa configuracoes nao revisadas', () => {
  for (const delta of [{ webhookByEvents: true }, { enabled: false }, { url: 'https://other.invalid' },
    { events: [] }, { events: ['MESSAGES_UPSERT', 'MESSAGES_SET'] }, { instanceId: '' }]) {
    assert.throws(() => plan({ ...initial(), ...delta }));
  }
});
test('comparacao aceita apenas ordem diferente de eventos e chaves', () => {
  const config = plan(initial()).after;
  assert.equal(comparable(config), comparable({ ...config, events: [...config.events].reverse() }));
  assert.notEqual(comparable(config), comparable({ ...config, headers: null }));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/authorized-operation.cjs', 'utf8');
function setup(events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']) {
  let config = { id: 'synthetic', instanceId: 'synthetic-instance', enabled: true,
    url: 'https://connect.marketing1minuto.com/api/webhooks/evolution/messages',
    headers: { 'x-secret': 'SYNTHETIC_SECRET' }, webhookByEvents: false, webhookBase64: true,
    events, createdAt: 'original', updatedAt: 'original', unknownSetting: 'preserve-me' };
  const original = structuredClone(config);
  const files = new Map(); const calls = []; const logs = []; const process = { env: { AUTHENTICATION_API_KEY: 'SYNTHETIC_APIKEY' }, exitCode: 0 };
  let failPost = false; let corruptAfterPost = false;
  const module = { exports: {} };
  const fakeRequire = name => {
    if (name === 'node:assert/strict') return assert;
    assert.equal(name, 'node:fs');
    return {
      writeFileSync(path, data, options) {
        assert.equal(options.flag, 'wx'); assert.equal(options.mode, 0o600);
        assert.ok(!files.has(path), 'backup existente');
        assert.equal(calls.filter(c => c.method === 'POST').length, 0, 'backup antes da escrita');
        files.set(path, data);
      }, chmodSync(path, mode) { assert.ok(files.has(path)); assert.equal(mode, 0o600); },
      readFileSync(path) { assert.ok(files.has(path)); return files.get(path); },
    };
  };
  vm.runInNewContext(source, { require: fakeRequire, module, process, AbortSignal,
    console: { log: value => logs.push(value), error: value => logs.push(value) },
    fetch: async (url, options) => {
      assert.ok(url.endsWith('/M1MTesteIA')); assert.ok(!url.includes('/global'));
      assert.equal(options.headers.apikey, 'SYNTHETIC_APIKEY');
      calls.push({ url, method: options.method });
      if (options.method === 'POST') {
        if (failPost) throw Error('timeout');
        const body = JSON.parse(options.body);
        assert.deepEqual(Object.keys(body.webhook).sort(), ['enabled', 'events', 'url']);
        config = { ...config, ...body.webhook, updatedAt: 'updated' };
        if (corruptAfterPost) config.unknownSetting = 'changed';
      }
      return { ok: true, json: async () => structuredClone(config) };
    },
  });
  return { run: module.exports.run, files, calls, logs, process, original,
    get config() { return config; }, set failPost(value) { failPost = value; }, set corruptAfterPost(value) { corruptAfterPost = value; } };
}
test('inclui apenas SET, preserva eventos extras e configuracao; restaura backup', async () => {
  const s = setup(); await s.run('apply');
  assert.equal(s.process.exitCode, 0);
  assert.deepEqual(s.config.events, [...s.original.events, 'MESSAGES_SET']);
  assert.deepEqual({ ...s.config, events: s.original.events, updatedAt: s.original.updatedAt }, s.original);
  assert.equal(s.calls.filter(c => c.method === 'POST').length, 1);
  await s.run('restore'); assert.equal(s.process.exitCode, 0);
  assert.deepEqual({ ...s.config, updatedAt: s.original.updatedAt }, s.original);
  assert.ok(!s.logs.join('').includes('SYNTHETIC_SECRET')); assert.ok(!s.logs.join('').includes('SYNTHETIC_APIKEY'));
});
test('SET ja presente nao escreve e nao cria backup', async () => {
  const s = setup(['MESSAGES_UPSERT', 'MESSAGES_SET']); await s.run('apply');
  assert.equal(s.files.size, 0); assert.equal(s.calls.filter(c => c.method === 'POST').length, 0);
});
test('backup existente interrompe antes do POST', async () => {
  const s = setup(); s.files.set('/tmp/m1m-tf3a-webhook-backup.json', 'existing'); await s.run('apply');
  assert.equal(s.process.exitCode, 1); assert.equal(s.calls.filter(c => c.method === 'POST').length, 0);
});
test('timeout nao provoca repeticao automatica e preserva backup', async () => {
  const s = setup(); s.failPost = true; await s.run('apply');
  assert.equal(s.process.exitCode, 1); assert.equal(s.calls.filter(c => c.method === 'POST').length, 1); assert.equal(s.files.size, 1);
});
test('campo inesperado alterado impede sucesso e rollback sobre divergencia', async () => {
  const s = setup(); s.corruptAfterPost = true; await s.run('apply'); assert.equal(s.process.exitCode, 1);
  s.process.exitCode = 0; await s.run('restore'); assert.equal(s.process.exitCode, 1);
  assert.equal(s.calls.filter(c => c.method === 'POST').length, 1);
});
test('inspect permanece somente leitura', async () => {
  const s = setup(); await s.run('inspect'); assert.equal(s.process.exitCode, 0);
  assert.equal(s.files.size, 0); assert.equal(s.calls.filter(c => c.method === 'POST').length, 0);
});

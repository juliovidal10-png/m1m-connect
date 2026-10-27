import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const source = fs.readFileSync(new URL('./observer.cjs', import.meta.url), 'utf8');
const message = { key: { id: 'RAW-ID-SECRET', remoteJid: 'PHONE-SECRET@s.whatsapp.net', fromMe: false }, messageTimestamp: 1, message: { conversation: 'CONTENT-SECRET' }, pushName: 'NAME-SECRET' };
function run({ instance = 'M1MTesteIA', config = { enabled: true, secret: 'k'.repeat(64) }, mode = 0o100600, fail = false, count = 1, handler = 'messages.upsert', type = 'append', requestId = 'REQUEST-SECRET' } = {}) {
  const lines = []; let reads = 0;
  const mod = { exports: {} };
  vm.runInNewContext(source, { module: mod, console: { log(line) { lines.push(line); } }, require(name) {
    if (name === 'node:crypto') return crypto;
    assert.equal(name, 'node:fs');
    return { statSync() { reads++; if (fail) throw Error('FAIL-SECRET'); return { size: 200, mode, isFile() { return true; } }; }, readFileSync() { return JSON.stringify(config); } };
  } });
  const input = { instance, handler, type, requestId, messages: Array.from({ length: count }, () => structuredClone(message)), progress: 50, isLatest: true };
  const before = JSON.stringify(input); mod.exports(input); assert.equal(JSON.stringify(input), before);
  return { lines, reads };
}
test('outras instancias nao leem configuracao nem emitem logs', () => { const r = run({ instance: 'cliente-real' }); assert.equal(r.reads, 0); assert.equal(r.lines.length, 0); });
test('desativada, permissao aberta, segredo ausente ou falha nao emitem', () => {
  for (const opts of [{ config: { enabled: false } }, { mode: 0o100644 }, { config: { enabled: true } }, { fail: true }]) assert.equal(run(opts).lines.length, 0);
});
test('correlacao estavel sem valores brutos ou classificacao inventada', () => {
  const a = run().lines[0]; const b = run().lines[0];
  for (const secret of ['RAW-ID-SECRET', 'PHONE-SECRET', 'CONTENT-SECRET', 'NAME-SECRET', 'REQUEST-SECRET', 'k'.repeat(64)]) assert.ok(!a.includes(secret));
  const parse = s => JSON.parse(s.slice('[TF3-A ORIGIN EVIDENCE] '.length));
  assert.equal(parse(a).messages[0].idToken, parse(b).messages[0].idToken);
  assert.equal(parse(a).classification, 'UNCLASSIFIED'); assert.equal(parse(a).upsertType, 'append');
});
test('historico e lote limitado explicitamente sem alterar entrada', () => {
  const s = run({ handler: 'messaging-history.set', type: undefined, count: 101 }).lines[0];
  const r = JSON.parse(s.slice('[TF3-A ORIGIN EVIDENCE] '.length));
  assert.equal(r.total, 101); assert.equal(r.truncated, true); assert.equal(r.messages.length, 100);
});
test('marcadores textuais desconhecidos nao vazam', () => { assert.ok(!run({ type: 'UNKNOWN-SECRET' }).lines[0].includes('UNKNOWN-SECRET')); });

'use strict';
// Analisa JS como dados; executa somente funcoes do observador em sandbox.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const [bundle, typescriptRoot] = process.argv.slice(2);
if (!bundle || !typescriptRoot) throw Error('Informe bundle e caminho do TypeScript local.');
const ts = require(typescriptRoot);
const source = fs.readFileSync(bundle, 'utf8');
const tree = ts.createSourceFile('main.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const candidates = [];
function walk(node) {
  if (ts.isFunctionExpression(node) && node.getText(tree).includes('[TF3-A ORIGIN EVIDENCE]')) candidates.push(node.getText(tree));
  ts.forEachChild(node, walk);
}
walk(tree);
assert.equal(candidates.length, 2, 'Esperadas duas funcoes compiladas de observacao');
function exercise(code, { instance = 'M1MTesteIA', enabled = true, mode = 0o100600, fail = false, handler = 'messages.upsert', count = 1 } = {}) {
  const lines = []; let reads = 0;
  const observe = vm.runInNewContext('(' + code + ')', {
    console: { log(text) { lines.push(text); } },
    require(name) {
      if (['crypto', 'node:crypto'].includes(name)) return crypto;
      assert.ok(['fs', 'node:fs'].includes(name), 'Dependencia inesperada');
      return {
        statSync() { reads++; if (fail) throw Error('SIMULATED'); return { size: 200, mode, isFile() { return true; } }; },
        readFileSync() { return JSON.stringify({ enabled, secret: 'k'.repeat(64) }); },
      };
    },
  }, { timeout: 1000 });
  const input = { instance, handler, type: 'append', requestId: 'RAW-REQUEST', messages: Array.from({ length: count }, () => ({ key: { id: 'RAW-ID', remoteJid: 'RAW-PHONE@s.whatsapp.net', remoteJidAlt: 'RAW-ALT@lid', fromMe: false }, messageTimestamp: 1, message: { conversation: 'RAW-CONTENT' }, pushName: 'RAW-NAME' })), isLatest: true, progress: 50 };
  const before = JSON.stringify(input);
  observe(input);
  assert.equal(JSON.stringify(input), before, 'Observacao alterou entrada');
  return { lines, reads };
}
for (const [index, code] of candidates.entries()) {
  const other = exercise(code, { instance: 'other-instance' });
  assert.equal(other.lines.length, 0); assert.equal(other.reads, 0);
  for (const opts of [{ enabled: false }, { mode: 0o100644 }, { fail: true }]) assert.equal(exercise(code, opts).lines.length, 0);
  const first = exercise(code).lines[0];
  assert.ok(first);
  for (const raw of ['RAW-ID', 'RAW-PHONE', 'RAW-ALT', 'RAW-CONTENT', 'RAW-NAME', 'RAW-REQUEST', 'k'.repeat(64)]) assert.ok(!first.includes(raw));
  const parse = value => JSON.parse(value.slice('[TF3-A ORIGIN EVIDENCE] '.length));
  const data = parse(first);
  assert.equal(data.classification, 'UNCLASSIFIED'); assert.equal(data.upsertType, 'append');
  assert.equal(data.messages[0].idToken, parse(exercise(code).lines[0]).messages[0].idToken);
  const history = parse(exercise(code, { handler: 'messaging-history.set', count: 101 }).lines[0]);
  assert.equal(history.total, 101); assert.equal(history.messages.length, 100); assert.equal(history.truncated, true);
  console.log('OBSERVADOR_COMPILADO_' + (index + 1) + '=APROVADO_COM_DEPENDENCIAS_SIMULADAS');
}
console.log('BUNDLE_SHA256=' + crypto.createHash('sha256').update(source).digest('hex'));
console.log('RESULTADO=COLETORES_COMPILADOS_VERIFICADOS_SEM_EXECUTAR_EVOLUTION');

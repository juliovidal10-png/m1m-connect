// Somente gera arquivo candidato fora da fonte; nao modifica checkout/container.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [root, output] = process.argv.slice(2);
if (!root || !output) throw Error('Uso: node prepare.mjs CHECKOUT_EVOLUTION ARQUIVO_CANDIDATO');
const relative = 'src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts';
const expected = 'cd800f2976e1e5b682fbf86a01ee4d85ae61f370';
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== expected) throw Error('HEAD nao revisado');
const original = readFileSync(resolve(root, relative), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
if (sha(original) !== 'd920d4fdd3cae90cb0369ad501774388388f28475135562f6977628efa913d0c') throw Error('Fonte diferente; nada sobrescrito');
if (resolve(output) === resolve(root, relative)) throw Error('Saida nao pode sobrescrever fonte');
const observer = readFileSync(fileURLToPath(new URL('./observer.cjs', import.meta.url)), 'utf8')
  .replace(/^'use strict';\s*/, '').replace('module.exports = ', '').replace(/;\s*$/, '')
  .replace('function observe(input)', 'function observe(input: { instance: string; handler: string; type?: string; requestId?: string; messages: any[]; isLatest?: boolean; progress?: number })');
const upsert = 'this.sendDataWebhook(Events.MESSAGES_UPSERT, messageRaw);';
const history = 'this.sendDataWebhook(Events.MESSAGES_SET, [...messagesRaw], true, undefined, {';
let candidate = original;
for (const [needle, input] of [[upsert, "{ instance: this.instance.name, handler: 'messages.upsert', type, requestId, messages: [messageRaw] }"], [history, "{ instance: this.instance.name, handler: 'messaging-history.set', isLatest, progress, messages: messagesRaw }"]]) {
  if (candidate.split(needle).length !== 2) throw Error('Ponto de observacao ambiguo');
  candidate = candidate.replace(needle, `(${observer})(${input});\n        ${needle}`);
}
writeFileSync(output, candidate, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ result: 'CANDIDATO_OFFLINE', originalSha256: sha(original), candidateSha256: sha(candidate), published: false }));

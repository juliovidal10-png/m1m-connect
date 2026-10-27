// Preparacao offline da fonte de laboratorio; nao acessa Coolify ou WhatsApp.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.argv[2];
if (!root) throw new Error('Informe o checkout isolado da Evolution 2.3.7.');
const expected = 'cd800f2976e1e5b682fbf86a01ee4d85ae61f370';
const path = 'src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts';
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('rev-parse', 'HEAD') !== expected) throw new Error('HEAD diferente da fonte revisada; interrompido.');
const filename = resolve(root, path);
let source = readFileSync(filename, 'utf8');
const original = execFileSync('git', ['-C', root, 'show', `HEAD:${path}`], { encoding: 'utf8' });
const hash = (value) => createHash('sha256').update(value).digest('hex');
if (hash(source) !== hash(original)) throw new Error('Arquivo ja modificado; nada sobrescrito.');
const replacements = [
  [
    'this.sendDataWebhook(Events.MESSAGES_UPSERT, messageRaw);',
    `this.sendDataWebhook(Events.MESSAGES_UPSERT, {
            ...messageRaw,
            m1mOrigin: {
              schemaVersion: 1,
              handler: 'messages.upsert',
              upsertType: type,
              hasRequestId: Boolean(requestId),
            },
          });`,
  ],
  [
    'this.sendDataWebhook(Events.MESSAGES_SET, [...messagesRaw], true, undefined, {\n          isLatest,\n          progress,\n        });',
    `this.sendDataWebhook(Events.MESSAGES_SET, [...messagesRaw], true, undefined, {
          isLatest,
          progress,
          m1mOrigin: {
            schemaVersion: 1,
            handler: 'messaging-history.set',
          },
        });`,
  ],
];
for (const [before, after] of replacements) {
  if (source.split(before).length !== 2) throw new Error('Ponto de instrumentacao ambiguo ou ausente.');
  source = source.replace(before, after);
}
writeFileSync(filename, source);
console.log('Fonte de laboratorio instrumentada. Nenhum build, deploy ou migration executado.');
console.log(JSON.stringify({ upstreamCommit: expected, originalSha256: hash(original), instrumentedSha256: hash(source) }));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/app/api/chat/list/route.ts', 'utf8');
const functions = source.slice(source.indexOf('const tf3InventoryCache'), source.indexOf('// Mesma identidade visual'));
let now = 0;
let calls = [];
let jobs = [];
const oldChat = { remoteJid: '111@s.whatsapp.net', pushName: 'Anterior' };
const newChat = { ...oldChat, pushName: 'Atualizado' };
let responseChats = [oldChat];
const context = {
  API_URL: 'https://provider.invalid', API_KEY: 'fake', AbortSignal,
  Date: { now: () => now },
  getPrimaryRemoteJid: chat => chat.remoteJid,
  after: task => jobs.push(task),
  fetch: async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    const chats = responseChats;
    return { ok: true, json: async () => chats };
  },
};
vm.runInNewContext(ts.transpileModule(functions + '\nthis.inventory = getOperationalInventory;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText, context);

assert.equal((await context.inventory('a', 'wa-a'))[0].pushName, 'Anterior');
assert.equal(calls[0].body.take, 1000, 'Cold queue still loads a complete inventory');
responseChats = [newChat];
assert.equal((await context.inventory('a', 'wa-a'))[0].pushName, 'Anterior');
assert.equal(calls.length, 1, 'Warm response does not wait for the provider head');
await jobs.shift()();
assert.equal(calls[1].body.take, 200);
assert.equal((await context.inventory('a', 'wa-a'))[0].pushName, 'Atualizado');
now = 60001;
responseChats = [{ ...newChat, pushName: 'Inventário novo' }];
assert.equal((await context.inventory('a', 'wa-a'))[0].pushName, 'Anterior');
await jobs.shift()();
assert.equal((await context.inventory('a', 'wa-a'))[0].pushName, 'Inventário novo');
assert.equal(calls[2].body.take, 1000);
responseChats = [{ remoteJid: '222@s.whatsapp.net', pushName: 'Outra empresa' }];
assert.equal((await context.inventory('b', 'wa-b'))[0].pushName, 'Outra empresa');
assert.match(calls.at(-1).url, /wa-b$/);
console.log('TF8 PASS: cold inventory, warm response, deferred refresh and tenant isolation.');

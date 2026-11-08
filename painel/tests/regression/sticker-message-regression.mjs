import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const sync = fs.readFileSync('src/services/conversation-sync.service.ts', 'utf8');
const enums = Object.fromEntries(['TEXT','IMAGE','AUDIO','VIDEO','DOCUMENT','STICKER','REACTION','UNKNOWN','LOCATION','CONTACT'].map(x => [x,x]));
const normalizer = { M1MMessageType: enums, M1MMessageDirection: { IN: 'IN', OUT: 'OUT' }, Date };
vm.runInNewContext(compile(sync.slice(sync.indexOf('function isRecord('), sync.indexOf('function extractPhone(')) + '\nthis.normalize = normalizeEvolutionMessage;'), normalizer);
const sticker = {
  id: 'stored-sticker', key: { id: 'wa-sticker', fromMe: false, remoteJid: '123@g.us', participant: '5511999990001@s.whatsapp.net' },
  pushName: 'Remetente', messageTimestamp: 1794100000, messageType: 'stickerMessage',
  message: { stickerMessage: { mimetype: 'image/webp', url: 'https://provider.invalid/encrypted', isAnimated: true } },
};
for (const message of [sticker, { ...sticker, messageType: undefined },
  { ...sticker, message: { ...sticker.message, conversation: 'Texto junto' } },
  { ...sticker, message: { stickerMessage: { ...sticker.message.stickerMessage, caption: 'Legenda' } } },
]) {
  const saved = normalizer.normalize(message);
  assert.equal(saved.type, 'STICKER');
  assert.equal(saved.remoteJid, sticker.key.remoteJid);
  assert.equal(saved.sentAt.getTime(), sticker.messageTimestamp * 1000);
  assert.equal(saved.rawPayload.key.participant, sticker.key.participant);
  assert.equal(saved.evolutionMessageId, sticker.key.id);
  assert.equal(saved.content, message.message.conversation || message.message.stickerMessage.caption || '[Figurinha]');
  assert.equal(saved.mimeType, 'image/webp');
  assert.deepEqual(JSON.parse(JSON.stringify(saved.rawPayload)), JSON.parse(JSON.stringify(message)));
}
let response = { media: { mimetype: 'image/webp', base64: 'UklGRg==' }, loading: false, error: false };
let loadedMessage;
const renderer = { exports: {}, require: name => {
  if (name === '@/hooks/useMediaLoader') return { default: (id, message) => { loadedMessage = { id, message }; return response; } };
  if (name.startsWith('./')) return { default: () => null };
  return require(name);
} };
vm.runInNewContext(compile(fs.readFileSync('src/components/chat/MessageRenderer.tsx', 'utf8')), renderer);
const render = message => renderToStaticMarkup(React.createElement(renderer.exports.default, { message }));
for (const message of [sticker, JSON.parse(JSON.stringify(sticker)),
  { ...sticker, message: { ...sticker.message, conversation: 'Texto junto' } },
]) {
  const html = render(message);
  assert.match(html, /<img/);
  assert.match(html, /data:image\/webp;base64/);
  assert.match(html, /object-contain/);
  assert.equal(loadedMessage.id, sticker.id);
  assert.equal(loadedMessage.message.key.id, sticker.key.id);
  if (message.message.conversation) assert.match(html, /Texto junto/);
}
response = { ...response, media: { ...response.media, mimetype: 'application/was' } };
assert.match(render(sticker), /Formato de figurinha não suportado/);
assert.doesNotMatch(render(sticker), /<img/);
response = { ...response, media: { ...response.media, mimetype: 'image/webp' } };
assert.match(render({ ...sticker, message: { stickerMessage: { isLottie: true } } }), /não suportado/);
response = { ...response, loading: true };
assert.match(render(sticker), /Carregando figurinha/);
response = { ...response, loading: false, error: true };
assert.match(render(sticker), /Figurinha indisponível/);
response = { ...response, error: false };
for (const [type, mime] of [['imageMessage','image/jpeg'], ['audioMessage','audio/ogg'], ['videoMessage','video/mp4'], ['documentMessage','application/pdf']]) {
  const message = { ...sticker, messageType: type, message: { [type]: { mimetype: mime, caption: 'Mídia existente' } } };
  response = { ...response, media: { mimetype: mime, base64: 'AAAA' } };
  assert.equal(normalizer.normalize(message).type, { imageMessage:'IMAGE',audioMessage:'AUDIO',videoMessage:'VIDEO',documentMessage:'DOCUMENT' }[type]);
  assert.doesNotMatch(render(message), /Figurinha indisponível|Formato de figurinha/);
}
assert.match(render({ ...sticker, messageType: 'conversation', message: { conversation: 'Texto normal' } }), /Texto normal/);
console.log('TF4 PASS: intake, text, sender/time/history, renderer, WebP animation payload, unsupported format, failures and existing media branches.');

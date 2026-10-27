// Preparado para execucao manual autorizada no container Evolution. Padrao: leitura.
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { INSTANCE, comparable, plan, restoreRequest } from './plan.mjs';

const mode = process.argv[2] ?? 'plan';
const backup = '/tmp/m1m-tf3a-webhook-backup.json';
async function main() {
  if (!['plan', 'apply', 'restore'].includes(mode)) throw Error('Modo invalido');
  const key = process.env.AUTHENTICATION_API_KEY;
  if (!key) throw Error('Chave global ausente no processo');
  const port = Number(process.env.SERVER_PORT) || 8080;
  const protocol = process.env.SERVER_TYPE === 'https' ? 'https' : 'http';
  const base = `${protocol}://127.0.0.1:${port}`;
  async function request(path, body) {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { apikey: key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error(`HTTP ${response.status}; revisar estado antes de repetir`);
    return response.json();
  }
  const current = await request(`/webhook/find/${INSTANCE}`);
  if (mode === 'plan') {
    const change = plan(current);
    console.log(JSON.stringify({ instance: INSTANCE, mode, before: current.events, after: change.after.events, writes: false }));
    return;
  }
  if (process.env.M1M_TF3A_WEBHOOK_CHANGE_AUTHORIZED !== 'true') throw Error('Alteracao nao liberada para esta execucao');
  if (mode === 'apply') {
    const change = plan(current);
    writeFileSync(backup, JSON.stringify({ instance: INSTANCE, before: current, createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    chmodSync(backup, 0o600);
    const recheck = await request(`/webhook/find/${INSTANCE}`);
    if (comparable(recheck) !== comparable(current)) throw Error('Configuracao mudou durante preparo; nenhuma gravacao API enviada');
    await request(`/webhook/set/${INSTANCE}`, change.request);
    const actual = await request(`/webhook/find/${INSTANCE}`);
    if (comparable(actual) !== comparable(change.after)) throw Error('Divergencia apos gravacao; backup preservado, revisar antes de prosseguir');
    console.log(JSON.stringify({ instance: INSTANCE, mode, events: actual.events, backup, verified: true }));
  } else {
    const saved = JSON.parse(readFileSync(backup, 'utf8'));
    await request(`/webhook/set/${INSTANCE}`, restoreRequest(saved, current));
    const actual = await request(`/webhook/find/${INSTANCE}`);
    if (comparable(actual) !== comparable(saved.before)) throw Error('Restauracao nao confirmada; revisar sem repetir automaticamente');
    console.log(JSON.stringify({ instance: INSTANCE, mode, events: actual.events, verified: true }));
  }
}
main().catch(() => {
  // Sem objetos de configuracao, headers, payloads ou mensagens de erro que possam conter segredos.
  console.error('TF3-A: operacao interrompida. Se houve tentativa de gravacao, conferir estado antes de repetir. Backup, quando criado, foi preservado.');
  process.exitCode = 1;
});

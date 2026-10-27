async function run(mode) {
  const fs = require('node:fs');
  const assert = require('node:assert/strict');
  const instance = 'M1MTesteIA';
  const backup = '/tmp/m1m-tf3a-webhook-backup.json';
  let attemptedWrite = false;
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
    return value;
  }
  function fingerprint(value) {
    const copy = { ...value, events: [...value.events].sort() };
    delete copy.updatedAt;
    return JSON.stringify(stable(copy));
  }
  try {
    assert.ok(['apply', 'restore', 'inspect'].includes(mode));
    const key = process.env.AUTHENTICATION_API_KEY;
    assert.ok(key, 'Credencial ausente');
    const port = Number(process.env.SERVER_PORT) || 8080;
    const base = `${process.env.SERVER_TYPE === 'https' ? 'https' : 'http'}://127.0.0.1:${port}`;
    async function request(method, body) {
      const action = method === 'GET' ? 'find' : 'set';
      const response = await fetch(`${base}/webhook/${action}/${instance}`, {
        method, headers: { apikey: key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      return response.json();
    }
    const before = await request('GET');
    assert.ok(before && typeof before.instanceId === 'string' && before.instanceId);
    assert.equal(before.enabled, true);
    assert.equal(before.url, 'https://connect.marketing1minuto.com/api/webhooks/evolution/messages');
    assert.equal(before.webhookByEvents, false);
    assert.ok(Array.isArray(before.events) && before.events.every(e => typeof e === 'string'));
    assert.ok(before.events.includes('MESSAGES_UPSERT'));
    if (mode === 'inspect') {
      console.log(JSON.stringify({ instance, events: before.events, writes: false }));
      return;
    }
    let events;
    let expected;
    if (mode === 'apply') {
      if (before.events.includes('MESSAGES_SET')) {
        console.log(JSON.stringify({ instance, result: 'JA_HABILITADO_SEM_ALTERACAO', events: before.events }));
        return;
      }
      fs.writeFileSync(backup, JSON.stringify({ instance, before, savedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
      fs.chmodSync(backup, 0o600);
      events = [...before.events, 'MESSAGES_SET'];
      expected = { ...before, events };
    } else {
      const saved = JSON.parse(fs.readFileSync(backup, 'utf8'));
      assert.equal(saved.instance, instance);
      assert.ok(!saved.before.events.includes('MESSAGES_SET'));
      assert.equal(fingerprint(before), fingerprint({ ...saved.before, events: [...saved.before.events, 'MESSAGES_SET'] }));
      events = saved.before.events;
      expected = saved.before;
    }
    // Nenhuma edicao simultanea: a API nao oferece compare-and-swap.
    assert.equal(fingerprint(await request('GET')), fingerprint(before));
    attemptedWrite = true;
    await request('POST', { webhook: { enabled: before.enabled, url: before.url, events } });
    const after = await request('GET');
    assert.equal(fingerprint(after), fingerprint(expected));
    console.log(JSON.stringify({ instance, result: mode === 'apply' ? 'INCLUSAO_CONFIRMADA' : 'RESTAURACAO_CONFIRMADA',
      before: before.events, after: after.events, otherConfigurationUnchanged: true, backup }));
  } catch {
    console.error(JSON.stringify({ instance, result: 'INTERROMPIDO', attemptedWrite,
      instruction: attemptedWrite ? 'Nao repetir. Consultar estado e preservar backup para revisao.' : 'Pre-validacao ou backup impediram a operacao; nenhuma escrita API enviada.', backup }));
    process.exitCode = 1;
  }
}

if (require.main === module) run(process.argv[2] || 'inspect');
module.exports = { run };

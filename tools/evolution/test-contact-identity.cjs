const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { patchSocket, patchHistory, m1mResolveIdentityRequest: lookup, m1mCaptureHistoryIdentity: capture } = require('./patch-contact-identity.cjs');
const lid = '100000000001@lid', pn = '5511999990001@s.whatsapp.net';
const otherLid = '100000000002@lid', otherPn = '5511999990002@s.whatsapp.net';
const saved = [];
const repository = { lidMapping: {
    getLIDsForPNs: async phones => phones.map(phone => ({ pn: phone, lid })),
    getPNForLID: async value => value === lid ? pn : null,
    storeLIDPNMappings: async pairs => { saved.push(...pairs); },
} };
async function main() {
    const request = { version: 1, phones: [pn], lids: [lid, otherLid] };
    const result = await lookup(request, repository);
    assert.deepEqual(result.mappings, [{ lid, pn }]);
    assert.deepEqual(result.unresolvedLids, [otherLid]);
    const second = { lidMapping: { getPNForLID: async () => null } };
    assert.equal((await lookup({ version: 1, phones: [], lids: [lid] }, second)).mappings.length, 0,
        'Never share state across socket instances');
    for (const bad of [null, { version: 2, phones: [], lids: [] },
        { version: 1, phones: [lid], lids: [] }, { version: 1, phones: [], lids: [pn] },
        { version: 1, phones: [pn], lids: [], arbitrary: true },
        { version: 1, phones: Array(21).fill(pn), lids: [] }]) {
        await assert.rejects(() => lookup(bad, repository), /M1M_INVALID_IDENTITY_REQUEST/);
    }
    const conflictRepository = { lidMapping: {
        getLIDsForPNs: async () => [{ lid, pn }], getPNForLID: async value => value === lid ? otherPn : null,
    } };
    assert.equal((await lookup(request, conflictRepository)).mappings.length, 0);
    const data = { contacts: [{ id: lid, phoneNumber: pn }, { id: pn, lid }],
        messages: [{ key: { remoteJid: lid } }, { key: { remoteJid: lid, remoteJidAlt: pn } }] };
    await capture(data, repository);
    assert.deepEqual(saved, [{ lid, pn }]);
    assert.equal(data.messages[0].key.remoteJidAlt, pn);
    assert.equal(data.messages[1].key.remoteJidAlt, pn, 'Never overwrite existing message identity');
    saved.length = 0;
    const contradictoryMessage = { contacts: [{ id: lid, phoneNumber: pn }],
        messages: [{ key: { remoteJid: lid, remoteJidAlt: otherPn } }, { key: { remoteJid: lid } }] };
    await capture(contradictoryMessage, repository);
    assert.equal(saved.length, 0);
    assert.equal(contradictoryMessage.messages[1].key.remoteJidAlt, undefined);
    await capture({ contacts: [{ id: lid, phoneNumber: pn }, { id: lid, phoneNumber: otherPn },
        { id: '123@g.us', phoneNumber: pn, lid: otherLid }], messages: [] }, repository);
    assert.equal(saved.length, 0, 'Reject contradictory pairs and group participants');
    await capture({ contacts: [{ id: lid, phoneNumber: pn }, { id: otherLid, phoneNumber: pn }], messages: [] }, repository);
    assert.equal(saved.length, 0, 'Do not replace migration mappings using an ambiguous history batch');
    let warned = false;
    const failedStore = { contacts: [{ id: lid, phoneNumber: pn }], messages: [{ key: { remoteJid: lid } }] };
    await capture(failedStore, { lidMapping: { storeLIDPNMappings: async () => { throw Error('Storage unavailable'); } } }, {
        warn: () => { warned = true; },
    });
    assert.equal(warned, true);
    assert.equal(failedStore.messages[0].key.remoteJidAlt, pn, 'Storage outage does not discard explicit data in the history event');
    const socketFile = process.argv[2], historyFile = process.argv[3];
    assert.ok(socketFile && historyFile, 'Supply exact installed Baileys files');
    const socket = fs.readFileSync(socketFile, 'utf8'), history = fs.readFileSync(historyFile, 'utf8');
    const patchedSocket = patchSocket(socket), patchedHistory = patchHistory(history);
    assert.equal(patchSocket(patchedSocket), patchedSocket);
    assert.equal(patchHistory(patchedHistory), patchedHistory);
    const start = patchedSocket.indexOf('    // M1M: bounded identity lookup');
    const end = patchedSocket.indexOf('    const pnFromLIDUSync', start);
    assert.ok(start >= 0 && end > start);
    const scope = { signalRepository: repository };
    vm.runInNewContext(patchedSocket.slice(start, end) + '\nthis.on = onWhatsApp;', scope);
    assert.equal((await scope.on({ m1mIdentityLookup: request })).mappings[0].pn, pn,
        'Exercise the actual injected onWhatsApp adapter');
    const anchor = '                    const data = await downloadAndProcessHistorySyncNotification(histNotification, options);\n';
    const originalTail = socket.slice(socket.indexOf("        let usyncQuery = new USyncQuery();"));
    assert.ok(patchedSocket.endsWith(originalTail), 'Normal onWhatsApp behavior remains byte-for-byte unchanged');
    assert.ok(patchedHistory.includes(anchor + '                    await m1mCaptureHistoryIdentity(data, signalRepository, logger);'));
    const historyFileUrl = pathToFileURL(path.resolve(path.dirname(historyFile), 'history.js')).href;
    // Compile the patched ESM without starting a WhatsApp connection.
    new vm.SourceTextModule(patchedSocket, { identifier: pathToFileURL(path.resolve(socketFile)).href });
    new vm.SourceTextModule(patchedHistory, { identifier: historyFileUrl });
    assert.throws(() => patchSocket('unsupported'), /INCOMPATIBLE/);
    assert.throws(() => patchHistory('unsupported'), /INCOMPATIBLE/);
    console.log('TF3 PROVIDER PASS: explicit mappings, request bounds, instance isolation, history capture, old behavior and ESM syntax.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

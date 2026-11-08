const fs = require('node:fs');
const path = require('node:path');

// These functions are inserted verbatim into Baileys. No new connection,
// message send, contact merge or credential export is involved.
async function m1mResolveIdentityRequest(request, signalRepository) {
    const phonePattern = /^\d{8,15}@s\.whatsapp\.net$/;
    const lidPattern = /^\d+@lid$/;
    if (!request || request.version !== 1 ||
        Object.keys(request).some(key => !['version', 'phones', 'lids'].includes(key)) ||
        !Array.isArray(request.phones) || !Array.isArray(request.lids) ||
        request.phones.length > 20 || request.lids.length > 100 ||
        request.phones.some(jid => typeof jid !== 'string' || !phonePattern.test(jid)) ||
        request.lids.some(jid => typeof jid !== 'string' || !lidPattern.test(jid))) {
        throw new Error('M1M_INVALID_IDENTITY_REQUEST');
    }
    const phones = [...new Set(request.phones)];
    const lids = [...new Set(request.lids)];
    const candidates = new Map();
    function add(lid, pn) {
        if (!lidPattern.test(lid || '') || !phonePattern.test(pn || '')) return;
        if (!candidates.has(lid)) candidates.set(lid, new Set());
        candidates.get(lid).add(pn);
    }
    if (phones.length) {
        // Native Baileys PN-to-LID lookup uses WhatsApp USync and stores only
        // the response-proven mapping in this instance's existing key store.
        const pairs = await signalRepository.lidMapping.getLIDsForPNs(phones);
        for (const pair of pairs || []) if (phones.includes(pair.pn)) add(pair.lid, pair.pn);
    }
    for (const lid of lids) add(lid, await signalRepository.lidMapping.getPNForLID(lid));
    const mappings = [...candidates].filter(([, pns]) => pns.size === 1)
        .map(([lid, pns]) => ({ lid, pn: [...pns][0] }));
    return {
        m1mIdentityLookup: 1,
        mappings,
        unresolvedLids: lids.filter(lid => !mappings.some(pair => pair.lid === lid)),
    };
}

async function m1mCaptureHistoryIdentity(data, signalRepository, logger) {
    const phonePattern = /^\d{8,15}@s\.whatsapp\.net$/;
    const lidPattern = /^\d+@lid$/;
    const byLid = new Map();
    for (const contact of data.contacts || []) {
        if (!contact || /@(g\.us|newsletter)$/.test(contact.id || '')) continue;
        const ids = [contact.id, contact.lid, contact.phoneNumber];
        const phones = [...new Set(ids.filter(jid => typeof jid === 'string' && phonePattern.test(jid)))];
        const lids = [...new Set(ids.filter(jid => typeof jid === 'string' && lidPattern.test(jid)))];
        for (const lid of lids) {
            if (!byLid.has(lid)) byLid.set(lid, new Set());
            for (const pn of phones) byLid.get(lid).add(pn);
        }
    }
    for (const message of data.messages || []) {
        const key = message?.key;
        const primary = key?.remoteJid, alternate = key?.remoteJidAlt;
        const lid = lidPattern.test(primary || '') ? primary : lidPattern.test(alternate || '') ? alternate : null;
        const pn = phonePattern.test(primary || '') ? primary : phonePattern.test(alternate || '') ? alternate : null;
        if (lid && pn && !/@(g\.us|newsletter)$/.test(primary || '')) {
            if (!byLid.has(lid)) byLid.set(lid, new Set());
            byLid.get(lid).add(pn);
        }
    }
    const pairs = [...byLid].filter(([, pns]) => pns.size === 1).map(([lid, pns]) => ({ lid, pn: [...pns][0] }));
    // Avoid changing the forward mapping when a history batch itself has
    // conflicting LIDs for the same phone; migration is handled by Baileys.
    const pnCounts = new Map();
    for (const pair of pairs) pnCounts.set(pair.pn, (pnCounts.get(pair.pn) || 0) + 1);
    const uniquePairs = pairs.filter(pair => pnCounts.get(pair.pn) === 1);
    if (uniquePairs.length) {
        try {
            for (let offset = 0; offset < uniquePairs.length; offset += 100) {
                await signalRepository.lidMapping.storeLIDPNMappings(uniquePairs.slice(offset, offset + 100));
            }
        } catch {
            logger?.warn('M1M: could not persist explicit history identity links');
        }
    }
    const mapping = new Map(uniquePairs.map(pair => [pair.lid, pair.pn]));
    for (const message of data.messages || []) {
        const key = message?.key;
        const pn = mapping.get(key?.remoteJid);
        if (key && pn && !key.remoteJidAlt) key.remoteJidAlt = pn;
    }
}

const socketAnchor = '    const onWhatsApp = async (...phoneNumber) => {\n';
const historyAnchor = '                    const data = await downloadAndProcessHistorySyncNotification(histNotification, options);\n';
const socketMarker = '// M1M: bounded identity lookup through the existing authenticated Baileys adapter.';
const historyMarker = '// M1M: preserve explicit history LID/PN links before Evolution projects contacts.';
function once(source, anchor, replacement) {
    if (source.split(anchor).length !== 2) throw new Error('M1M_INCOMPATIBLE_BAILEYS_SOURCE');
    return source.replace(anchor, replacement);
}
function patchSocket(source) {
    const helper = `    ${socketMarker}\n    ${m1mResolveIdentityRequest.toString()}\n`;
    const intercept = `        if (phoneNumber.length === 1 && phoneNumber[0] && typeof phoneNumber[0] === 'object' &&\n            Object.prototype.hasOwnProperty.call(phoneNumber[0], 'm1mIdentityLookup')) {\n            return m1mResolveIdentityRequest(phoneNumber[0].m1mIdentityLookup, signalRepository);\n        }\n`;
    if (source.includes(socketMarker)) {
        if (!source.includes(helper) || !source.includes(intercept)) throw new Error('M1M_PARTIAL_IDENTITY_PATCH');
        return source;
    }
    return once(source, socketAnchor, helper + socketAnchor + intercept);
}
function patchHistory(source) {
    const helper = `${historyMarker}\n${m1mCaptureHistoryIdentity.toString()}\n`;
    const call = '                    await m1mCaptureHistoryIdentity(data, signalRepository, logger);\n';
    if (source.includes(historyMarker)) {
        if (!source.includes(helper) || !source.includes(historyAnchor + call)) throw new Error('M1M_PARTIAL_HISTORY_PATCH');
        return source;
    }
    return helper + once(source, historyAnchor, historyAnchor + call);
}
function main() {
    if (process.argv[2] && process.argv[2] !== '--check') throw new Error('M1M_INVALID_ARGUMENT');
    const entry = require.resolve('baileys', { paths: [process.cwd()] });
    const root = path.resolve(path.dirname(entry), '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (pkg.version !== '7.0.0-rc.9') throw new Error('M1M_UNSUPPORTED_BAILEYS_VERSION');
    const targets = [
        [path.join(path.dirname(entry), 'Socket', 'socket.js'), patchSocket],
        [path.join(path.dirname(entry), 'Utils', 'process-message.js'), patchHistory],
    ].map(([file, transform]) => { const source = fs.readFileSync(file, 'utf8'); return { file, source, updated: transform(source) }; });
    if (process.argv[2] !== '--check') for (const target of targets) {
        if (target.source === target.updated) continue;
        const temporary = target.file + '.m1m-identity.tmp';
        fs.writeFileSync(temporary, target.updated, { flag: 'wx', mode: fs.statSync(target.file).mode });
        fs.renameSync(temporary, target.file);
    }
    console.log(JSON.stringify({ identityPatch: process.argv[2] !== '--check' || targets.every(t => t.source === t.updated), baileys: pkg.version }));
}
module.exports = { patchSocket, patchHistory, m1mResolveIdentityRequest, m1mCaptureHistoryIdentity };
if (require.main === module) try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }

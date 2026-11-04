// Prototipo de viabilidade, fora de src/. Nao esta ligado a API, IA ou banco.
// facts sao evidencias INTERNAS verificadas; nunca campos aceitos do webhook/cliente.
const scope = value => JSON.stringify([value.companyId, value.instanceName]);
const identity = value => JSON.stringify([value.companyId, value.instanceName, value.id]);
const activeStates = new Set(['DELETING', 'DELETED', 'RESUMED', 'FAILED']);

export function classify(event, deletion, facts = {}) {
  if (!deletion || scope(event) !== scope(deletion)) return 'NORMAL_FLOW';
  if (!activeStates.has(deletion.state)) return 'NORMAL_FLOW';
  const aliases = deletion.aliases ?? [deletion.remoteJid];
  if (!aliases.includes(event.remoteJid)) {
    return facts.unresolvedIdentity && scope(facts.unresolvedIdentity) === scope(event) &&
      facts.unresolvedIdentity.eventId === event.id ? 'ADMIN_REVIEW' : 'NORMAL_FLOW';
  }
  if (deletion.deletedIds.includes(event.id)) return 'IGNORE_KNOWN_HISTORY';
  const matches = evidence => evidence && scope(evidence) === scope(event) &&
    evidence.eventId === event.id && evidence.deletionId === deletion.id;
  if (matches(facts.preDeletionSnapshot)) return 'IGNORE_PROVEN_HISTORY';
  if (deletion.state === 'DELETING' || deletion.state === 'FAILED') return 'ADMIN_REVIEW';
  if (event.fromMe === true && matches(facts.authenticatedSendReceipt)) return 'NEW_WITHOUT_OLD_HISTORY';
  // Evento/type/source/fromMe, ID e data do transporte nao autorizam reabertura.
  return 'ADMIN_REVIEW';
}

export function receive(state, event, deletion, facts) {
  const action = classify(event, deletion, facts);
  if (action === 'ADMIN_REVIEW') {
    const key = identity(event);
    if (!state.reviews.has(key)) state.reviews.set(key, {
      deletionId: (deletion.aliases ?? [deletion.remoteJid]).includes(event.remoteJid) ? deletion.id : null,
      event: structuredClone(event), state: 'PENDING', version: 1,
    });
  } else if (action === 'NEW_WITHOUT_OLD_HISTORY') {
    state.messages.set(identity(event), structuredClone(event));
  }
  return action;
}

export function review(state, event, deletion, {admin, decision, expectedVersion}) {
  if (!admin?.authenticated || !['ADMIN', 'PLATFORM_ADMIN'].includes(admin.role) ||
      scope(admin) !== scope(event)) throw Error('FORBIDDEN');
  if (!['RESUME', 'DISCARD'].includes(decision)) throw Error('INVALID_DECISION');
  const row = state.reviews.get(identity(event));
  if (!row || scope(deletion) !== scope(event) ||
      (row.deletionId !== deletion.id && !(row.deletionId === null && decision === 'DISCARD'))) throw Error('STALE_DELETION');
  if (row.state !== 'PENDING' || row.version !== expectedVersion) throw Error('CONFLICT');
  if (!['DELETED', 'RESUMED'].includes(deletion.state)) throw Error('DELETION_NOT_COMPLETE');
  if (decision === 'RESUME') {
    state.messages.set(identity(event), {...row.event, origin: 'ADMIN_ACCEPTED_UNCERTAIN'});
    deletion.state = 'RESUMED';
    row.state = 'RESUMED';
  } else row.state = 'DISCARDED';
  row.event = null;
  row.version++;
  // Nenhum acionamento automatico de IA, encaminhamento ou atendimento neste prototipo.
  return row.state;
}

export function planDeletion(records, target, manifest) {
  if (records.attendances.some(a => a.companyId === target.companyId &&
    a.customerId === target.customerId && a.state === 'HUMANO' && !a.finishedAt)) {
    throw Error('FINISH_HUMAN_ATTENDANCE_FIRST');
  }
  const ids = new Set(manifest);
  return records.messages.filter(m => scope(m) === scope(target) &&
    m.remoteJid === target.remoteJid && ids.has(m.id)).map(m => m.id);
}

export function canDeleteContact(dependencies) {
  // Primeira versao bloqueia vinculos; nao executa cascata nem finge desvinculacao.
  return ['messages','attendances','reminders','receipts'].every(key => dependencies[key] === 0);
}

import assert from 'node:assert/strict';
import {classify, receive, review, planDeletion, canDeleteContact} from '../prototypes/conversation-deletion-policy.mjs';
const state = () => ({messages: new Map(), reviews: new Map(), aiCalls: 0, handoffs: 0, attendanceCreates: 0});
const marker = () => ({id: 'deletion-1', companyId: 'A', instanceName: 'instance-A', remoteJid: 'contact@s.whatsapp.net', aliases: ['contact@s.whatsapp.net', 'contact@lid'], state: 'DELETED', deletedIds: ['old']});
const event = (id = 'uncertain', patch = {}) => ({id, companyId: 'A', instanceName: 'instance-A', remoteJid: 'contact@s.whatsapp.net', text: 'Mensagem sintetica', ...patch});
const evidence = e => ({companyId:e.companyId, instanceName:e.instanceName, eventId:e.id, deletionId:'deletion-1'});
const admin = {companyId: 'A', instanceName: 'instance-A', authenticated: true, role: 'ADMIN'};
const passed = [];
const test = (name, callback) => {callback(); passed.push(name);};

test('historico conhecido nunca restaura, mesmo com alegacao de novidade', () => {
  const s = state(), d = marker(), e = event('old');
  assert.equal(receive(s,e,d,{authenticatedSendReceipt:evidence(e)}),'IGNORE_KNOWN_HISTORY');
  assert.equal(s.messages.size,0); assert.equal(s.reviews.size,0);
});
test('historico desconhecido comprovado por snapshot anterior nao restaura', () => {
  const s=state(), e=event('old-unregistered');
  assert.equal(receive(s,e,marker(),{preDeletionSnapshot:evidence(e)}),'IGNORE_PROVEN_HISTORY');
  assert.equal(s.messages.size+s.reviews.size,0);
});
test('nova comprovada persiste somente a nova, inclusive com data antiga', () => {
  const s=state(), e=event('new',{sentAt:'2000-01-01',fromMe:true});
  assert.equal(receive(s,e,marker(),{authenticatedSendReceipt:evidence(e)}),'NEW_WITHOUT_OLD_HISTORY');
  assert.equal(s.messages.size,1); assert.equal(s.reviews.size,0);
});
test('ID desconhecido e transporte nao comprovam nova: revisao visivel e separada', () => {
  const s=state(), d=marker(), e=event('unknown',{source:'android',event:'messages.upsert',status:'DELIVERY_ACK',type:'notify',sentAt:'2099-01-01',isNew:true});
  assert.equal(receive(s,e,d),'ADMIN_REVIEW'); assert.equal(s.reviews.size,1); assert.equal(s.messages.size,0);
  assert.equal([...s.reviews.values()][0].event.text,'Mensagem sintetica');
  assert.deepEqual([s.aiCalls,s.handoffs,s.attendanceCreates],[0,0,0]);
});
test('repeticao e ordem de chegada nao duplicam nem decidem revisao', () => {
  const s=state(), d=marker(), e=event();
  receive(s,e,d); receive(s,{...e,text:'duplicata'},d); receive(s,event('second',{sentAt:'1999-01-01'}),d);
  assert.equal(s.reviews.size,2); assert.equal([...s.reviews.values()][0].event.text,'Mensagem sintetica');
});
test('retomada autorizada libera somente o evento selecionado, sem IA e sem historico', () => {
  const s=state(),d=marker(),e=event(); receive(s,e,d); receive(s,event('second'),d);
  assert.equal(review(s,e,d,{admin,decision:'RESUME',expectedVersion:1}),'RESUMED');
  assert.equal(s.messages.size,1); assert.equal([...s.messages.values()][0].origin,'ADMIN_ACCEPTED_UNCERTAIN');
  assert.equal(s.reviews.get(JSON.stringify(['A','instance-A','second'])).state,'PENDING');
  assert.equal(classify(event('old'),d),'IGNORE_KNOWN_HISTORY');
  assert.equal(classify(event('third'),d),'ADMIN_REVIEW');
  assert.deepEqual([s.aiCalls,s.handoffs,s.attendanceCreates],[0,0,0]);
  assert.throws(()=>review(s,e,d,{admin,decision:'DISCARD',expectedVersion:1}),/CONFLICT/);
});
test('descarte elimina conteudo da revisao e repeticao nao o recria', () => {
  const s=state(),d=marker(),e=event(); receive(s,e,d);
  assert.equal(review(s,e,d,{admin,decision:'DISCARD',expectedVersion:1}),'DISCARDED');
  receive(s,e,d); const row=[...s.reviews.values()][0];
  assert.equal(row.event,null); assert.equal(row.state,'DISCARDED'); assert.equal(s.messages.size,0);
});
test('permissoes, escopo, aliases e evidencia cruzada', () => {
  const s=state(),d=marker(),e=event(); receive(s,e,d);
  assert.throws(()=>review(s,e,d,{admin:null,decision:'RESUME',expectedVersion:1}),/FORBIDDEN/);
  assert.throws(()=>review(s,e,d,{admin:{...admin,companyId:'B'},decision:'RESUME',expectedVersion:1}),/FORBIDDEN/);
  assert.throws(()=>review(s,e,d,{admin:{...admin,role:'ATTENDANT'},decision:'RESUME',expectedVersion:1}),/FORBIDDEN/);
  assert.equal(classify(event('old',{companyId:'B'}),d),'NORMAL_FLOW');
  assert.equal(classify(event('old',{instanceName:'instance-B'}),d),'NORMAL_FLOW');
  assert.equal(classify(event('old',{remoteJid:'contact@lid'}),d),'IGNORE_KNOWN_HISTORY');
  assert.equal(classify(e,d,{authenticatedSendReceipt:{...evidence(e),companyId:'B'}}),'ADMIN_REVIEW');
});
test('LID sem identidade comprovada permanece visivel sem associacao por palpite', () => {
  const s=state(),d=marker(),e=event('unresolved',{remoteJid:'unresolved@lid'});
  assert.equal(classify(e,{...d,state:'PREVIEW'},{unresolvedIdentity:evidence(e)}),'NORMAL_FLOW');
  assert.equal(receive(s,e,d,{unresolvedIdentity:evidence(e)}),'ADMIN_REVIEW');
  assert.equal([...s.reviews.values()][0].deletionId,null); assert.equal(s.messages.size,0);
  assert.throws(()=>review(s,e,d,{admin,decision:'RESUME',expectedVersion:1}),/STALE_DELETION/);
  assert.equal(review(s,e,d,{admin,decision:'DISCARD',expectedVersion:1}),'DISCARDED');
});
test('nova exclusao invalida revisao anterior e exclusao incompleta impede retomada', () => {
  const s=state(),d=marker(),e=event(); receive(s,e,d);
  assert.throws(()=>review(s,e,{...d,id:'deletion-2'},{admin,decision:'RESUME',expectedVersion:1}),/STALE_DELETION/);
  assert.throws(()=>review(s,e,{...d,state:'FAILED'},{admin,decision:'RESUME',expectedVersion:1}),/DELETION_NOT_COMPLETE/);
});
test('manifesto preserva mensagem concorrente, outro escopo e registros vinculados', () => {
  const target={...marker(),customerId:'customer-A'};
  const records={messages:[event('old'),event('after-preview'),event('old',{companyId:'B'}),event('old',{instanceName:'instance-B'})],customers:[{id:'customer-A'}],attendances:[],reminders:[{customerId:'customer-A'}],receipts:[{customerId:'customer-A',mediaUrl:'synthetic-file'}]};
  const before=structuredClone(records);
  assert.deepEqual(planDeletion(records,target,['old']),['old']); assert.deepEqual(records,before);
  records.attendances.push({companyId:'A',customerId:'customer-A',state:'HUMANO',finishedAt:null});
  assert.throws(()=>planDeletion(records,target,['old']),/FINISH_HUMAN/);
});
test('contato com vinculos impede exclusao sem cascata; contato livre elegivel', () => {
  const empty={messages:0,attendances:0,reminders:0,receipts:0};
  assert.equal(canDeleteContact(empty),true);
  for(const name of Object.keys(empty)) assert.equal(canDeleteContact({...empty,[name]:1}),false);
});
console.log(JSON.stringify({operation:'DELETION_FEASIBILITY',environment:'PROTOTIPO PURO EM MEMORIA; sem API, PostgreSQL, autenticacao ou navegador reais; SQL nao executado',passed:passed.length,scenarios:passed},null,2));

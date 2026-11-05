// Targeted synthetic checks only: no provider, application server or production DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function compile(path,imports={}){
 const source=fs.readFileSync(new URL('../../src/'+path,import.meta.url),'utf8');
 const result=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,path);
 const m={exports:{}};new Function('require','module','exports',result.outputText)(name=>name in imports?imports[name]:require(name),m,m.exports);return m.exports;
}
const {continuationEventAllowed:allowed,createConversationDeletionRepository:create}=compile('services/conversation-deletion.repository.ts');
const scope={companyId:'synthetic-A',instanceName:'instance-A',remoteJid:'deleted@s.whatsapp.net'};
const cutoff='2026-11-05T11:20:00.000Z',receivedAt=new Date('2026-11-05T11:22:00.000Z');
const payload={sentAt:'2026-11-05T11:21:00.000Z',fromMe:false,text:'SYNTHETIC'};
assert.equal(allowed(cutoff,payload,receivedAt),true);
for(const value of [{...payload,sentAt:cutoff},{...payload,sentAt:'2026-06-01T00:00:00Z'},{...payload,sentAt:'invalid'},{...payload,sentAt:'2026-11-06T00:00:00Z'},{...payload,fromMe:true},{}])assert.equal(allowed(cutoff,value,receivedAt),false);
let state='RESUMED',checkpoint=cutoff,known=false,stored=null,insertions=0;
const db={transaction:async work=>work({query:async(sql,v)=>{
 if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
 if(sql.includes('SELECT * FROM m1m_conversation_deletions'))return {rows:v[0]===scope.companyId&&v[1]===scope.instanceName&&v[2]===scope.remoteJid?[{id:'d1',state,aliases:[scope.remoteJid]}]:[]};
 if(sql.includes('SELECT 1 FROM m1m_conversation_deletion_message_keys'))return {rows:known?[{}]:[]};
 if(sql.includes('AS cutoff'))return {rows:checkpoint?[{cutoff:checkpoint}]:[]};
 if(sql.includes('SELECT "sentAt","fromMe"'))return {rows:stored?[stored]:[]};
 if(sql.includes('INSERT INTO m1m_conversation_deletion_reviews')){insertions++;return {rows:[{id:'r1',state:'PENDING',version:1}]};}
 throw Error('Unexpected query '+sql);
}})};
const repo=create(db),receipt={eventId:'new',receivedAt};
assert.equal((await repo.ingestUncertain(scope,'new',payload,receipt)).action,'NORMAL_FLOW');assert.equal(insertions,0);
assert.equal((await repo.ingestUncertain(scope,'new',payload)).action,'ADMIN_REVIEW');
assert.equal((await repo.ingestUncertain(scope,'new',payload,{eventId:'other',receivedAt})).action,'ADMIN_REVIEW');
assert.equal((await repo.ingestUncertain(scope,'new',{...payload,sentAt:'2026-06-01T00:00:00Z'},receipt)).action,'ADMIN_REVIEW');
known=true;assert.equal((await repo.ingestUncertain(scope,'new',payload,receipt)).action,'IGNORE_KNOWN_HISTORY');known=false;
state='DELETED';assert.equal((await repo.ingestUncertain(scope,'new',payload,receipt)).action,'ADMIN_REVIEW');state='RESUMED';
checkpoint=null;assert.equal((await repo.ingestUncertain(scope,'new',payload,receipt)).action,'ADMIN_REVIEW');checkpoint=cutoff;
for(const other of [{...scope,remoteJid:'nondeleted@s.whatsapp.net'},{...scope,companyId:'synthetic-B'},{...scope,instanceName:'instance-B'}])assert.equal((await repo.ingestUncertain(other,'new',payload,receipt)).action,'NORMAL_FLOW');
stored={sentAt:payload.sentAt,fromMe:false};assert.equal((await repo.ingestUncertain(scope,'new',payload)).action,'NORMAL_FLOW');stored=null;
// The explicit checkpoint request must reach the importer; decided payload stays NULL
// as required by the existing schema CHECK.
let imported,updated;
const decisionRepo=create({transaction:async work=>work({query:async(sql,v)=>{
 if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
 if(sql.includes('SELECT * FROM m1m_conversation_deletion_reviews'))return {rows:[{id:'r1',state:'PENDING',version:1,reason:'UNCERTAIN_ORIGIN',deletionId:'d1',evolutionMessageId:'selected',remoteJid:scope.remoteJid,normalizedPayload:payload}]};
 if(sql.includes('SELECT id,state FROM m1m_conversation_deletions'))return {rows:[{id:'d1',state:'DELETED'}]};
 if(sql.includes('SELECT 1 FROM m1m_conversation_deletion_message_keys'))return {rows:[]};
 if(sql.startsWith('UPDATE m1m_conversation_deletions'))return {rows:[]};
 if(sql.startsWith('UPDATE m1m_conversation_deletion_reviews')){updated=sql;return {rows:[]};}
 throw Error('Unexpected decision query '+sql);
}})});
await decisionRepo.decide(scope,'r1',1,'RESUME',{kind:'COMPANY_USER',id:'synthetic-admin'},async(_db,event)=>{imported=event;},undefined,true);
assert.equal(imported.continuationRequested,true);assert.equal(imported.continuationDeletionId,'d1');assert.equal(imported.reviewId,'r1');assert.ok(updated.includes('"normalizedPayload"=NULL'));
await assert.rejects(()=>decisionRepo.decide(scope,'r1',1,'DISCARD',{kind:'COMPANY_USER',id:'synthetic-admin'},undefined,undefined,true),/INVALID_DECISION/);
// Native timestamp/fromMe validation and AsyncLocalStorage propagation use real service code.
let captured;
const client={query:async()=>({rows:[{locked:true}]}),release(){}};
let snapshotReads=0;
const prisma={m1MCompany:{findUnique:async()=>({whatsappInstanceName:scope.instanceName})},m1MCustomer:{findFirst:async()=>null},$queryRaw:async(parts)=>{
 const sql=parts.join('');snapshotReads++;if(sql.includes('WITH latest AS MATERIALIZED'))return [{remoteJid:scope.remoteJid,state:'DELETED',aliases:[scope.remoteJid],lastMessage:null}];if(sql.includes('to_regclass'))return [{operations:'d',reviews:'r',keys:'k'}];if(sql.includes('EXISTS'))return [{needed:true}];return [];
}};
const service=compile('services/conversation-deletion.service.ts',{
 '@/lib/prisma':{prisma},'./conversation-deletion-policy':{configuredDeletionScope:()=>false},
 './conversation-deletion.repository':{createConversationDeletionRepository:()=>({ingestUncertain:async(...args)=>{captured=args[3];return {action:'NORMAL_FLOW'};}}),ConversationDeletionError:class extends Error{}},
 pg:{Pool:class{async connect(){return client;}}}
});
const beforeSnapshot=snapshotReads;
const snapshot=await service.deletionListSnapshot(scope.companyId,scope.instanceName);
assert.equal(snapshotReads-beforeSnapshot,2,'snapshot needs only storage check and scoped markers');
assert.equal(snapshot[0].state,'DELETED');assert.equal(snapshot[0].lastMessage,null);
const sec=Date.parse(payload.sentAt)/1000;
for(const [raw,expected] of [[{key:{fromMe:false},messageTimestamp:sec},true],[{key:{fromMe:false}},false],[{key:{},messageTimestamp:sec},false],[{key:{fromMe:true},messageTimestamp:sec},false]]){
 captured=undefined;
 await service.withDeletionConversation(scope,()=>service.interceptDeletedEvent(scope,{evolutionMessageId:'new',fromMe:false,sentAt:new Date(payload.sentAt),rawPayload:raw}),receipt);
 assert.equal(!!captured,expected);
}
// Exercise the actual importer, including the durable audit and its default-off policy.
for(const [enabled,alreadyStored] of [[false,false],[true,false],[true,true]]){
 let audit, message;
 await service.importReviewedMessage({query:async(sql,values)=>{
  if(sql.startsWith('SELECT id FROM m1m_customers'))return {rows:[{id:'customer-A'}]};
  if(sql.startsWith('SELECT "customerId" FROM m1m_messages'))return {rows:alreadyStored?[{customerId:'customer-A'}]:[]};
  if(sql.startsWith('SELECT id,state FROM m1m_attendances'))return {rows:[{id:'attendance-A',state:'IA'}]};
  if(sql.includes('INSERT INTO m1m_attendance_events')){audit={sql,values};return {rows:[]};}
  if(sql.includes('INSERT INTO m1m_messages')){message=values;return {rows:[]};}
  throw Error('Unexpected importer query '+sql);
 }},scope,{...payload,evolutionMessageId:'selected',continuationRequested:enabled,continuationDeletionId:'d1',reviewId:'r1'},{kind:'COMPANY_USER',id:'admin-A'});
 assert.equal(audit.values[5],enabled);
 assert.equal(audit.values[6],'d1');assert.equal(audit.values[7],'r1');
 assert.equal(JSON.parse(audit.values[4]).instanceName,scope.instanceName);
 assert.equal(JSON.parse(audit.values[4]).reviewerId,'admin-A');
 assert.ok(audit.sql.includes('CURRENT_TIMESTAMP'));
 assert.equal(message[1],scope.companyId);assert.equal(message[4],scope.instanceName);
 assert.equal(message[5],'selected');assert.equal(message[6],scope.remoteJid);
}
console.log('PASS: deleted contact continuity only after explicit checkpoint + authenticated dated receipt; known/old/ambiguous events protected; nondeleted contact unchanged; scope isolation; selected resume audited and schema payload CHECK preserved; native date fallback rejected; real importer audit parameters and default-off policy checked. Synthetic repository/service dependencies, no real DB/provider/UI.');

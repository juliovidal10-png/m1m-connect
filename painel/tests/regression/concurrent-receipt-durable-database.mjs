// SQL e repositorio reais em banco embarcado; nao substitui PostgreSQL servidor/API/reinicio real.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {createHash,randomUUID} from 'node:crypto';import ts from 'typescript';
const require=createRequire(import.meta.url),{PGlite}=require('@electric-sql/pglite');
const report={operation:'CONCURRENT_RECEIPT_DATABASE',status:'STARTED',postgresServerReal:false,postgresEmbedded:true,checks:[],sqlHashes:{}};
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const original=read('../../../docs/proposals/exclusoes-conversas.sql'),extension=read('../../../docs/proposals/recebimento-concorrente-revisao-proposta.sql'),rollback=read('../../../docs/proposals/recebimento-concorrente-revisao-rollback.sql');
for(const [name,sql] of Object.entries({original,extension,rollback}))report.sqlHashes[name]=createHash('sha256').update(sql).digest('hex');
assert.equal(report.sqlHashes.extension,'a93790c9c4481a1c1b3eb52f303c7e4c1e830baa3a745f046c647866cd7b476e');
const module={exports:{}};vm.runInNewContext(ts.transpileModule(read('../../src/services/conversation-deletion.repository.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require});
const engine=new PGlite(),wrap=c=>({query:async(s,p)=>{const r=await c.query(s,p);return {rows:r.rows,rowCount:r.affectedRows??null};}}),db={...wrap(engine),transaction:fn=>engine.transaction(tx=>fn(wrap(tx)))};
const pass=x=>report.checks.push(x);
try{
 await engine.exec(read('../fixtures/conversation-deletion-baseline.sql'));await engine.exec(original);
 const catalog=async()=>JSON.stringify((await engine.query("SELECT conname,pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='m1m_conversation_deletion_reviews'::regclass ORDER BY conname")).rows);
 const before=JSON.parse(await catalog());await engine.exec(extension);const after=JSON.parse(await catalog());
 const untouched=before.filter(c=>!c.def.includes('UNRESOLVED_IDENTITY'));for(const c of untouched)assert.ok(after.some(n=>n.conname===c.conname&&n.def===c.def));pass('Ampliacao dos dois CHECKs; demais constraints preservadas');
 await engine.exec(rollback);await engine.exec(extension);pass('Rollback permitido sem registros novos; reaplicacao dos dois CHECKs');
 for(const company of ['A','B'])await db.query('INSERT INTO m1m_companies(id,name,slug,"updatedAt") VALUES($1,$1,$1,now())',[company]);
 const scope={companyId:'A',instanceName:'instance-A',remoteJid:'551100000001@s.whatsapp.net'},actor={kind:'COMPANY_USER',id:'synthetic-admin'};
 const repo=module.exports.createConversationDeletionRepository(db),payload={text:'EVENTO_INCERTO',type:'TEXT',fromMe:false,apikey:'MUST_NOT_PERSIST',rawPayload:{secret:'MUST_NOT_PERSIST'}};
 const first=await repo.ingestConcurrent(scope,'event-one',payload);assert.equal(first.action,'ADMIN_REVIEW_CONCURRENT');
 const persisted=(await db.query('SELECT * FROM m1m_conversation_deletion_reviews WHERE id=$1',[first.review.id])).rows[0];assert.equal(persisted.reason,'CONCURRENT_RECEIPT');assert.equal(persisted.deletionId,null);assert.equal(persisted.normalizedPayload.apikey,undefined);assert.equal(persisted.normalizedPayload.rawPayload,undefined);
 assert.equal((await repo.ingestConcurrent(scope,'event-one',{text:'NOT_OVERWRITE'})).review.id,first.review.id);pass('Custodia duravel com motivo proprio, whitelist e deduplicacao');
 await assert.rejects(engine.exec(rollback),/ROLLBACK_BLOCKED/);await engine.exec('ROLLBACK');assert.equal((await db.query('SELECT count(*) n FROM m1m_conversation_deletion_reviews')).rows[0].n,1);pass('Rollback bloqueado com registro do novo motivo; pendencia preservada');
 for(const [reason,id] of [['INVALID_REASON','bad-reason'],['UNCERTAIN_ORIGIN','bad-link']])await assert.rejects(db.query('INSERT INTO m1m_conversation_deletion_reviews(id,"companyId","instanceName","remoteJid","evolutionMessageId",reason,"normalizedPayload") VALUES($1,\'A\',\'instance-A\',\'jid\',$1,$2,\'{}\')',[id,reason]),/check constraint/);pass('CHECKs continuam rejeitando motivo invalido e vinculo obrigatorio ausente');
 for(const other of [{...scope,companyId:'B'},{...scope,instanceName:'instance-B'}])await repo.ingestConcurrent(other,'event-one',payload);assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_conversation_deletion_reviews WHERE "evolutionMessageId"=\'event-one\'')).rows[0].n),3);pass('Mesmo ID isolado entre empresas e instancias');
 const imported=[];await repo.decide(scope,first.review.id,1,'RESUME',actor,async(_db,event)=>imported.push(event));assert.equal(imported.length,1);assert.equal(imported[0].origin,'ADMIN_ACCEPTED_UNCERTAIN');assert.equal((await repo.ingestConcurrent(scope,'event-one',payload)).action,'ALREADY_REVIEWED');pass('Retomada sem exclusao confirmada importa somente selecionado, sem alegar novidade');
 const discard=await repo.ingestConcurrent(scope,'event-discard',payload);await repo.decide(scope,discard.review.id,1,'DISCARD',actor);assert.equal((await repo.ingestConcurrent(scope,'event-discard',payload)).action,'IGNORE_DISCARDED_EVENT');pass('Repeticao apos descarte nao recria pendencia');
 await db.query('INSERT INTO m1m_customers(id,"companyId","remoteJid","updatedAt") VALUES(\'c-A\',\'A\',$1,now())',[scope.remoteJid]);
 await db.query('INSERT INTO m1m_messages(id,"companyId","instanceName","customerId","evolutionMessageId","remoteJid",direction,type,"fromMe","sentAt","updatedAt") VALUES(\'old\',\'A\',\'instance-A\',\'c-A\',\'old\',$1,\'IN\',\'TEXT\',false,now(),now())',[scope.remoteJid]);
 const op=await repo.prepare({...scope,aliases:[scope.remoteJid],actor,requestKey:randomUUID()});const old=await repo.ingestConcurrent(scope,'old',payload);await repo.confirm(scope,op.id,1);await assert.rejects(repo.decide(scope,old.review.id,1,'RESUME',actor,async()=>{throw Error('MUST_NOT_IMPORT');}),/KNOWN_DELETED_HISTORY/);assert.equal((await db.query('SELECT count(*) n FROM m1m_messages WHERE id=\'old\'')).rows[0].n,0);pass('Evento capturado durante previa nao restaura historico depois de exclusao confirmada');
 report.status='PASSED';
}catch(e){report.status='FAILED';report.error=String(e.stack||e);process.exitCode=1;}finally{await engine.close();report.temporaryDatabaseClosed=true;console.log(JSON.stringify(report,null,2));}

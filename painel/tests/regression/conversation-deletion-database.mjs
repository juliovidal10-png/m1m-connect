// Repositorio TS real e SQL proposto real. Sem API/autenticacao/navegador/WhatsApp.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../../src/services/conversation-deletion.repository.ts',import.meta.url),'utf8');
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require,console});
const {createConversationDeletionRepository}=module.exports;
const sql=fs.readFileSync(new URL('../../../docs/proposals/exclusoes-conversas.sql',import.meta.url),'utf8');
const baseline=fs.readFileSync(process.env.M1M_DELETION_BASELINE_SQL||new URL('../fixtures/conversation-deletion-baseline.sql',import.meta.url),'utf8');
const report={operation:'CONVERSATION_DELETION_DATABASE',status:'STARTED',sqlSha256:createHash('sha256').update(sql).digest('hex'),repositorySha256:createHash('sha256').update(source).digest('hex'),postgresServerReal:false,postgresEmbedded:false,authenticationReal:false,browserReal:false,whatsappAccess:false,checks:[]};
const testUrl=process.env.M1M_DELETION_PG_TEST_URL;
let engine,pool,db;
const pass=name=>report.checks.push(name);
try {
 if(testUrl){
  const u=new URL(testUrl);
  assert.equal(process.env.M1M_DELETION_ISOLATED,'1');
  assert.equal(u.hostname,'127.0.0.1'); assert.match(u.pathname,/^\/m1m_delete_[a-z0-9_]+$/);
  const {Pool}=require('pg'); pool=new Pool({connectionString:testUrl,max:4,connectionTimeoutMillis:5000});
  db={query:(s,p)=>pool.query(s,p),exec:s=>pool.query(s),transaction:async fn=>{
   const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='10000'");await c.query("SET LOCAL lock_timeout='2000'");const value=await fn(c);await c.query('COMMIT');return value}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  }};report.postgresServerReal=true;
 } else {
  const {PGlite}=require('@electric-sql/pglite'); engine=new PGlite();
  const wrap=c=>({query:async(s,p)=>{const r=await c.query(s,p);return {rows:r.rows,rowCount:r.affectedRows??null}}});
  db={...wrap(engine),exec:s=>engine.exec(s),transaction:fn=>engine.transaction(tx=>fn(wrap(tx)))};
  report.postgresEmbedded=true;report.limitation='PGlite/WASM: nao equivale a PostgreSQL 16 servidor nem valida sessoes concorrentes reais.';
 }
 report.databaseVersion=(await db.query('SELECT version() AS version')).rows[0].version;
 if(report.postgresServerReal){const version=Number((await db.query('SHOW server_version_num')).rows[0].server_version_num);assert.ok(version>=160000&&version<170000,'Exige PostgreSQL 16 servidor');}
 assert.equal(Number((await db.query("SELECT count(*) AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n),0,'Exige banco novo vazio');
 await db.exec(baseline); await db.exec(sql);pass('SQL exato aplicado somente em banco novo isolado; hash registrado');
 for(const id of ['synthetic-A','synthetic-B']) await db.query('INSERT INTO m1m_companies(id,name,slug,"updatedAt") VALUES($1,$1,$1,now())',[id]);
 for(const [id,companyId,jid] of [['customer-A','synthetic-A','contact@s.whatsapp.net'],['customer-B','synthetic-B','contact@s.whatsapp.net'],['group-A','synthetic-A','group@g.us']]) await db.query('INSERT INTO m1m_customers(id,"companyId","remoteJid","updatedAt") VALUES($1,$2,$3,now())',[id,companyId,jid]);
 const insert=async (q,{id,company='synthetic-A',instance='instance-A',customer='customer-A',jid='contact@s.whatsapp.net',text='Sintetica'})=>q.query(`INSERT INTO m1m_messages(id,"companyId","customerId","instanceName","evolutionMessageId","remoteJid",direction,type,"fromMe",content,"sentAt","updatedAt") VALUES($1,$2,$3,$4,$1,$5,'IN','TEXT',false,$6,now(),now())`,[id,company,customer,instance,jid,text]);
 for(const id of ['old-1','old-2']) await insert(db,{id});
 await insert(db,{id:'other-instance',instance:'instance-B'});
 await insert(db,{id:'other-company',company:'synthetic-B',instance:'instance-B',customer:'customer-B'});
 await db.query(`INSERT INTO m1m_attendances(id,"companyId","customerId",number,"updatedAt") VALUES('attendance-A','synthetic-A','customer-A',1,now())`);
 await db.query(`INSERT INTO m1m_reminders(id,"companyId","customerId",title,"remindAt","updatedAt") VALUES('reminder-A','synthetic-A','customer-A','Lembrete',now(),now())`);
 await db.query(`INSERT INTO m1m_payment_receipts(id,"companyId","customerId","messageId","mediaUrl","updatedAt") VALUES('receipt-A','synthetic-A','customer-A','old-1','/payment-receipts/synthetic-kept',now())`);
 const repo=createConversationDeletionRepository(db),scope={companyId:'synthetic-A',instanceName:'instance-A',remoteJid:'contact@s.whatsapp.net'},actor={kind:'COMPANY_USER',id:'synthetic-admin'};
 const prepare=()=>repo.prepare({...scope,aliases:[scope.remoteJid],actor,requestKey:randomUUID()});
 const cancelled=await prepare();await repo.cancel(scope,cancelled.id,1);assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_messages')).rows[0].n),4);pass('Cancelamento persiste sem excluir mensagens');
 let op=await prepare();assert.equal(op.messageCount,2);
 await insert(db,{id:'after-preview'});
 await assert.rejects(repo.confirm(scope,op.id,1),/NEW_MESSAGES_AFTER_PREVIEW/);
 assert.equal((await db.query('SELECT 1 FROM m1m_messages WHERE id=$1',['after-preview'])).rows.length,1);
 await repo.cancel(scope,op.id,1);op=await prepare();
 const result=await repo.confirm(scope,op.id,1);assert.equal(result.deletedMessageCount,3);
 assert.equal((await repo.confirm(scope,op.id,1)).alreadyCompleted,true);pass('Exclusao persistente e idempotente; mensagem apos previa preservada');
 for(const table of ['m1m_attendances','m1m_reminders','m1m_payment_receipts']) assert.equal(Number((await db.query(`SELECT count(*) n FROM ${table}`)).rows[0].n),1);
 const receipt=(await db.query('SELECT "messageId","mediaUrl" FROM m1m_payment_receipts')).rows[0];assert.equal(receipt.messageId,null);assert.equal(receipt.mediaUrl,'/payment-receipts/synthetic-kept');pass('Contato, atendimento, agenda e financeiro preservados; FK de mensagem SetNull real');
 for(const id of ['other-instance','other-company']) assert.equal((await db.query('SELECT 1 FROM m1m_messages WHERE id=$1',[id])).rows.length,1);pass('Exclusao nao alcanca outra empresa ou instancia');
 assert.equal((await repo.ingestUncertain(scope,'old-1',{text:'historico'})).action,'IGNORE_KNOWN_HISTORY');pass('Historico conhecido nao volta ao banco nem a revisao');
 const payload={text:'Revisar',type:'TEXT',fromMe:false,apikey:'NEVER_STORE',rawPayload:{secret:'NEVER_STORE'}};
 const pending=await repo.ingestUncertain(scope,'uncertain-1',payload);assert.equal(pending.action,'ADMIN_REVIEW');
 const repeated=await repo.ingestUncertain(scope,'uncertain-1',{text:'nao sobrescrever'});assert.equal(repeated.review.id,pending.review.id);
 const stored=(await db.query('SELECT "normalizedPayload" FROM m1m_conversation_deletion_reviews WHERE id=$1',[pending.review.id])).rows[0].normalizedPayload;assert.equal(stored.text,'Revisar');assert.equal(stored.apikey,undefined);assert.equal(stored.rawPayload,undefined);pass('Evento incerto persistido e deduplicado, com whitelist e fora das mensagens normais');
 await assert.rejects(repo.decide({...scope,companyId:'synthetic-B'},pending.review.id,1,'DISCARD',actor),/NOT_FOUND/);pass('Revisao de outra empresa bloqueada no repositorio; nao e teste de autenticacao');
 const second=await repo.ingestUncertain(scope,'uncertain-2',{text:'Segundo'});
 await repo.decide(scope,pending.review.id,1,'RESUME',actor,async(q,e)=>insert(q,{id:e.evolutionMessageId,text:e.text}));
 assert.equal((await db.query('SELECT 1 FROM m1m_messages WHERE id=$1',['uncertain-1'])).rows.length,1);
 assert.equal((await db.query('SELECT state FROM m1m_conversation_deletion_reviews WHERE id=$1',[second.review.id])).rows[0].state,'PENDING');
 assert.equal((await repo.ingestUncertain(scope,'old-1',{text:'antiga'})).action,'IGNORE_KNOWN_HISTORY');pass('Retomada transacional importa somente o evento escolhido e nao restaura historico');
 await repo.decide(scope,second.review.id,1,'DISCARD',actor);
 assert.equal((await repo.ingestUncertain(scope,'uncertain-2',{text:'repetida'})).action,'IGNORE_DISCARDED_EVENT');
 assert.equal((await db.query('SELECT "normalizedPayload" FROM m1m_conversation_deletion_reviews WHERE id=$1',[second.review.id])).rows[0].normalizedPayload,null);pass('Descarte remove conteudo; repeticao nao recria pendencia');
 const rollback=await repo.ingestUncertain(scope,'rollback',{text:'Erro simulado'});
 await assert.rejects(repo.decide(scope,rollback.review.id,1,'RESUME',actor,async()=>{throw Error('IMPORT_FAILED')}),/IMPORT_FAILED/);
 assert.equal((await db.query('SELECT state FROM m1m_conversation_deletion_reviews WHERE id=$1',[rollback.review.id])).rows[0].state,'PENDING');pass('Falha no importador faz rollback e preserva pendencia');
 if(report.postgresServerReal){
  const racing=await repo.ingestUncertain(scope,'race',{text:'Concorrencia'});
  const decisions=await Promise.allSettled([repo.decide(scope,racing.review.id,1,'DISCARD',actor),repo.decide(scope,racing.review.id,1,'DISCARD',actor)]);
  assert.equal(decisions.filter(x=>x.status==='fulfilled').length,1);assert.equal(decisions.filter(x=>x.status==='rejected').length,1);pass('Duas sessoes PostgreSQL concorrentes: somente uma decisao vence');
 }
 const changed=await prepare();await db.query('UPDATE m1m_messages SET "updatedAt"="updatedAt"+interval \'1 second\' WHERE id=$1',['uncertain-1']);await assert.rejects(repo.confirm(scope,changed.id,1),/MESSAGE_CHANGED_AFTER_PREVIEW/);pass('Alteracao depois da previa bloqueia exclusao');
 await db.query(`INSERT INTO m1m_attendances(id,"companyId","customerId",number,state,"updatedAt") VALUES('human-group','synthetic-A','group-A',2,'HUMANO',now())`);
 await assert.rejects(repo.prepare({...scope,remoteJid:'group@g.us',aliases:['group@g.us'],actor,requestKey:randomUUID()}),/FINISH_HUMAN_ATTENDANCE_FIRST/);pass('Grupo com atendimento HUMANO sem responsavel bloqueia exclusao');
 report.status='PASSED';
} catch(e){report.status='FAILED';report.error=String(e.message||e);process.exitCode=1;} finally {
 if(pool)await pool.end();if(engine)await engine.close();
 console.log(JSON.stringify(report,null,2));
}

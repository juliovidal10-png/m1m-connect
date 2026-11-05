// PostgreSQL + real Prisma client + actual customerRepository.listByCompany.
// Dedicated empty CI database, synthetic data only; never connects to application/WhatsApp.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
import ts from 'typescript';
import {build} from 'esbuild';
const url=new URL(process.env.DATABASE_URL||'http://invalid');
assert.equal(process.env.M1M_CUSTOMER_INDEX_ISOLATED,'1');
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/m1m_customer_index_isolated');
assert.equal(url.username,'synthetic_customer');assert.equal(process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED,'false');
assert(!process.env.EVOLUTION_API_KEY&&!process.env.EVOLUTION_API_URL&&!process.env.OPENAI_API_KEY);
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
const bundle=path.resolve('.m1m-customer-index-'+process.pid+'.mjs');
const report={operation:'CUSTOMER_LATEST_MESSAGE_INDEX_ISOLATED',status:'STARTED',postgresReal:true,prismaReal:true,repositoryReal:true,browserUsed:false,productionAccess:false,measurements:[]};
let prisma,indexCreated=false,seeded=false;
const queries=[];
try{
 await db.connect();assert.equal((await db.query('SELECT count(*)::int AS n FROM m1m_companies')).rows[0].n,0,'Database must be empty');
 await build({entryPoints:['src/generated/prisma/client.ts'],bundle:true,packages:'external',format:'esm',platform:'node',outfile:bundle});
 const {PrismaClient}=await import(pathToFileURL(bundle).href);
 prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL}),log:[{emit:'event',level:'query'}]});
 prisma.$on('query',e=>queries.push(e));
 const module={exports:{}};
 const source=await fs.readFile('src/repositories/customer.repository.ts','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>{assert.equal(n,'@/lib/prisma');return{prisma}},console,Date});
 const repository=module.exports.customerRepository;assert(repository?.listByCompany);
 await db.query(`INSERT INTO m1m_companies(id,name,slug,"updatedAt") VALUES('empresa-teste','Marketing1Minuto','synthetic-customer-a',now()),('synthetic-company-b','Synthetic B','synthetic-customer-b',now())`);seeded=true;
 await db.query(`INSERT INTO m1m_customers(id,"companyId","remoteJid",name,status,"updatedAt") SELECT 'synthetic-customer-a-'||g,'empresa-teste','fixture-'||g||'@s.whatsapp.net','Fixture '||g,'IA',timestamp '2026-01-01' FROM generate_series(1,290) g`);
 await db.query(`INSERT INTO m1m_customers(id,"companyId","remoteJid",name,status,"updatedAt") VALUES('synthetic-customer-b','synthetic-company-b','fixture-b@s.whatsapp.net','Other fixture','IA',timestamp '2026-01-01')`);
 await db.query(`INSERT INTO m1m_messages(id,"companyId","customerId","instanceName","evolutionMessageId","remoteJid",direction,type,"fromMe",content,"rawPayload","sentAt","updatedAt") SELECT 'synthetic-a-message-'||c||'-'||m,'empresa-teste','synthetic-customer-a-'||c,'M1MTesteIA','fixture-a-'||c||'-'||m,'fixture-'||c||'@s.whatsapp.net','IN','TEXT',false,'Synthetic message '||m,'{}'::jsonb,timestamp '2020-01-01'+((c*20+m)||' seconds')::interval,timestamp '2026-01-01' FROM generate_series(1,290) c CROSS JOIN generate_series(1,10) m`);
 await db.query(`INSERT INTO m1m_messages(id,"companyId","customerId","instanceName","evolutionMessageId","remoteJid",direction,type,"fromMe",content,"rawPayload","sentAt","updatedAt") SELECT 'synthetic-b-message-'||g,'synthetic-company-b','synthetic-customer-b','SyntheticB','fixture-b-'||g,'fixture-b@s.whatsapp.net','IN','TEXT',false,'Synthetic other message','{}'::jsonb,timestamp '2021-01-01'+(g||' seconds')::interval,timestamp '2026-01-01' FROM generate_series(1,90000) g`);
 await db.query('ANALYZE m1m_customers');await db.query('ANALYZE m1m_messages');
 let reference;
 async function measure(phase){
  for(let run=1;run<=3;run++){
   queries.length=0;const start=performance.now();const rows=await repository.listByCompany('empresa-teste');const totalMs=performance.now()-start;
   assert.equal(rows.length,290);assert(rows.every(r=>r.companyId==='empresa-teste'));
   const snapshot=JSON.stringify(rows);reference??=snapshot;assert.equal(snapshot,reference,'Index must preserve complete actual repository output');
   report.measurements.push({phase,run,repositoryMs:Math.round(totalMs*100)/100,queryCount:queries.length,queries:queries.map(q=>({durationMs:q.duration,shapeHash:createHash('sha256').update(q.query).digest('hex'),select:q.query.trim().startsWith('SELECT')}))});
  }
 }
 await measure('BEFORE');
 const sql=await fs.readFile('../tools/performance/candidate-latest-message-index.sql','utf8');await db.query(sql);indexCreated=true;
 await measure('AFTER');
 const flag=(await db.query(`SELECT i.indisvalid,i.indisready FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='m1m_messages_customerId_sentAt_idx'`)).rows;
 assert.equal(flag.length,1);assert(flag[0].indisvalid&&flag[0].indisready);
 const b=await repository.listByCompany('synthetic-company-b');assert.equal(b.length,1);assert.equal(b[0].companyId,'synthetic-company-b');
 assert.equal((await repository.listByCompany('empresa-teste',{search:'fixture 290'})).length,1);
 assert.equal((await repository.listByCompany('empresa-teste',{status:'HUMANO'})).length,0);
 assert.equal((await repository.listByCompany('empresa-teste',{responsibleId:'nonexistent-synthetic-user'})).length,0);
 const count=(await db.query('SELECT count(*)::int AS n FROM m1m_messages')).rows[0].n;assert.equal(count,92900);
 await db.query(await fs.readFile('../tools/performance/candidate-latest-message-index-rollback.sql','utf8'));indexCreated=false;
 await measure('ROLLED_BACK');
 report.queryShapes=queries.map(q=>({shapeHash:createHash('sha256').update(q.query).digest('hex'),sql:q.query,parameterCount:JSON.parse(q.params).length}));
 report.status='PASSED';
 report.limits=['Three sequential samples per phase on synthetic fixture (290 customers/2900 messages A; 1 customer/90000 messages B), no cold-cache guarantee.','Actual repository and Prisma SQL executed, query duration/shape hash only; no production SQL capture or browser/HTTP timing.','Candidate index addition/removal applied only in this fresh isolated database; no production migration.','No required speedup threshold: report observed behavior without changing planner settings or discarding records. Production metadata and actual HTTP validation remain required.'];
}catch(e){report.status='FAILED';report.failure=String(e?.message||e).slice(0,1500);process.exitCode=1}
finally{
 if(prisma)await prisma.$disconnect().catch(()=>{});
 if(indexCreated)await db.query('DROP INDEX CONCURRENTLY "m1m_messages_customerId_sentAt_idx"').catch(()=>{});
 if(seeded){try{await db.query(`DELETE FROM m1m_messages WHERE "companyId" IN ('empresa-teste','synthetic-company-b')`);await db.query(`DELETE FROM m1m_customers WHERE "companyId" IN ('empresa-teste','synthetic-company-b')`);await db.query(`DELETE FROM m1m_companies WHERE id IN ('empresa-teste','synthetic-company-b')`);report.syntheticRowsRemoved=true}catch{report.syntheticRowsRemoved=false;process.exitCode=1}}
 await db.end().catch(()=>{});await fs.rm(bundle,{force:true});
 console.log(JSON.stringify(report,null,2));
}

// PostgreSQL, aplicação Next, autenticação e Chromium reais. Sem OpenAI/WhatsApp.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import {chromium} from 'playwright';

const url=new URL(process.env.DATABASE_URL||'http://invalid');
assert.equal(process.env.M1M_AGENT_ISOLATED_TEST,'1','Exige ambiente explicitamente isolado');
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/m1m_agent_isolated');
assert.equal(process.env.M1M_TF3A_UNREAD_LEDGER_ENABLED,'false');
assert.ok(!process.env.OPENAI_API_KEY&&!process.env.EVOLUTION_API_KEY&&!process.env.EVOLUTION_API_URL,'Sem conexoes externas');
const base='http://127.0.0.1:4173',prefix='agent-e2e-'+randomUUID();
const report={operation:'AGENT_INSTRUCTIONS_REAL_PG_BROWSER',status:'STARTED',postgresReal:true,browserReal:true,authenticationReal:true,openAIReal:false,whatsappAccess:false,checks:[]};
const output=process.env.M1M_AGENT_REPORT_DIR;
assert.ok(output,'Exige pasta de relatorio do runner');fs.mkdirSync(output,{recursive:true});
const db=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
let app,browser,seeded=false;
const pass=(name)=>{report.checks.push(name);console.log('PASS: '+name)};
async function scalar(sql,args=[]){return(await db.query(sql,args)).rows[0]}
const password='Synthetic-'+randomUUID(),ids={A:process.env.M1M_CONFIG_ADMIN_TEST==='1'?'empresa-teste':prefix+'-A',B:prefix+'-B'};
const email=(who)=>who.toLowerCase()+'-'+prefix+'@example.invalid';
async function login(who){
 const context=await browser.newContext();
 await context.route('**/*',route=>{const requestUrl=route.request().url();return requestUrl.startsWith(base+'/')?route.continue():route.abort()});
 const page=await context.newPage();page.setDefaultTimeout(60000);
 await page.goto(base+'/login');await page.locator('input[type=email]').fill(email(who));await page.locator('input[type=password]').fill(password);
 const responsePromise=page.waitForResponse(r=>r.url()===base+'/api/auth/login'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Entrar no M1M Connect',exact:true}).click();
 assert.equal((await responsePromise).status(),200);
 await page.waitForURL(u=>u.pathname==='/'||u.pathname==='/onboarding');
 const me=await context.request.get(base+'/api/auth/me');assert.equal(me.status(),200);
 const user=(await me.json()).user;assert.ok(user,'Usuario autenticado real');
 const legal=await context.request.get(base+'/api/legal-acceptance');assert.equal(legal.status(),200);
 if((await legal.json()).required){
  await page.goto(base+'/aceite');await page.getByRole('checkbox').check();
  const accepted=page.waitForResponse(r=>r.url()===base+'/api/legal-acceptance'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Li e aceito',exact:true}).click();assert.equal((await accepted).status(),200);
  await page.waitForURL(u=>u.pathname==='/');
 }
 await page.goto(base+'/configuracoes');await page.getByRole('button',{name:/Agente de IA/}).click();
 return{context,page};
}
async function save(page,value){
 const field=page.getByLabel('Instrução do agente',{exact:true});await field.waitFor();await field.fill(value);
 const pending=page.waitForResponse(r=>r.url()===base+'/api/agent-instructions'&&r.request().method()==='PUT');
 await page.getByRole('button',{name:'Salvar instrução',exact:true}).click();assert.equal((await pending).status(),200);
 await page.getByRole('status').filter({hasText:'Instrução salva'}).waitFor();
 assert.equal(await field.inputValue(),value);return field;
}
try{
 await db.connect();assert.equal((await scalar('SELECT current_database() AS name')).name,'m1m_agent_isolated');
 assert.equal(Number((await scalar('SELECT count(*) AS n FROM m1m_companies')).n),0,'Banco deve estar vazio');
 const column=await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='m1m_companies' AND column_name='agentInstructions'");
 assert.equal(column.rowCount,0,'Baseline deve anteceder a nova migration');
 await db.query(fs.readFileSync(new URL('../../prisma/migrations/20261029020000_agent_instructions/migration.sql',import.meta.url),'utf8'));
 pass('Migration aditiva executada em banco novo isolado');
 seeded=true;
 for(const companyId of Object.values(ids))await db.query('INSERT INTO m1m_companies(id,name,slug,"updatedAt","onboardingCompleted","subscriptionStatus","aiEnabled") VALUES($1,$2,$1,now(),true,\'ACTIVE\',false)',[companyId,companyId==='empresa-teste'?'Marketing1Minuto':'Empresa sintetica '+companyId.slice(-1)]);
 const hash=await bcrypt.hash(password,12);
 for(const who of ['A','B','ATTENDANT'])await db.query('INSERT INTO m1m_users(id,"companyId",name,email,"passwordHash",role,"updatedAt") VALUES($1,$2,$3,$4,$5,$6,now())',[prefix+'-'+who,ids[who==='B'?'B':'A'],'Usuario sintetico '+who,email(who),hash,who==='ATTENDANT'?'ATTENDANT':'ADMIN']);
 await db.query('INSERT INTO m1m_company_profiles(id,"companyId","productsServices","updatedAt") VALUES($1,$2,$3,now())',[prefix+'-profile',ids.A,'CONHECIMENTO_SINTETICO_PRESERVADO']);
 const log=fs.openSync(path.join(output,'server.log'),'w');
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4173'],{detached:true,stdio:['ignore',log,log],env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'}});fs.closeSync(log);
 for(let i=0;i<150;i++){
  if(app.exitCode!==null)throw Error('APLICACAO_ENCERROU');
  try{const r=await fetch(base+'/login',{signal:AbortSignal.timeout(3000)});if(r.status===200)break}catch{}
  if(i===149)throw Error('APLICACAO_NAO_PRONTA');await new Promise(r=>setTimeout(r,1000));
 }
 browser=await chromium.launch({headless:true});
 const a=await login('A');pass('Login na tela com senha, cookie e sessao reais da empresa A');
 await save(a.page,'INSTRUCAO_A_V1: responda com concisao.');
 assert.equal((await scalar('SELECT "agentInstructions" FROM m1m_companies WHERE id=$1',[ids.A])).agentInstructions,'INSTRUCAO_A_V1: responda com concisao.');
 await a.page.reload();await a.page.getByRole('button',{name:/Agente de IA/}).click();
 await a.page.waitForFunction(()=>document.querySelector('#agent-instructions')?.value==='INSTRUCAO_A_V1: responda com concisao.');
 assert.equal(await a.page.getByLabel('Instrução do agente',{exact:true}).inputValue(),'INSTRUCAO_A_V1: responda com concisao.');
 pass('Salvar pela interface, conferir no PostgreSQL e persistir apos recarregar pagina');
 await save(a.page,'INSTRUCAO_A_V2: pergunte somente o necessario.');
 const reloadRead=await a.context.request.get(base+'/api/agent-instructions');assert.equal((await reloadRead.json()).agentInstructions,'INSTRUCAO_A_V2: pergunte somente o necessario.');pass('Atualizacao subsequente lida pela API real');
 const b=await login('B');assert.equal(await b.page.getByLabel('Instrução do agente',{exact:true}).inputValue(),'');
 await save(b.page,'INSTRUCAO_B: atendimento sintetico B.');
 assert.equal((await(await a.context.request.get(base+'/api/agent-instructions')).json()).agentInstructions,'INSTRUCAO_A_V2: pergunte somente o necessario.');
 const attack=await a.context.request.put(base+'/api/agent-instructions',{data:{companyId:ids.B,agentInstructions:'NAO_PODE'}});assert.equal(attack.status(),400);
 assert.equal((await(await b.context.request.get(base+'/api/agent-instructions')).json()).agentInstructions,'INSTRUCAO_B: atendimento sintetico B.');pass('Duas empresas com sessoes independentes; escrita A nao altera B; body com outra empresa recusado');
 const denied=await login('ATTENDANT');
 assert.equal((await denied.context.request.get(base+'/api/agent-instructions')).status(),403);
 assert.equal((await denied.context.request.put(base+'/api/agent-instructions',{data:{agentInstructions:'BLOQUEADO'}})).status(),403);
 await denied.page.getByRole('alert').filter({hasText:'Não foi possível carregar'}).waitFor();assert.ok(await denied.page.getByLabel('Instrução do agente',{exact:true}).isDisabled());pass('Atendente autenticado recusado na API e campo desabilitado');
 const anon=await browser.newContext();const unauth=await anon.request.put(base+'/api/agent-instructions',{data:{agentInstructions:'SEM_SESSAO'}});assert.notEqual(unauth.status(),200);pass('Escrita sem sessao recusada');
 await save(a.page,'');assert.equal((await scalar('SELECT "agentInstructions" FROM m1m_companies WHERE id=$1',[ids.A])).agentInstructions,null);
 assert.equal((await scalar('SELECT "productsServices" FROM m1m_company_profiles WHERE "companyId"=$1',[ids.A])).productsServices,'CONHECIMENTO_SINTETICO_PRESERVADO');
 assert.equal((await scalar('SELECT "aiEnabled" FROM m1m_companies WHERE id=$1',[ids.A])).aiEnabled,false);pass('Limpeza da instrucao preserva conhecimento e controle da IA');
 if(process.env.M1M_CONFIG_ADMIN_TEST==='1'){
  const {runConfigAdminBrowserChecks}=await import('./config-admin-browser-checks.mjs');
  await runConfigAdminBrowserChecks({browser,db,base,a,b,ids,pass,adminKey:process.env.M1M_ADMIN_KEY});
 }
 report.status='PASSED';
}catch(error){report.status='FAILED';report.failure=String(error?.message||error).slice(0,2000);process.exitCode=1;
}finally{
 if(browser)await browser.close();
 if(app){try{process.kill(-app.pid,'SIGTERM')}catch{}
  await Promise.race([new Promise(r=>app.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);
  try{process.kill(-app.pid,'SIGKILL')}catch{}
 }
 if(seeded){try{await db.query('DELETE FROM m1m_users WHERE id = ANY($1::text[])',[[prefix+'-A',prefix+'-B',prefix+'-ATTENDANT']]);await db.query('DELETE FROM m1m_companies WHERE id = ANY($1::text[])',[Object.values(ids)]);report.syntheticRowsRemoved=true}catch{report.syntheticRowsRemoved=false;process.exitCode=1}}
 await db.end().catch(()=>{});report.temporaryAppStopped=!!app;report.limits='Sem chamada real OpenAI; aplicacao e navegador reais em desenvolvimento, nao build de producao. Prompts cobertos separadamente por regressao de modulos reais com persistencia simulada.';
 fs.writeFileSync(path.join(output,'M1M_INSTRUCAO_AGENTE_RESULTADO.txt'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}

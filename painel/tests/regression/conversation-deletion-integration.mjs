// Next e login reais; provedor WhatsApp FAKE em loopback. Nenhum cliente real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
const require=createRequire(process.env.M1M_DELETION_REQUIRE_BASE||import.meta.url);
const {Client}=require('pg'),bcrypt=require('bcryptjs');
assert.equal(process.env.M1M_DELETION_ISOLATED,'1');
const embedded=process.env.M1M_DELETION_EMBEDDED==='1',withBrowser=process.env.M1M_DELETION_BROWSER==='1',globalOnly=process.env.M1M_DELETION_GLOBAL_ONLY==='1',concurrencyOnly=process.env.M1M_DELETION_CONCURRENCY_ONLY==='1';
const report={operation:'DELETION_INTEGRATION_R2',status:'STARTED',postgresServerReal:!embedded,postgresEmbedded:embedded,authenticationReal:false,browserReal:false,eventsSynthetic:true,whatsappAccess:false,checks:[]};
const sql=fs.readFileSync(new URL('../../../docs/proposals/exclusoes-conversas.sql',import.meta.url),'utf8');
report.sqlSha256=createHash('sha256').update(sql).digest('hex');
const port=async()=>{const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;};
const jid='5511999000001@s.whatsapp.net',group='120363000000001@g.us',human='5511999000002@s.whatsapp.net';
const event=(id,text,remote=jid,fromMe=false)=>({key:{id,remoteJid:remote,fromMe},message:{conversation:text},messageType:'conversation',messageTimestamp:Math.floor(Date.now()/1000),pushName:'Contato sintetico A'});
const old=event('old-A','HISTORICO_EXCLUIDO'),oldGroup=event('old-group','HISTORICO_GRUPO',group);
const history=new Map([[jid,[old]],[group,[oldGroup]],[human,[]]]);
let outbound=0,app,db,engine,socket,mock,browser,context,log='',connectionString=process.env.DATABASE_URL;
const secret='synthetic-webhook-'+randomUUID(),adminKey='synthetic-admin-'+randomUUID(),password='Synthetic-'+randomUUID();
const pass=s=>report.checks.push(s);
let cleanupPromise;
function cleanupResources(){return cleanupPromise??=(async()=>{
 delete report._page;const errors=[];
 const stop=async(name,work)=>{try{await work();}catch{errors.push(name);}};
 if(context)await stop('browser-context',()=>context.close());
 if(browser)await stop('browser',()=>browser.close());
 if(app?.pid)await stop('application',async()=>{
  if(process.platform==='win32'){const result=spawnSync('taskkill.exe',['/PID',String(app.pid),'/T','/F'],{stdio:'ignore'});if(result.status!==0&&app.exitCode===null)throw Error('APP_STOP_FAILED');}
  else{try{process.kill(-app.pid,'SIGTERM');}catch(e){if(e.code!=='ESRCH')throw e;}await new Promise(r=>setTimeout(r,500));try{process.kill(-app.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')throw e;}}
 });
 if(db)await stop('database-client',()=>db.end());
 if(mock)await stop('fake-provider',async()=>{mock.closeAllConnections();await new Promise(r=>mock.close(r));});
 if(socket)await stop('embedded-socket',()=>socket.stop());
 if(engine)await stop('embedded-engine',()=>engine.close());
 report.temporaryProcessesStopped=errors.length===0;if(errors.length)report.cleanupErrors=errors;
})();}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{report.status='INTERRUPTED';report.error=signal;void cleanupResources().finally(()=>{console.log(JSON.stringify(report,null,2));process.exit(130);});});
try{
 if(embedded){const {PGlite}=require('@electric-sql/pglite'),{PGLiteSocketServer}=require('@electric-sql/pglite-socket');engine=new PGlite();socket=new PGLiteSocketServer({db:engine,port:await port(),host:'127.0.0.1'});await socket.start();connectionString='postgresql://postgres:postgres@'+socket.getServerConn()+'/postgres';}
 else{const u=new URL(connectionString);assert.equal(u.hostname,'127.0.0.1');assert.match(u.pathname,/^\/m1m_delete_[a-z0-9_]+$/);}
 db=new Client({connectionString,connectionTimeoutMillis:5000});await db.connect();
 report.databaseVersion=(await db.query('SELECT version() AS version')).rows[0].version;
 if(!embedded){const v=Number((await db.query('SHOW server_version_num')).rows[0].server_version_num);assert.ok(v>=160000&&v<170000);}
 assert.equal(Number((await db.query("SELECT count(*) n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n),0);
 await db.query(fs.readFileSync(new URL('../fixtures/conversation-deletion-baseline.sql',import.meta.url),'utf8'));await db.query(sql);pass('SQL exato aplicado em banco novo isolado');
 for(const [id,name,instance] of [['empresa-teste','Marketing1Minuto','M1MTesteIA'],['synthetic-B','Empresa sintetica B','instance-B']])await db.query(`INSERT INTO m1m_companies(id,name,slug,"whatsappInstanceName","onboardingCompleted","subscriptionStatus","aiEnabled","updatedAt") VALUES($1,$2,$1,$3,true,'ACTIVE',false,now())`,[id,name,instance]);
 const hash=await bcrypt.hash(password,10);
 for(const [id,company,role,perms,primary] of [['admin-A','empresa-teste','ADMIN',['DELETE_CONVERSATIONS'],false],['admin-B','synthetic-B','ADMIN',['DELETE_CONVERSATIONS'],false],['denied','empresa-teste','ATTENDANT',['DELETE_MESSAGES','VIEW_ALL_CONVERSATIONS'],false],['primary-no-delete','empresa-teste','ADMIN',[],true]])await db.query(`INSERT INTO m1m_users(id,"companyId",name,email,"passwordHash",role,permissions,"isPrimary","updatedAt") VALUES($1,$2,$1,$3,$4,$5,$6::"M1MUserPermission"[],$7,now())`,[id,company,id.toLowerCase()+'@example.invalid',hash,role,perms,primary]);
 assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_users WHERE email <> lower(trim(email)) OR active=false')).rows[0].n),0);pass('Usuarios sinteticos ativos com email normalizado conforme login real');
 for(const [id,company,remote,name] of [['customer-A','empresa-teste',jid,'Contato sintetico A'],['group-A','empresa-teste',group,'Grupo sintetico'],['human-A','empresa-teste',human,'Humano sintetico'],['customer-B','synthetic-B',jid,'Contato sintetico B']])await db.query(`INSERT INTO m1m_customers(id,"companyId","remoteJid",name,"updatedAt") VALUES($1,$2,$3,$4,now())`,[id,company,remote,name]);
 for(const [id,customer,state] of [['att-A','customer-A','IA'],['att-human','human-A','HUMANO']])await db.query(`INSERT INTO m1m_attendances(id,"companyId","customerId",state,"updatedAt") VALUES($1,'empresa-teste',$2,$3,now())`,[id,customer,state]);
 for(const [id,company,instance,customer,remote,e] of [['old-A','empresa-teste','M1MTesteIA','customer-A',jid,old],['old-group','empresa-teste','M1MTesteIA','group-A',group,oldGroup],['other-instance','empresa-teste','instance-other','customer-A',jid,event('other-instance','OUTRA_INSTANCIA')],['old-B','synthetic-B','instance-B','customer-B',jid,event('old-B','OUTRA_EMPRESA')]])await db.query(`INSERT INTO m1m_messages(id,"companyId","instanceName","customerId","evolutionMessageId","remoteJid",direction,type,"fromMe",content,"rawPayload","sentAt","processedAt","updatedAt") VALUES($1,$2,$3,$4,$1,$5,'IN','TEXT',false,$6,$7,now(),now(),now())`,[id,company,instance,customer,remote,e.message.conversation,e]);
 await db.query(`INSERT INTO m1m_reminders(id,"companyId","customerId",title,"remindAt","updatedAt") VALUES('reminder-A','empresa-teste','customer-A','PRESERVAR_AGENDA',now(),now())`);
 await db.query(`INSERT INTO m1m_payment_receipts(id,"companyId","customerId","messageId","mediaUrl","updatedAt") VALUES('receipt-A','empresa-teste','customer-A','old-A','/payment-receipts/synthetic-kept',now())`);
 mock=createServer(async(req,res)=>{let text='';for await(const b of req)text+=b;let body={};try{body=JSON.parse(text||'{}');}catch{}let data={};const p=req.url;
  if(p.includes('/message/send')){outbound++;const e=event('auth-send-'+outbound,body.text||'ARQUIVO_SINTETICO',jid,true);history.get(jid).push(e);data=e;}
  else if(p.includes('/chat/findChats/')){const rows=[{remoteJid:jid,pushName:'Contato sintetico A',updatedAt:new Date().toISOString(),lastMessage:old},{remoteJid:group,pushName:'Grupo sintetico',updatedAt:new Date().toISOString(),lastMessage:oldGroup},{remoteJid:human,pushName:'Humano sintetico',updatedAt:new Date().toISOString()}];data=body.where?.remoteJid?rows.filter(c=>c.remoteJid===body.where.remoteJid):rows.slice(body.skip||0,(body.skip||0)+(body.take||200));}
  else if(p.includes('/chat/findMessages/'))data={messages:{records:history.get(body.where?.key?.remoteJid)||[]}};
  else if(p.includes('/chat/findContacts/'))data=[{remoteJid:jid,pushName:'Contato sintetico A'},{remoteJid:group,pushName:'Grupo sintetico'},{remoteJid:human,pushName:'Humano sintetico'}];
  else if(p.includes('/instance/fetchInstances'))data=[{name:'M1MTesteIA'},{name:'instance-B'}];else if(p.includes('/group/'))data={subject:'Grupo sintetico'};
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));});await new Promise(r=>mock.listen(0,'127.0.0.1',r));
 // NextURL normaliza IPs de loopback para localhost. Navegador e servidor precisam da mesma origem.
 const base='http://localhost:'+await port();const env={};for(const k of ['PATH','Path','HOME','USERPROFILE','SystemRoot','SYSTEMROOT','COMSPEC','TEMP','TMP','APPDATA','LOCALAPPDATA'])if(process.env[k])env[k]=process.env[k];
 Object.assign(env,{NODE_ENV:'development',DATABASE_URL:connectionString,M1M_SESSION_SECRET:'synthetic-session-'+randomUUID(),M1M_ADMIN_KEY:adminKey,M1M_WEBHOOK_SECRET:secret,M1M_CONVERSATION_DELETION_ENABLED:'true',M1M_TF3A_UNREAD_LEDGER_ENABLED:'false',EVOLUTION_API_URL:'http://127.0.0.1:'+mock.address().port,EVOLUTION_API_KEY:'synthetic-fake-provider',NEXT_TELEMETRY_DISABLED:'1'});
 assert.ok(!fs.existsSync('.env'),'Nao carregar .env do projeto');
 app=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',new URL(base).port],{cwd:process.cwd(),env,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});for(const stream of [app.stdout,app.stderr])stream.on('data',b=>{log=(log+b.toString()).slice(-20000);});
 let ready=false;for(let i=0;i<120;i++){if(app.exitCode!==null)throw Error('APP_EXITED');try{if((await fetch(base+'/api/admin/session',{signal:AbortSignal.timeout(2000)})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'APP_NOT_READY');
 const request=(cookie,p,options={})=>fetch(base+p,{...options,headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{}),...options.headers},signal:AbortSignal.timeout(60000)});
 const login=async id=>{const r=await request(null,'/api/auth/login',{method:'POST',body:JSON.stringify({email:id.toLowerCase()+'@example.invalid',password})});assert.equal(r.status,200,await r.clone().text());const cookie=r.headers.get('set-cookie').split(';')[0];return {get:p=>request(cookie,p),post:(p,data)=>request(cookie,p,{method:'POST',body:JSON.stringify(data)}),put:(p,data)=>request(cookie,p,{method:'PUT',body:JSON.stringify(data)}),postOrigin:(p,data,origin)=>request(cookie,p,{method:'POST',headers:{Origin:origin},body:JSON.stringify(data)})};};
 const api='/api/conversation-deletions';
 if(concurrencyOnly){
  report.reusedEvidence='R2.2: nucleo PG; R2.6: fluxo principal; R2.7: navegador global. Nao repetidos.';
  const a=await login('admin-A');report.authenticationReal=true;
  const prep=await a.post(api,{action:'prepare',remoteJid:jid,requestKey:randomUUID()});assert.equal(prep.status,200,await prep.clone().text());const op=await prep.json();
  // Compila o webhook antes da barreira; GET nao processa mensagens.
  await request(null,'/api/webhooks/evolution/messages');
  const lockKey=JSON.stringify(['empresa-teste','M1MTesteIA',jid]);
  let held=false,confirmation;
  const incoming=event('concurrent-incoming','EVENTO_CONCORRENTE_INCERTO');
  const submit=()=>request(null,'/api/webhooks/evolution/messages',{method:'POST',headers:{'x-m1m-webhook-secret':secret},body:JSON.stringify({event:'messages.upsert',instance:'M1MTesteIA',data:incoming})});
  const attendanceBefore=Number((await db.query('SELECT count(*) n FROM m1m_attendances')).rows[0].n);
  try{
   await db.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[lockKey]);held=true;
   confirmation=a.post(api,{action:'confirm',remoteJid:jid,id:op.id,version:op.version}).then(async r=>({status:r.status,data:await r.json()}),e=>({error:String(e)}));
   let waiting=false;for(let i=0;i<30;i++){const row=await db.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS waiting");if(row.rows[0].waiting){waiting=true;break;}await new Promise(r=>setTimeout(r,20));}assert.ok(waiting,'CONFIRMATION_DID_NOT_REACH_LOCK_BARRIER');
   const blocked=await submit();report.concurrentReceiveStatus=blocked.status;assert.ok(blocked.status>=400,'Recebimento bloqueado deve informar falha para permitir reentrega');
   assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_messages WHERE "evolutionMessageId"=$1',[incoming.key.id])).rows[0].n),0);
  }finally{if(held)await db.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[lockKey]);}
  const finished=await confirmation;assert.equal(finished.status,200,JSON.stringify(finished));
  const retried=await submit();assert.equal(retried.status,200,await retried.clone().text());assert.equal((await retried.json()).action,'ADMIN_REVIEW');
  assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_attendances')).rows[0].n),attendanceBefore);assert.equal(outbound,0);
  pass('Rotas reais concorrentes: recebimento sinaliza bloqueio durante exclusao; reentrega apos exclusao entra em revisao sem IA/atendimento');
  const pending=(await (await a.get(api+'?reviews=1')).json()).items.find(r=>r.evolutionMessageId===incoming.key.id);assert.ok(pending);
  const decisions=['RESUME','DISCARD'];const results=await Promise.all(decisions.map(async decision=>{const r=await a.post(api,{action:'review',reviewId:pending.id,version:pending.version,decision});return {decision,status:r.status,data:await r.json()};}));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winner=results.find(r=>r.status===200);
  const stored=(await db.query('SELECT state,"normalizedPayload" FROM m1m_conversation_deletion_reviews WHERE id=$1',[pending.id])).rows[0];assert.equal(stored.state,winner.decision==='RESUME'?'RESUMED':'DISCARDED');assert.equal(stored.normalizedPayload,null);
  const count=Number((await db.query('SELECT count(*) n FROM m1m_messages WHERE "companyId"=$1 AND "instanceName"=$2 AND "evolutionMessageId"=$3',['empresa-teste','M1MTesteIA',incoming.key.id])).rows[0].n);assert.equal(count,winner.decision==='RESUME'?1:0);
  const repeat=await submit();assert.equal(repeat.status,200);assert.equal((await repeat.json()).action,winner.decision==='RESUME'?'ALREADY_REVIEWED':'IGNORE_DISCARDED_EVENT');assert.equal(outbound,0);
  pass('Duas revisoes pela API real: uma decisao vence, outra recebe 409; importacao unica/descarte e repeticao respeitam decisao');
 }else{
 if(!globalOnly){
 const a=await login('admin-A'),b=await login('admin-B'),denied=await login('denied'),primary=await login('primary-no-delete');report.authenticationReal=true;await a.post('/api/legal-acceptance',{});await b.post('/api/legal-acceptance',{});
 assert.equal((await request(null,api)).status,401);assert.equal((await denied.post(api,{action:'prepare',remoteJid:jid,requestKey:randomUUID()})).status,403);assert.equal((await primary.post(api,{action:'prepare',remoteJid:jid,requestKey:randomUUID()})).status,403);assert.equal((await a.get(api+'?companyId=synthetic-B')).status,403);pass('Login e JWT reais; anonimo, permissao antiga, principal sem concessao e empresa arbitraria recusados');
 const granted=await a.put('/api/users/primary-no-delete',{permissions:['DELETE_CONVERSATIONS'],useCustomPermissions:false});assert.equal(granted.status,200,await granted.clone().text());assert.equal((await (await primary.get(api)).json()).canDelete,true);
 assert.equal((await a.put('/api/users/primary-no-delete',{permissions:[],useCustomPermissions:false})).status,200);assert.equal((await (await primary.get(api)).json()).canDelete,false);pass('Concessao e revogacao explicitas persistem pela API real, inclusive no usuario principal sem permissoes personalizadas');
 const prepare=async(client,remote=jid)=>{const r=await client.post(api,{action:'prepare',remoteJid:remote,requestKey:randomUUID()});assert.equal(r.status,200,await r.clone().text());return r.json();};const action=(client,op,action)=>client.post(api,{action,remoteJid:op.remoteJid,id:op.id,version:op.version});
 assert.equal((await a.post(api,{action:'prepare',remoteJid:human,requestKey:randomUUID()})).status,409);pass('API bloqueia HUMANO ativo sem responsavel');
 const foreignOrigin=await a.postOrigin(api,{action:'prepare',remoteJid:jid,requestKey:randomUUID()},'https://foreign.example.invalid');assert.equal(foreignOrigin.status,403);pass('Origem externa recusada com sessao autenticada; protecao de origem preservada');
 const preflight=await prepare(a);assert.equal((await action(a,preflight,'cancel')).status,200);pass('Previa e cancelamento autenticados pela API antes do navegador');
 if(withBrowser){
  const pw=require(process.env.M1M_DELETION_PLAYWRIGHT_MODULE||'playwright');browser=await pw.chromium.launch({channel:process.env.M1M_DELETION_BROWSER_CHANNEL||'chrome',headless:true});report.browserReal=true;context=await browser.newContext();await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());const page=await context.newPage();report._page=page;page.setDefaultTimeout(60000);
  await page.goto(base+'/login');await page.locator('input[type=email]').fill('admin-A@example.invalid');await page.locator('input[type=password]').fill(password);await page.getByRole('button',{name:'Entrar no M1M Connect',exact:true}).click();await page.waitForURL(u=>u.pathname==='/');await page.getByText('Contato sintetico A',{exact:true}).first().click();
  const openDeletePreview=async()=>{
   await page.getByRole('button',{name:'Opções da conversa'}).click();
   const responsePromise=page.waitForResponse(r=>r.url()===base+api&&r.request().method()==='POST',{timeout:15000});
   await page.getByRole('button',{name:'Excluir conversa',exact:true}).click();
   const response=await responsePromise,data=await response.json();
   report.lastBrowserDeletionResponse={status:response.status(),code:data.code??null,error:data.error??null};
   assert.equal(response.status(),200,JSON.stringify(report.lastBrowserDeletionResponse));
   await page.getByRole('dialog',{name:'Excluir conversa'}).waitFor({timeout:10000});
  };

  await openDeletePreview();await page.getByRole('dialog',{name:'Excluir conversa'}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await db.query("SELECT 1 FROM m1m_messages WHERE id='old-A'")).rowCount,1);pass('Navegador: previa identificada e cancelamento preservam dados');
  await openDeletePreview();
  await page.getByRole('dialog',{name:'Excluir conversa'}).waitFor();await db.query(`UPDATE m1m_messages SET "updatedAt"="updatedAt"+interval '1 second' WHERE id='old-A'`);
  await page.getByRole('button',{name:'Confirmar exclusão',exact:true}).click();await page.getByRole('dialog',{name:'Excluir conversa'}).getByRole('alert').waitFor();assert.equal((await db.query("SELECT 1 FROM m1m_messages WHERE id='old-A'")).rowCount,1);await page.getByRole('button',{name:'Cancelar',exact:true}).click();pass('Navegador apresenta conflito real da API sem apagar dados');
  await openDeletePreview();await page.getByRole('button',{name:'Confirmar exclusão',exact:true}).click();await page.getByText('Selecione uma conversa.',{exact:true}).waitFor();await page.reload();await page.getByText('Grupo sintetico',{exact:true}).first().waitFor();assert.equal(await page.getByText('Contato sintetico A',{exact:true}).count(),0);pass('Navegador: lista e selecao atualizadas; exclusao persiste apos F5');report._page=page;
 }else{const cancelled=await prepare(a);assert.equal((await action(a,cancelled,'cancel')).status,200);const op=await prepare(a);assert.equal((await action(a,op,'confirm')).status,200);}
 assert.equal(Number((await db.query(`SELECT count(*) n FROM m1m_messages WHERE "companyId"='empresa-teste' AND "instanceName"='M1MTesteIA' AND "remoteJid"=$1`,[jid])).rows[0].n),0);for(const id of ['other-instance','old-B'])assert.equal((await db.query('SELECT 1 FROM m1m_messages WHERE id=$1',[id])).rowCount,1);assert.equal((await db.query('SELECT 1 FROM m1m_reminders')).rowCount,1);assert.equal((await db.query('SELECT "mediaUrl" FROM m1m_payment_receipts')).rows[0].mediaUrl,'/payment-receipts/synthetic-kept');pass('Exclusao fisica por API preserva agenda, financeiro, contato, empresa e instancia externas');
 const webhook=async e=>{const r=await request(null,'/api/webhooks/evolution/messages',{method:'POST',headers:{'x-m1m-webhook-secret':secret},body:JSON.stringify({event:'messages.upsert',instance:'M1MTesteIA',data:e})});assert.equal(r.status,200,await r.clone().text());return r.json();};
 await db.query(`UPDATE m1m_companies SET "aiEnabled"=true WHERE id='empresa-teste'`);
 const countAttendance=Number((await db.query('SELECT count(*) n FROM m1m_attendances')).rows[0].n);assert.equal((await webhook(old)).action,'IGNORE_KNOWN_HISTORY');const one=event('uncertain-one','EVENTO_INCERTO_UM'),two=event('uncertain-two','EVENTO_INCERTO_DOIS');for(const e of [one,one,two])assert.equal((await webhook(e)).action,'ADMIN_REVIEW');assert.equal(Number((await db.query('SELECT count(*) n FROM m1m_attendances')).rows[0].n),countAttendance);assert.equal(outbound,0);pass('Webhooks sinteticos: antigo nao restaura; incerto deduplica sem IA, encaminhamento ou atendimento');
 const reviews=await (await a.get(api+'?reviews=1')).json();assert.equal(reviews.pendingCount,2);assert.equal((await denied.get(api+'?reviews=1')).status,403);assert.equal((await (await b.get(api+'?reviews=1')).json()).pendingCount,0);const first=reviews.items.find(r=>r.evolutionMessageId==='uncertain-one'),second=reviews.items.find(r=>r.evolutionMessageId==='uncertain-two');assert.equal((await b.post(api,{action:'review',reviewId:first.id,version:first.version,decision:'RESUME'})).status,404);pass('Revisao direta exige administrador e respeita empresa');
 if(withBrowser){const page=report._page;await page.goto(base+'/configuracoes');await page.getByRole('link',{name:/Revisar eventos de origem incerta \(2 pendentes\)/}).click();await page.getByText('2 eventos pendentes',{exact:true}).waitFor();await page.locator('article').filter({hasText:'EVENTO_INCERTO_UM'}).getByRole('button',{name:'Retomar com este evento'}).click();await page.getByRole('button',{name:'Confirmar decisão',exact:true}).click();await page.getByText('1 evento pendente',{exact:true}).waitFor();await page.locator('article').filter({hasText:'EVENTO_INCERTO_DOIS'}).getByRole('button',{name:'Descartar evento'}).click();await page.getByRole('button',{name:'Confirmar decisão',exact:true}).click();await page.getByText('0 eventos pendentes',{exact:true}).waitFor();await page.reload();await page.getByText('0 eventos pendentes',{exact:true}).waitFor();await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('main').evaluate(n=>n.scrollWidth<=window.innerWidth));pass('Navegador: pendencias visiveis, retomada, descarte, F5 e largura de celular');}
 else{const resumed=await a.post(api,{action:'review',reviewId:first.id,version:first.version,decision:'RESUME'});assert.equal(resumed.status,200,await resumed.clone().text());assert.equal((await a.post(api,{action:'review',reviewId:second.id,version:second.version,decision:'DISCARD'})).status,200);}
 assert.equal((await webhook(two)).action,'IGNORE_DISCARDED_EVENT');assert.equal((await webhook(old)).action,'IGNORE_KNOWN_HISTORY');assert.equal(outbound,0);const current=await (await a.get('/api/chat/list?queue=OPEN&limit=100')).json();assert.equal(current.items.find(r=>r.remoteJid===jid).lastMessage.message.conversation,'EVENTO_INCERTO_UM');pass('Retomada seletiva sem restaurar historico; descarte nao recria pendencia; lista usa previa persistida');
 const sent=await a.post('/api/chat/send',{remoteJid:jid,text:'ENVIO_AUTENTICADO_SINTETICO'});assert.equal(sent.status,200,await sent.clone().text());assert.equal(outbound,1);assert.equal((await db.query(`SELECT "rawPayload" FROM m1m_messages WHERE "companyId"='empresa-teste' AND "evolutionMessageId"='auth-send-1'`)).rows[0].rawPayload.m1mOrigin,'AUTHENTICATED_PANEL_SEND');pass('Envio autenticado ao provedor fake gera comprovacao duravel distinta de upsert desconhecido');
 const groupOp=await prepare(a,group);assert.equal((await action(a,groupOp,'confirm')).status,200);
 assert.equal((await webhook(oldGroup)).action,'IGNORE_KNOWN_HISTORY');assert.equal((await webhook(event('group-uncertain','EVENTO_GRUPO_INCERTO',group))).action,'ADMIN_REVIEW');pass('Grupo excluido: historico bloqueado e evento incerto visivel antes do fluxo operacional');
 }else{report.reusedEvidence='R2.6 20261030-093148: fluxo de exclusao/revisao no navegador e APIs aprovado; nao repetido nesta rodada';}
 const global=await request(null,'/api/admin/session',{method:'POST',body:JSON.stringify({adminKey})});assert.equal(global.status,200);report.authenticationReal=true;const adminCookie=global.headers.get('set-cookie').split(';')[0];const selected=await request(adminCookie,api+'?companyId=synthetic-B');assert.equal(selected.status,200);assert.equal((await selected.json()).company,'Empresa sintetica B');pass('Administrador global usa empresa selecionada, sem sessao de cliente');
 if(withBrowser){
  if(!browser){const pw=require(process.env.M1M_DELETION_PLAYWRIGHT_MODULE||'playwright');browser=await pw.chromium.launch({channel:process.env.M1M_DELETION_BROWSER_CHANNEL||'chrome',headless:true});report.browserReal=true;}
  const globalContext=await browser.newContext();try{
   await globalContext.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());const page=await globalContext.newPage();report._page=page;page.setDefaultTimeout(60000);
   await page.goto(base+'/m1m-admin');await page.getByLabel('Chave administrativa',{exact:true}).fill(adminKey);await page.getByRole('button',{name:'Entrar no M1M Admin',exact:true}).click();await page.getByRole('button',{name:'Entrar no M1M Admin',exact:true}).waitFor({state:'hidden'});
   await page.locator('article').filter({hasText:'Empresa sintetica B'}).getByRole('button',{name:'Gerenciar',exact:true}).click();await page.waitForURL(u=>u.pathname==='/m1m-admin/companies/synthetic-B/manage');await page.getByRole('link',{name:/Revisar eventos de origem incerta/}).click();await page.getByText('Empresa sintetica B',{exact:true}).waitFor();await page.getByRole('link',{name:'← Voltar ao gerenciamento da empresa',exact:true}).click();await page.waitForURL(u=>u.pathname==='/m1m-admin/companies/synthetic-B/manage');assert.equal((await globalContext.cookies()).some(c=>c.name==='m1m_session'),false);pass('Navegador global: revisao e retorno preservam empresa selecionada sem login do cliente');
  }finally{await globalContext.close();}
 }
 }
 report.status='PASSED';
}catch(e){report.status='FAILED';report.error=String(e.message||e);if(report._page)try{report.browserAlerts=await report._page.getByRole('alert').allTextContents();report.browserDialogs=await report._page.getByRole('dialog').allTextContents();report.menuGeometry=await report._page.evaluate(()=>{const n=[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Excluir conversa');if(!n)return null;const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {bounds:{x:r.x,y:r.y,width:r.width,height:r.height},topTag:top?.tagName,topText:top?.textContent?.slice(0,120)};});}catch{}report.serverErrorTail=log.slice(-12000);process.exitCode=1;}finally{
 await cleanupResources();report.outboundSynthetic=outbound;console.log(JSON.stringify(report,null,2));
}

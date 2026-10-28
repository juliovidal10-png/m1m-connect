// Modulos reais de sync, mensagens e atendimento; persistencia e Evolution simuladas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const runtimeRequire=createRequire(import.meta.url);
const root = new URL('../../src/', import.meta.url);
const enums = Object.fromEntries(['M1MMessageAuthorType','M1MMessageDirection','M1MMessageType','M1MAttendanceActorType','M1MAttendanceEventType','M1MAttendanceState','M1MUserPermission'].map(key=>[key,new Proxy({}, {get:(_,name)=>name})]));
function load(path, deps, globals={}) {
  const source=fs.readFileSync(new URL(path,root),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{
    if(name==='@/generated/prisma/enums')return enums;
    if(name in deps)return deps[name];
    if(name==='next/server')return runtimeRequire(name);
    throw Error('Dependencia inesperada: '+name);
  },console:{log(){},info(){},warn(){},error(){}},Date,Map,Set,Buffer,File,process:{env:{EVOLUTION_API_URL:"http://synthetic-evolution",EVOLUTION_API_KEY:"synthetic-key"}},...globals});
  return module.exports;
}
function fixture({jid='556500000001@s.whatsapp.net',company='synthetic-A',instance='instance-A',state=null}={}) {
  const rows=new Map(), authors=new Map(), events=[];
  const customer={id:'customer-'+company,companyId:company,remoteJid:jid,status:state==='HUMANO'?'HUMANO':'IA'};
  const original=state?{id:'attendance-'+company,customerId:customer.id,companyId:company,state,responsibleId:null,sectorId:null,startedAt:new Date('2026-10-28T00:00:00Z')}:null;
  let attendance=original;
  const key=(c,i,id)=>JSON.stringify([c,i,id]);
  const repo={
    findMessageByEvolutionId:async(c,i,id)=>rows.get(key(c,i,id))??null,
    createMessage:async data=>{const row={id:'message-'+rows.size,...data};rows.set(key(data.companyId,data.instanceName,data.evolutionMessageId),row);return row;},
    setAuthorship:async(id,authorType,authorId,authorName)=>{const row=[...rows.values()].find(r=>r.id===id);Object.assign(row,{authorType,authorId,authorName});return row;},
  };
  const messages=load('services/message.service.ts',{'@/repositories/message.repository':{messageRepository:repo}}).messageService;
  messages.listRecentMessagesByCustomer=async(c,id)=>[...rows.values()].filter(r=>r.companyId===c&&r.customerId===id);
  const customerRepo={
    upsert:async data=>{assert.equal(data.companyId,company);assert.equal(data.remoteJid,jid);return customer;},
    releaseResponsible:async(c,id)=>{assert.equal(c,company);assert.equal(id,customer.id);customer.responsibleId=null;},
    markAsHuman:async()=>{customer.status='HUMANO';return customer;},
    assignResponsible:async(c,id,user)=>{assert.equal(c,company);assert.equal(id,customer.id);customer.responsibleId=user;customer.status='HUMANO';return customer;},
  };
  const attendanceRepo={
    findActiveAttendance:async()=>attendance?.state==='FINALIZADO'?null:attendance,
    findAttendanceById:async(c,id)=>{assert.equal(c,company);return attendance?.id===id?attendance:null;},
    createAttendance:async data=>{attendance={id:'new-attendance',...data,state:'IA',responsibleId:null,startedAt:new Date()};return attendance;},
    takeoverAttendance:async()=>{attendance.state='HUMANO';return attendance;},
    assignAttendance:async data=>{attendance.state='HUMANO';attendance.responsibleId=data.responsibleId;return attendance;},
    findSector:async(c,id)=>({id,name:'Setor sintetico'}),
    transferToSector:async data=>{Object.assign(attendance,{state:'HUMANO',responsibleId:null,sectorId:data.sectorId});return attendance;},
    routeToSectorByAI:async data=>{Object.assign(attendance,{state:'IA',responsibleId:null,sectorId:data.sectorId});return attendance;},
    createEvent:async data=>{events.push(data);return data;},
  };
  const attendances=load('services/attendance.service.ts',{'@/repositories/attendance.repository':{attendanceRepository:attendanceRepo},'@/repositories/customer.repository':{customerRepository:customerRepo}}).attendanceService;
  const takeover=load('services/human-takeover.service.ts',{'@/services/attendance.service':{attendanceService:attendances},'@/repositories/customer.repository':{customerRepository:customerRepo}}).humanTakeoverService;
  const prisma={m1MMessage:{
    findMany:async()=>[],
    updateMany:async({where,data})=>{
      assert.equal(where.companyId,company);assert.equal(where.instanceName,instance);assert.equal(where.authorId,null);
      const row=[...rows.values()].find(r=>r.id===where.id);
      if(!row||row.companyId!==where.companyId||row.instanceName!==where.instanceName||row.authorId!=null||![null,undefined,'HUMAN'].includes(row.authorType))return{count:0};
      Object.assign(row,data);return{count:1};
    },
  }};
  let raw=[];
  const sync=load('services/conversation-sync.service.ts',{
    '@/lib/evolution':{getMessages:async()=>raw},
    '@/lib/prisma':{prisma},
    '@/repositories/customer.repository':{customerRepository:customerRepo},
    '@/services/attendance.service':{attendanceService:attendances},
    '@/services/message.service':{messageService:messages,REVOKED_MESSAGE_CONTENT:'revoked'},
    '@/services/manual-outgoing-author-registry.service':{manualOutgoingAuthorRegistryService:{get:(i,id)=>authors.get(key(company,i,id))??null}},
    // Qualquer tentativa de inferir intervencao pelo TTL ou acionar takeover no sync falha.
    '@/services/human-takeover.service':{humanTakeoverService:{process:()=>{throw Error('Sync acionou takeover');}}},
    '@/services/automatic-outgoing-registry.service':{automaticOutgoingRegistryService:{isAutomatic:()=>{throw Error('Sync inferiu intervencao pelo registry temporario');}}},
  }).conversationSyncService;
  const message=(id,fromMe=true,sent='2026-01-01T00:00:00Z')=>({key:{id,remoteJid:jid,fromMe},messageType:'conversation',message:{conversation:'conteudo sintetico '+id},messageTimestamp:Math.floor(Date.parse(sent)/1000),pushName:'Contato sintetico'});
  return{rows,events,authors,customer,original,key,company,instance,jid,message,sync,attendances,takeover,prisma,get attendance(){return attendance;},setRaw(value){raw=value;}};
}
// Historico desconhecido, repetido e fora de ordem: particulares/grupos, sem atendimento, IA, HUMANO e finalizado.
for(const jid of ['556500000001@s.whatsapp.net','120300000001@g.us']) {
 for(const state of [null,'IA','HUMANO','FINALIZADO']) {
  const f=fixture({jid,state});const before=JSON.stringify(f.attendance);const beforeCustomer=JSON.stringify(f.customer);
  f.setRaw([f.message('unknown-out'),f.message('incoming',false),f.message('recent-out',true,'2026-10-28T01:00:00Z')]);
  const result=await f.sync.syncConversation(jid,f.instance,f.company);
  assert.equal(result.length,3);assert.equal(f.rows.size,3);
  assert.equal([...f.rows.values()].find(m=>m.evolutionMessageId==='unknown-out').authorType,null,'fromMe desconhecido nao prova autoria humana');
  assert.equal([...f.rows.values()].find(m=>m.evolutionMessageId==='incoming').authorType,'CUSTOMER');
  f.setRaw([f.message('recent-out',true,'2026-10-28T01:00:00Z'),f.message('unknown-out'),f.message('incoming',false)]);
  await f.sync.syncConversation(jid,f.instance,f.company);
  assert.equal(f.rows.size,3);assert.equal(JSON.stringify(f.attendance),before);assert.equal(JSON.stringify(f.customer),beforeCustomer);assert.equal(f.events.length,0);
 }
}
// Autoria persistida de IA/humano permanece; autoria autenticada tardia e conciliada sem atendimento.
{
 const f=fixture({state:'FINALIZADO'});
 f.setRaw([f.message('ai'),f.message('known-human'),f.message('late-human')]);
 await f.sync.syncConversation(f.jid,f.instance,f.company);
 const stored=id=>f.rows.get(f.key(f.company,f.instance,id));
 Object.assign(stored('ai'),{authorType:'AI',authorId:null,authorName:'IA'});
 Object.assign(stored('known-human'),{authorType:'HUMAN',authorId:'original-user',authorName:'Original'});
 Object.assign(stored('late-human'),{authorType:'HUMAN',authorId:null,authorName:'WhatsApp'});
 for(const id of ['known-human','late-human','ai'])f.authors.set(f.key(f.company,f.instance,id),{userId:'late-user',displayName:'Usuario sintetico'});
 const result=await f.sync.syncConversation(f.jid,f.instance,f.company);
 assert.equal(stored('ai').authorType,'AI');assert.equal(stored('known-human').authorId,'original-user');assert.equal(stored('late-human').authorId,'late-user');
 assert.equal(result.find(r=>r.key.id==='late-human').m1mAuthor.id,'late-user');
 assert.equal(f.attendance.state,'FINALIZADO');assert.equal(f.events.length,0);
}
// Uma autoria gravada concorrentemente nao e sobrescrita pela reconciliacao tardia.
{
 const f=fixture({state:'IA'});f.setRaw([f.message('race')]);
 await f.sync.syncConversation(f.jid,f.instance,f.company);
 const row=[...f.rows.values()][0];row.authorType='HUMAN';row.authorId=null;
 f.authors.set(f.key(f.company,f.instance,'race'),{userId:'late-user',displayName:'Tardio'});
 const update=f.prisma.m1MMessage.updateMany;
 f.prisma.m1MMessage.updateMany=async args=>{row.authorId='concurrent-user';row.authorName='Concorrente';return update(args);};
 await f.sync.syncConversation(f.jid,f.instance,f.company);
 assert.equal(row.authorId,'concurrent-user');assert.equal(row.authorName,'Concorrente');assert.equal(f.events.length,0);
}
// Mesmo ID em outra empresa/instancia nao toma emprestada autoria.
{
 const f=fixture();f.authors.set(f.key('other-company','other-instance','same-id'),{userId:'other-user',displayName:'Outro'});
 f.setRaw([f.message('same-id')]);await f.sync.syncConversation(f.jid,f.instance,f.company);
 assert.equal([...f.rows.values()][0].authorId,null);assert.equal(f.events.length,0);
}
// Servicos reais: assumir autenticado, transferencia manual e handoff explicito continuam operacionais.
{
 const f=fixture({state:'IA'});
 await f.attendances.assumeAttendance(f.company,f.attendance.id,'authenticated-user');
 assert.equal(f.attendance.state,'HUMANO');assert.equal(f.attendance.responsibleId,'authenticated-user');
 f.setRaw([f.message('history-after-assume')]);
 const count=f.events.length;await f.sync.syncConversation(f.jid,f.instance,f.company);
 assert.equal(f.attendance.responsibleId,'authenticated-user');assert.equal(f.events.length,count);
 await f.attendances.transferAttendanceToSector({companyId:f.company,attendanceId:f.attendance.id,sectorId:'B',actorType:'USER',actorId:'authenticated-user'});
 assert.equal(f.attendance.state,'HUMANO');assert.equal(f.attendance.responsibleId,null);assert.equal(f.attendance.sectorId,'B');
 assert.ok(f.events.some(e=>e.type==='TAKEN_BY_HUMAN'));assert.ok(f.events.some(e=>e.type==='TRANSFERRED_TO_SECTOR'&&e.actorId==='authenticated-user'));
}
{
 const f=fixture({state:'IA'});
 await f.attendances.requestHumanAttendanceByAI({companyId:f.company,attendanceId:f.attendance.id,sectorId:'B',handoffReason:'CUSTOMER_REQUEST'});
 assert.equal(f.attendance.state,'HUMANO');assert.equal(f.attendance.responsibleId,null);assert.ok(f.events.some(e=>e.metadata?.source==='AI_HANDOFF'));
}
// Intervencao atual pelo WhatsApp e outro caminho: permanece capaz de criar HUMANO.
{
 const f=fixture();
 await f.takeover.process({companyId:f.company,customerId:f.customer.id,remoteJid:f.jid,evolutionMessageId:'live-out'});
 assert.equal(f.attendance.state,'HUMANO');assert.ok(f.events.some(e=>e.metadata?.source==='WHATSAPP_MANUAL_MESSAGE'));
}
// Rotas reais de envio: autorizacao antes do envio, takeover so apos confirmacao com ID.
for(const routePath of ['app/api/chat/send/route.ts','app/api/chat/send-media/route.ts']) {
 for(const scenario of ['success','missing-id','upstream-failed','unauthorized']) {
  const f=fixture();let sent=0,transition=0,permissionChecks=0;
  const payload=f.message('confirmed-send',true,'2026-10-28T03:00:00Z');f.setRaw([payload]);
  const route=load(routePath,{
   '@/services/auth/authorization.service':{authorizationService:{requirePermission:async permission=>{
    permissionChecks++;assert.equal(permission,'ASSUME_ATTENDANCE');if(scenario==='unauthorized')throw Error('denied');return{companyId:f.company,userId:'session-user'};
   }}},
   '@/lib/tenant':{getAuthenticatedCompanyId:async()=>f.company},
   '@/repositories/company.repository':{companyRepository:{findById:async()=>({whatsappInstanceName:f.instance})}},
   '@/lib/prisma':{prisma:{m1MUser:{findFirst:async()=>({name:'Usuario sintetico'})},m1MMessage:{updateMany:async({where,data})=>{
    assert.equal(where.companyId,f.company);assert.equal(where.instanceName,f.instance);assert.equal(where.evolutionMessageId,'confirmed-send');
    const row=f.rows.get(f.key(where.companyId,where.instanceName,where.evolutionMessageId));if(row)Object.assign(row,data);return{count:row?1:0};
   }}}},
   '@/services/manual-outgoing-author-registry.service':{manualOutgoingAuthorRegistryService:{register:(instance,id,userId,displayName)=>{assert.equal(userId,'session-user');f.authors.set(f.key(f.company,instance,id),{userId,displayName});}}},
   '@/services/conversation-sync.service':{conversationSyncService:f.sync},
   '@/services/human-takeover.service':{humanTakeoverService:{processAuthenticatedOutgoing:async input=>{
    transition++;assert.equal(sent,1);assert.equal(input.responsibleId,'session-user');assert.equal(input.companyId,f.company);assert.equal(input.evolutionMessageId,'confirmed-send');
    return f.takeover.processAuthenticatedOutgoing(input);
   }}},
  },{fetch:async()=>{sent++;return Response.json(scenario==='missing-id'?{}:payload,{status:scenario==='upstream-failed'?500:200});}});
  let req;
  if(routePath.includes('send-media')){
   const form=new FormData();form.set('remoteJid',f.jid);form.set('mediatype','document');form.set('file',new File(['synthetic'],'synthetic.txt',{type:'text/plain'}));form.set('responsibleId','body-user-ignored');
   req=new Request('http://test/api/chat/send-media',{method:'POST',body:form});
  }else req=new Request('http://test/api/chat/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({remoteJid:f.jid,text:'Mensagem sintetica',responsibleId:'body-user-ignored'})});
  const response=await route.POST(req);
  assert.equal(permissionChecks,1);
  if(scenario==='success'){
   assert.equal(response.status,200);assert.equal(transition,1);assert.equal(f.attendance.state,'HUMANO');assert.equal(f.attendance.responsibleId,'session-user');
   if(!routePath.includes('send-media')){const message=[...f.rows.values()][0];assert.equal(message.authorId,'session-user');assert.equal(message.attendanceId,f.attendance.id);}
  }else{assert.notEqual(response.status,200);assert.equal(transition,0);assert.equal(f.attendance,null);}
  if(scenario==='unauthorized')assert.equal(sent,0);
 }
}
console.log('PASS: sync real sem takeover em particulares/grupos e 4 estados; idempotencia/fora de ordem; historico/autoria preservados; autoria tardia sem reabertura; escopo empresa/instancia; servicos reais de assumir/transferir/handoff/takeover preservados. Banco/Evolution simulados; nao e E2E nem banco real.');

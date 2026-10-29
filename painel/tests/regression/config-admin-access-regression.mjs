import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=new URL('../../src/',import.meta.url);
function load(file,deps={},env={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n),Buffer,console:{log(){},error(){}},process:{env}});return module.exports}
const expected=['company','companyProfile','payments','sectors','users','companySchedules','humanAttendance','agentInstructions','automaticMessages','whatsapp'];
for(const file of ['app/configuracoes/page.tsx','app/m1m-admin/companies/[companyId]/manage/page.tsx']){
 const source=ts.createSourceFile(file,fs.readFileSync(new URL(file,root),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let ids;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='sections')ids=n.initializer.elements.map(e=>e.properties.find(p=>p.name?.getText(source)==='id').initializer.text);ts.forEachChild(n,visit)}visit(source);assert.deepEqual(ids,expected);
}
const {NextRequest}=require('next/server');
const auth=load('services/admin/admin-auth.service.ts',{}, {M1M_ADMIN_KEY:'synthetic-admin-only'});
const records=new Map(['A','B'].map(id=>[id,{id,name:'Empresa '+id,agentInstructions:'instructions-'+id,outOfHoursMessage:'message-'+id,humanReturnMode:'NEXT_CONVERSATION',humanClosingMessage:'closing-'+id,aiEnabled:false}]));
const writes=[];
const prisma={m1MCompany:{findUnique:async({where})=>records.get(where.id)??null,update:async({where,data})=>{assert.ok(records.has(where.id));writes.push({id:where.id,data});Object.assign(records.get(where.id),data);return{...records.get(where.id)}}}};
const helper=load('lib/agent-instructions.ts');
const outRepo=load('repositories/out-of-hours.repository.ts',{'@/lib/prisma':{prisma}});
const out=load('services/out-of-hours.service.ts',{'@/repositories/out-of-hours.repository':outRepo});
const companyRepo=load('repositories/company.repository.ts',{'@/lib/prisma':{prisma}});
const company=load('services/company.service.ts',{'@/repositories/company.repository':companyRepo});
const deps={'@/services/admin/admin-auth.service':auth,'@/lib/prisma':{prisma},'@/lib/agent-instructions':helper,'@/services/out-of-hours.service':out,'@/services/company.service':company};
const ctx=id=>({params:Promise.resolve({companyId:id})});
const request=(path,body,mode='admin')=>new NextRequest('http://synthetic/'+path,{method:body===undefined?'GET':'PUT',headers:{...(mode==='admin'?{'x-m1m-admin-key':'synthetic-admin-only'}:mode==='cookie'?{cookie:'m1m_admin_session='+auth.adminAuthService.getSessionToken()}:mode==='tenant'?{cookie:'m1m_session=synthetic-tenant-token'}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
for(const suffix of ['agent-instructions','out-of-hours','profile']){
 const route=load('app/api/admin/companies/[companyId]/'+suffix+'/route.ts',deps);
 for(const mode of ['none','tenant']){
  const count=writes.length;assert.equal((await route.GET(request(suffix,undefined,mode),ctx('B'))).status,401);
  assert.equal((await route.PUT(request(suffix,{},mode),ctx('B'))).status,401);assert.equal(writes.length,count);
 }
 assert.equal((await route.GET(request(suffix,undefined,'cookie'),ctx('B'))).status,200);
 const beforeA=JSON.stringify(records.get('A'));
 const body=suffix==='agent-instructions'?{agentInstructions:'B-NOVO'}:suffix==='out-of-hours'?{message:'B-MENSAGEM-NOVA'}:{aiEnabled:true,humanReturnMode:'MANUAL',humanClosingMessage:'B-ENCERRAMENTO'};
 assert.equal((await route.PUT(request(suffix,body),ctx('B'))).status,200);
 assert.equal(JSON.stringify(records.get('A')),beforeA,'Nao alterar empresa A administrando B');
 assert.equal(writes.at(-1).id,'B');
 const r=await(await route.GET(request(suffix,undefined,'cookie'),ctx('B'))).json();
 if(suffix==='agent-instructions')assert.equal(r.agentInstructions,'B-NOVO');
 if(suffix==='out-of-hours')assert.equal(r.message,'B-MENSAGEM-NOVA');
 if(suffix==='profile'){assert.equal(r.aiEnabled,true);assert.equal(r.humanReturnMode,'MANUAL');}
 if(suffix==='profile'){
  assert.equal((await route.PUT(request(suffix,{companyId:'A',aiEnabled:false}),ctx('B'))).status,200);
  assert.equal(writes.at(-1).id,'B');assert.equal(JSON.stringify(records.get('A')),beforeA);
 }
 if(suffix!=='profile'){
  const count=writes.length;assert.equal((await route.PUT(request(suffix,{...body,companyId:'A'}),ctx('B'))).status,400);assert.equal(writes.length,count);
 }
}
assert.equal(records.get('A').aiEnabled,false);assert.equal(records.get('A').humanReturnMode,'NEXT_CONVERSATION');
console.log('PASS: ordem real dos dez cartoes nas duas areas; autenticacao administrativa real por cookie/header; sessao cliente/anonimo recusados; formularios usam campos/servicos existentes; GET/PUT/releitura apenas da empresa selecionada. PG e HTTP do teste simulados; nao comprova navegador.');

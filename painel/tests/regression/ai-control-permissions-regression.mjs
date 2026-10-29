import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=new URL('../../src/',import.meta.url);
function load(file,deps={},env={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n),Buffer,console:{log(){},error(){}},process:{env}});return module.exports}
const {NextRequest}=require('next/server'),enums=load('generated/prisma/enums.ts');
let authenticated=true,user={id:'synthetic-user',companyId:'A',active:true,role:'ADMIN',isPrimary:false,useCustomPermissions:false,permissions:[]};
const tenant={getAuthenticatedSession:async()=>{if(!authenticated)throw Error('Sem sessao');return{companyId:user.companyId,userId:user.id}},getAuthenticatedCompanyId:async()=>{if(!authenticated)throw Error('Sem sessao');return user.companyId}};
const authorization=load('services/auth/authorization.service.ts',{'@/generated/prisma/enums':enums,'@/lib/tenant':tenant,'@/repositories/user.repository':{userRepository:{findById:async(c,id)=>authenticated&&c===user.companyId&&id===user.id?user:null}}});
const records=new Map([['A',{id:'A',aiEnabled:false}],['B',{id:'B',aiEnabled:true}]]);let writes=0;
const prisma={m1MCompany:{findUnique:async({where})=>records.get(where.id),update:async({where,data})=>{writes++;Object.assign(records.get(where.id),data);return{...records.get(where.id)}}}};
const repo=load('repositories/company.repository.ts',{'@/lib/prisma':{prisma}});
const service=load('services/company.service.ts',{'@/repositories/company.repository':repo});
const admin=load('services/admin/admin-auth.service.ts',{}, {M1M_ADMIN_KEY:'synthetic-admin'});
const own=load('app/api/company/route.ts',{'@/generated/prisma/enums':enums,'@/services/auth/authorization.service':authorization,'@/lib/tenant':tenant,'@/services/company.service':service});
const global=load('app/api/admin/companies/[companyId]/profile/route.ts',{'@/services/admin/admin-auth.service':admin,'@/services/company.service':service});
const request=(body,headers={})=>new NextRequest('http://synthetic/api/company',{method:'PUT',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
for(const value of [true,false]){assert.equal((await own.PUT(request({aiEnabled:value,companyId:'B'}))).status,200);assert.equal(records.get('A').aiEnabled,value);assert.equal(records.get('B').aiEnabled,true)}
for(const role of ['ATTENDANT','MANAGER','FINANCE']){user={...user,role,useCustomPermissions:true,permissions:['ACCESS_SETTINGS']};const count=writes;assert.equal((await own.PUT(request({aiEnabled:true}))).status,403);assert.equal(writes,count)}
user={...user,role:'ADMIN',useCustomPermissions:false,permissions:[]};authenticated=false;const count=writes;assert.notEqual((await own.PUT(request({aiEnabled:true}))).status,200);assert.equal(writes,count);authenticated=true;
const context={params:Promise.resolve({companyId:'B'})};
assert.equal((await global.PUT(request({aiEnabled:false},{cookie:'m1m_session=ordinary-tenant'}),context)).status,401);assert.equal(records.get('B').aiEnabled,true);
for(const value of [false,true]){const a=records.get('A').aiEnabled;const response=await global.PUT(request({aiEnabled:value,companyId:'A'},{cookie:'m1m_admin_session='+admin.adminAuthService.getSessionToken()}),context);assert.equal(response.status,200);assert.equal(records.get('B').aiEnabled,value);assert.equal(records.get('A').aiEnabled,a)}
const dashboard=fs.readFileSync(new URL('components/dashboard/DashboardOperacional.tsx',root),'utf8');assert.ok(!dashboard.includes('CompanyAiControl'));
console.log('PASS: administrador local altera somente propria empresa; atendente/gerente/financeiro recusados mesmo com ACCESS_SETTINGS (403); sem sessao sem escrita; admin global por cookie real altera somente empresa da URL; sessao comum nao autoriza endpoint global; Dashboard compartilhado sem controle. Persistencia/sessao HTTP simuladas, servicos/autorizacao/rotas reais.');

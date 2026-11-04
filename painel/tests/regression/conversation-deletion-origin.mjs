import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
function compile(source,imports={}) {
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',js)(name=>{if(name in imports)return imports[name];throw Error('Unexpected dependency: '+name)},module,module.exports);return module.exports;
}
const originSource=fs.readFileSync(new URL('../../src/services/conversation-deletion-origin.ts',import.meta.url),'utf8');
const {deletionRequestOriginAllowed:allowed}=compile(originSource);
const publicOrigin='https://synthetic.example',internal='http://localhost:3000';
const env={NODE_ENV:'production',M1M_CONVERSATION_DELETION_ORIGIN:publicOrigin};
function request(origin,body={},selected=''){
 return {headers:new Headers({...origin===null?{}:{origin},'x-forwarded-host':'attacker.example','x-forwarded-proto':'https'}),nextUrl:{origin:internal,searchParams:new URLSearchParams(selected)},cookies:{get:()=>({value:'synthetic-session'})},json:async()=>body};
}
assert.equal(allowed(request(publicOrigin),env),true);
for(const source of ['https://attacker.example','null',publicOrigin+'/path',publicOrigin+':8443','http://synthetic.example'])assert.equal(allowed(request(source),env),false);
assert.equal(allowed(request(publicOrigin),{NODE_ENV:'production'}),false);
assert.equal(allowed(request(publicOrigin),{...env,M1M_CONVERSATION_DELETION_ORIGIN:'invalid',M1M_PUBLIC_URL:publicOrigin,APP_URL:publicOrigin}),false);
assert.equal(allowed(request(publicOrigin),{NODE_ENV:'production',M1M_PUBLIC_URL:publicOrigin,APP_URL:publicOrigin}),false);
assert.equal(allowed(request(publicOrigin),{...env,M1M_PUBLIC_URL:'https://webhook.example',APP_URL:'https://other.example'}),true);
for(const configured of [publicOrigin+'/app',publicOrigin+'/',publicOrigin+'?x=1','null','*'])assert.equal(allowed(request(publicOrigin),{...env,M1M_CONVERSATION_DELETION_ORIGIN:configured}),false);
assert.equal(allowed(request(publicOrigin),{...env,M1M_CONVERSATION_DELETION_ORIGIN:'https://user:pass@synthetic.example'}),false);
assert.equal(allowed(request(internal),{NODE_ENV:'test'}),true);
assert.equal(allowed(request(null),env),true); // Existing non-browser behavior unchanged.
class AuthorizationError extends Error{}
class ConversationDeletionError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status;}}
let companyId='A',permission=true,authenticated=true,prepared=[];
const service={deletionStorageAvailable:async()=>true,deletionProtectionRequired:async()=>true,newConversationDeletionAllowed:async(c,i)=>c==='A'&&i==='instance-A',resolveDeletionScope:async(c,i,j)=>({scope:{companyId:c,instanceName:i,remoteJid:j},aliases:[j],customer:{id:'customer-A',name:'Synthetic'}}),conversationDeletionRepository:{prepare:async data=>{prepared.push(data);return {id:'preview-synthetic',version:1,state:'PREVIEW',messageCount:1};}}};
const imports={
 'next/server':{NextResponse:{json:(data,options={})=>({status:options.status??200,data})}},
 '@/services/conversation-deletion-origin':{deletionRequestOriginAllowed:r=>allowed(r,env)},
 '@/services/auth/session.service':{sessionService:{verifyToken:async()=>{if(!authenticated)throw Error();}}},
 '@/services/auth/authorization.service':{AuthorizationError,authorizationService:{getCurrentUser:async()=>({companyId,userId:'synthetic-admin',role:'ADMIN',isPrimary:true,permissions:permission?['DELETE_CONVERSATIONS']:[]}),hasPermission:()=>true}},
 '@/services/admin/admin-auth.service':{adminAuthService:{isAuthorizedRequest:()=>false}},
 '@/lib/prisma':{prisma:{m1MCompany:{findUnique:async({where})=>({id:where.id,name:'Synthetic',whatsappInstanceName:'instance-'+where.id})},$queryRaw:async()=>[{count:0n}]}},
 '@/services/conversation-deletion.service':service,
 '@/services/conversation-deletion.repository':{ConversationDeletionError},
};
const source=fs.readFileSync(new URL('../../src/app/api/conversation-deletions/route.ts',import.meta.url),'utf8');
// Reproduce old actual route against a public browser Origin and internal Next URL.
const old=source.replace('if(!deletionRequestOriginAllowed(request))throw new AuthorizationError();',"const origin=request.headers.get('origin');if(origin&&origin!==request.nextUrl.origin)throw new AuthorizationError();");
const baseline=compile(old,imports),route=compile(source,imports);
assert.equal((await baseline.GET(request(publicOrigin))).data.canDelete,true);
assert.equal((await baseline.POST(request(publicOrigin))).status,403);
assert.equal((await route.POST(request(publicOrigin))).status,400); // Reaches body validation, no write.
const body={action:'prepare',requestKey:'synthetic-key',remoteJid:'synthetic@s.whatsapp.net'};
assert.equal((await route.POST(request(publicOrigin,body))).status,200);
assert.equal(prepared.length,1);assert.equal(prepared[0].companyId,'A');assert.equal(prepared[0].instanceName,'instance-A');
assert.equal((await route.POST(request('https://attacker.example',body))).status,403);
permission=false;assert.equal((await route.POST(request(publicOrigin,body))).status,403);
permission=true;companyId='B';assert.equal((await route.POST(request(publicOrigin,body))).status,403);
companyId='A';assert.equal((await route.POST(request(publicOrigin,body,'companyId=B'))).status,403);
authenticated=false;assert.equal((await route.POST(request(publicOrigin,body))).status,401);
assert.equal(prepared.length,1);
console.log('PASSED: old route GET200/POST403 reproduced; fixed legitimate origin accepted; external/forged-forwarded origin denied; permission, session, company and selected-admin isolation preserved. Synthetic route dependencies; no real DB, browser or deletion.');

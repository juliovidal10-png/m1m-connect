import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=new URL('../../src/',import.meta.url);
function load(file,deps={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(new URL(file,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:n=>n in deps?deps[n]:require(n),console,process});return module.exports}
const helper=load('lib/agent-instructions.ts');
assert.equal(helper.normalizeAgentInstructions('  teste  '),'teste');assert.equal(helper.normalizeAgentInstructions('   '),null);assert.equal(helper.normalizeAgentInstructions(null),null);
for(const bad of [undefined,[],{},true,44,'x'.repeat(20001)])assert.throws(()=>helper.normalizeAgentInstructions(bad));
let tenant='A',allowed=true;const records=new Map([['A',{agentInstructions:null}],['B',{agentInstructions:'SOMENTE_EMPRESA_B'}]]);let writes=0;
const enums=load('generated/prisma/enums.ts');
const authorization=load('services/auth/authorization.service.ts',{
 '@/generated/prisma/enums':enums,
 '@/lib/tenant':{getAuthenticatedSession:async()=>({companyId:tenant,userId:'synthetic-user'})},
 '@/repositories/user.repository':{userRepository:{findById:async(companyId)=>({id:'synthetic-user',companyId,active:true,role:allowed?'ADMIN':'ATTENDANT',isPrimary:false,permissions:[]})}},
});
const route=load('app/api/agent-instructions/route.ts',{'@/lib/prisma':{prisma:{m1MCompany:{findUnique:async({where})=>records.get(where.id),update:async({where,data})=>{writes++;assert.equal(where.id,tenant);records.set(where.id,{...data});return records.get(where.id)}}}},'@/lib/agent-instructions':helper,'@/services/auth/authorization.service':authorization});
const put=body=>route.PUT(new Request('http://isolated/api/agent-instructions',{method:'PUT',body:JSON.stringify(body)}));
assert.equal((await put({agentInstructions:'RESPOSTA_EMPRESA_A_V1'})).status,200);
assert.equal((await(await route.GET()).json()).agentInstructions,'RESPOSTA_EMPRESA_A_V1'); // read again simulates reload, not a browser F5
assert.equal((await put({companyId:'B',agentInstructions:'invasao'})).status,400);
assert.equal(records.get('B').agentInstructions,'SOMENTE_EMPRESA_B');
for(const body of [{},null,[],{agentInstructions:32},{agentInstructions:'x'.repeat(20001)}])assert.equal((await put(body)).status,400);
allowed=false;const before=writes;assert.equal((await route.GET()).status,403);assert.equal((await put({agentInstructions:'bloqueado'})).status,403);assert.equal(writes,before);allowed=true;
const deps={
 '@/services/company.service':{companyService:{getCompanyProfile:async id=>({id,name:'Empresa '+id,...records.get(id)})}},
 '@/services/company-profile.service':{companyProfileService:{getCompanyProfile:async()=>null}},
 '@/services/company-schedule.service':{companyScheduleService:{getSchedules:async()=>({schedules:[]})}},
 '@/services/payment-settings.service':{paymentSettingsService:{getPaymentSettings:async()=>null}},
 '@/services/sector.service':{sectorService:{getSector:async(c,id)=>({id,name:'Comercial',active:true})}},
 '@/services/sector-user.service':{sectorUserService:{getSectorUsers:async()=>({users:[]})}},
 '@/services/sector-schedule.service':{sectorScheduleService:{getSchedules:async()=>({source:'COMPANY',schedules:[]})}},
};
const company=load('services/company-context-builder.service.ts',deps).companyContextBuilderService;
const sector=load('core/context/context-builder.service.ts',deps).contextBuilderService;
const promptDeps={'@/lib/agent-instructions':helper,'@/core/ai/knowledge-retrieval.service':{retrieveKnowledgeEvidence:()=>''}};
const cp=load('services/company-prompt-builder.service.ts',promptDeps).companyPromptBuilderService;
const sp=load('core/ai/prompt-builder.service.ts',promptDeps).promptBuilderService;
async function check(id,token,absent){for(const [context,builder]of [[await company.buildCompanyContext(id),cp],[await sector.buildSectorContext(id,'sector'),sp]]){const p=builder.build({context,customerMessage:'Como funciona?'});assert.ok(p.systemPrompt.includes(token));assert.ok(p.outputGuidance.includes(token));assert.ok(!p.authorizedContext.includes(token));if(absent)assert.ok(!p.systemPrompt.includes(absent))}}
await check('A','RESPOSTA_EMPRESA_A_V1','SOMENTE_EMPRESA_B');
await put({agentInstructions:'RESPOSTA_EMPRESA_A_V2'});await check('A','RESPOSTA_EMPRESA_A_V2','RESPOSTA_EMPRESA_A_V1');
tenant='B';assert.equal((await(await route.GET()).json()).agentInstructions,'SOMENTE_EMPRESA_B');
await put({agentInstructions:'EMPRESA_B_V2'});await check('B','EMPRESA_B_V2','RESPOSTA_EMPRESA_A_V2');
tenant='A';await check('A','RESPOSTA_EMPRESA_A_V2','EMPRESA_B_V2');
await put({agentInstructions:''});assert.equal((await(await route.GET()).json()).agentInstructions,null);
console.log('PASS: validacao, API real com sessao/PG simulados, releitura, isolamento A/B, permissao, dois contextos e prompts reais, atualizacao seguinte, limpeza e separacao de fatos. Sem browser, PostgreSQL ou chamada OpenAI reais.');

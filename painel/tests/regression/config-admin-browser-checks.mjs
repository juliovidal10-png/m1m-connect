import assert from 'node:assert/strict';
const titles=['Empresa','Conhecimento da Empresa','Pagamentos','Setores','Usuários e Permissões','Horário Geral','Atendimento Humano','Agente de IA','Mensagens Automáticas','WhatsApp'];
async function gridCheck(page,admin,width){
 await page.setViewportSize({width,height:900});
 const grid=page.locator(admin?'div.grid:has(> button > p)':'div.grid:has(> button > div > h3)');
 const cards=grid.locator(':scope > button');await cards.last().waitFor();assert.equal(await cards.count(),10);
 const names=await cards.evaluateAll((nodes,isAdmin)=>nodes.map(n=>n.querySelector(isAdmin?'p':'h3').textContent.trim()),admin);
 assert.deepEqual(names,titles);
 const cols=await grid.evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length);
 assert.equal(cols,width<600?1:admin?2:3);
 const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,width:r.width}}));
 for(const b of boxes){assert.ok(b.x>=0&&b.right<=width+1,'Cartao deve caber no viewport')}
 await cards.nth(0).focus();
 for(let i=0;i<10;i++){assert.ok(await cards.nth(i).evaluate(n=>n===document.activeElement),'Ordem de Tab deve seguir ordem dos cartoes');if(i<9)await page.keyboard.press('Tab')}
}
async function clickSave(page,base,path,label){
 const pending=page.waitForResponse(r=>r.url()===base+path&&r.request().method()==='PUT');
 await page.getByRole('button',{name:label,exact:true}).click();assert.equal((await pending).status(),200);
}
export async function runConfigAdminBrowserChecks({browser,db,base,a,b,ids,pass,adminKey}){
 assert.ok(adminKey,'Exige chave administrativa sintetica no processo do teste');
 await a.page.goto(base+'/configuracoes');await gridCheck(a.page,false,1440);await gridCheck(a.page,false,390);pass('Central: dez cartoes na ordem aprovada, tres colunas desktop/uma mobile e ordem de Tab');
 await a.page.setViewportSize({width:1440,height:900});
 const ctx=await browser.newContext();await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 let page=await ctx.newPage();page.setDefaultTimeout(60000);
 const manage=id=>base+'/m1m-admin/companies/'+id+'/manage';
 const api=(id,suffix)=>'/api/admin/companies/'+id+'/'+suffix;
 const sql=id=>db.query('SELECT "aiEnabled","humanReturnMode","humanClosingMessage","agentInstructions","outOfHoursMessage" FROM m1m_companies WHERE id=$1',[id]).then(r=>r.rows[0]);
 const beforeB=await sql(ids.B);
 for(const suffix of ['profile','agent-instructions','out-of-hours']){
  for(const c of [ctx,b.context]){assert.equal((await c.request.get(base+api(ids.A,suffix))).status(),401);assert.equal((await c.request.put(base+api(ids.A,suffix),{data:{}})).status(),401)}
 }
 await page.goto(manage(ids.A));await page.getByText('Acesso administrativo não autorizado.',{exact:true}).waitFor();pass('Gerenciamento e tres endpoints negam anonimo e sessao comum de cliente');
 // Prepare a rota no servidor antes de abrir um documento novo no runner de desenvolvimento.
 assert.equal((await ctx.request.get(base+'/m1m-admin')).status(),200);
 await page.close();page=await ctx.newPage();page.setDefaultTimeout(60000);
 await page.goto(base+'/m1m-admin',{waitUntil:'domcontentloaded'});await page.getByLabel('Chave administrativa',{exact:true}).fill(adminKey);
 const login=page.waitForResponse(r=>r.url()===base+'/api/admin/session'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Entrar no M1M Admin',exact:true}).click();assert.equal((await login).status(),200);
 assert.equal((await ctx.cookies()).some(c=>c.name==='m1m_session'),false,'Nao exigir login do cliente');
 await page.goto(manage(ids.A));await page.getByText('Marketing1Minuto',{exact:true}).waitFor();
 await gridCheck(page,true,1440);await gridCheck(page,true,390);await page.setViewportSize({width:1440,height:900});pass('M1M Admin: login real sem conta do cliente; dez cartoes ordenados em duas colunas/uma mobile e Tab');
 const destinations=['profile','company-profile','payment-settings','sectors','users','schedules','profile','agent-instructions','out-of-hours','whatsapp/status'];
 for(let i=0;i<titles.length;i++){
  const pending=page.waitForResponse(r=>r.url().split('?')[0]===base+api(ids.A,destinations[i])&&r.request().method()==='GET');
  await page.getByRole('button',{name:new RegExp('^'+titles[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  const response=await pending;if(i!==9)assert.equal(response.status(),200); // WhatsApp sem credencial externa: apenas navegacao, sem conexao.
  await page.getByText('Marketing1Minuto',{exact:true}).waitFor();
  await page.getByRole('button',{name:/^← Voltar/}).click();assert.equal(page.url(),manage(ids.A));
 }
 pass('Dez destinos administrativos abrem endpoint da empresa selecionada e retornam ao mesmo gerenciamento; WhatsApp sem conectar');
 // Mesmo browser com sessao de cliente B: M1M Admin continua editando A pelo companyId da rota.
 await ctx.addCookies((await b.context.cookies()).filter(c=>c.name==='m1m_session'));
 await page.getByRole('button',{name:/^Atendimento Humano/}).click();
 const ai=page.getByRole('button',{name:'Ligar IA',exact:true});await ai.waitFor();
 await clickSave(page,base,api(ids.A,'profile'),'Ligar IA');assert.equal((await sql(ids.A)).aiEnabled,true);assert.deepEqual(await sql(ids.B),beforeB);
 await clickSave(page,base,api(ids.A,'profile'),'Pausar IA');assert.equal((await sql(ids.A)).aiEnabled,false);
 await page.locator('input[value="MANUAL"]').check();await page.locator('textarea').fill('Encerramento sintetico administrativo.');
 await clickSave(page,base,api(ids.A,'profile'),'Salvar configurações');
 await page.reload();await page.getByRole('button',{name:/^Atendimento Humano/}).click();await page.locator('input[value="MANUAL"]:checked').waitFor();assert.equal(await page.locator('textarea').inputValue(),'Encerramento sintetico administrativo.');
 await page.getByRole('button',{name:/^← Voltar/}).click();pass('IA liga/pausa e politica de retorno persistem somente em empresa-teste, mesmo com sessao cliente de outra empresa');
 await page.getByRole('button',{name:/^Agente de IA/}).click();await page.getByLabel('Instrução do agente',{exact:true}).fill('Instrucao administrativa somente A.');
 await clickSave(page,base,api(ids.A,'agent-instructions'),'Salvar instrução');
 await page.reload();await page.getByRole('button',{name:/^Agente de IA/}).click();await page.waitForFunction(()=>document.querySelector('#agent-instructions')?.value==='Instrucao administrativa somente A.');
 await page.getByRole('button',{name:/^← Voltar/}).click();pass('Instrucao administrativa salva, persiste apos F5 e retorna a empresa-teste');
 await page.getByRole('button',{name:/^Mensagens Automáticas/}).click();await page.locator('textarea').fill('Mensagem automatica administrativa somente A.');
 await clickSave(page,base,api(ids.A,'out-of-hours'),'Salvar mensagem');
 await page.reload();await page.getByRole('button',{name:/^Mensagens Automáticas/}).click();await page.waitForFunction(()=>document.querySelector('textarea')?.value==='Mensagem automatica administrativa somente A.');
 await page.getByRole('button',{name:/^← Voltar/}).click();assert.deepEqual(await sql(ids.B),beforeB);pass('Mensagem automatica administrativa persiste apos F5, retorno preservado e empresa B inalterada');
 await page.goto(manage(ids.B));await page.getByRole('button',{name:/^Agente de IA/}).click();await page.waitForFunction(()=>document.querySelector('#agent-instructions')?.value==='INSTRUCAO_B: atendimento sintetico B.');
 await page.getByRole('button',{name:/^← Voltar/}).click();assert.equal(page.url(),manage(ids.B));
 await page.goto(manage(ids.A));await page.getByRole('button',{name:/^Agente de IA/}).click();await page.waitForFunction(()=>document.querySelector('#agent-instructions')?.value==='Instrucao administrativa somente A.');
 pass('Troca de empresa remonta formularios e nao exibe nem salva valores da empresa anterior');
 await ctx.close();
}

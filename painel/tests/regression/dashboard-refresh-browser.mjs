// Real React/Chromium rendering; network, visibility and polling triggers are controlled.
// This measures component display under equal injected delay, not production/API/SQL speed.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {compile} from '@tailwindcss/node';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url),root=process.cwd();
const component='src/components/dashboard/DashboardOperacional.tsx';
const current=await fs.readFile(component,'utf8');
const baseline=execFileSync('git',['show','636d0e0a86ef1226cf41aecbfa01744a46074b39:painel/'+component],{encoding:'utf8'});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'m1m-dashboard-'));
let browser;
try{
 const compiler=await compile('@import "tailwindcss";',{base:root,onDependency:()=>{}});
 const css=compiler.build((current+' '+baseline).match(/[^\s"'`<>]+/g));
 browser=await chromium.launch({headless:true});const rows=[];
 for(const [version,source] of [['before',baseline],['after',current]]){
  const componentFile=path.join(temp,version+'.tsx');await fs.writeFile(componentFile,source);
  const entry=path.join(temp,'entry.jsx');
  await fs.writeFile(entry,`import React from ${JSON.stringify(require.resolve('react'))};import{createRoot}from ${JSON.stringify(require.resolve('react-dom/client'))};import Dashboard from ${JSON.stringify(componentFile)};const root=createRoot(document.getElementById('root'));window.mount=()=>{window.mountedAt=performance.now();root.render(<Dashboard/>)};window.unmount=()=>root.unmount();`);
  const js=(await build({entryPoints:[entry],bundle:true,write:false,jsx:'automatic',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-next-link',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'isolated-link'}));b.onLoad({filter:/.*/,namespace:'isolated-link'},()=>({contents:'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>}',loader:'jsx',resolveDir:root}))}}]})).outputFiles[0].text;
  for(const polling of [false,true]) for(let iteration=1;iteration<=3;iteration++){
   const page=await browser.newPage();await page.route('**/*',r=>r.abort());
   await page.setContent(`<style>${css}body{margin:0;font-family:Arial,sans-serif}</style><div id="root"></div>`);
   await page.evaluate(polling=>{
    window.requests=[];window.testHidden=false;window.fail=false;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});
    const originalInterval=window.setInterval;window.setInterval=(f,ms)=>{if(ms===30000)window.poll=polling?f:()=>{};return polling?originalInterval(f,ms):0};
    window.fetch=(endpoint,options={})=>new Promise((resolve,reject)=>{
     const row={endpoint,started:performance.now(),aborted:false};window.requests.push(row);
     const failed=window.fail;const bodies={'/api/customers':[{id:'A',status:'IA'},{id:'B',status:'HUMANO'}],'/api/reminders':[], '/api/payment-receipts':[], '/api/company/access-status':{}};
     const timer=setTimeout(()=>{row.finished=performance.now();resolve({ok:!(failed&&endpoint==='/api/customers'),json:async()=>failed&&endpoint==='/api/customers'?{error:'Erro controlado'}:bodies[endpoint]})},endpoint==='/api/customers'?600:20);
     options.signal?.addEventListener('abort',()=>{row.aborted=true;clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))},{once:true});
    });
   },polling);
   await page.addScriptTag({content:js});
   await page.evaluate(()=>window.mount());
   await page.waitForFunction(()=>typeof window.poll==='function');
   await page.evaluate(()=>window.poll());
   const heading=page.getByRole('heading',{name:'Dashboard Operacional',exact:true});await heading.waitFor();
   const shellMs=await page.evaluate(()=>performance.now()-window.mountedAt);
   await page.getByText('Clientes cadastrados na empresa.',{exact:true}).waitFor();
   const indicatorsMs=await page.evaluate(()=>performance.now()-window.mountedAt);
   rows.push({version,polling,iteration,initialRequests:await page.evaluate(()=>window.requests.length),shellMs:Math.round(shellMs),indicatorsMs:Math.round(indicatorsMs),injectedCustomerDelayMs:600});
   if(version==='after'){
    assert(shellMs<indicatorsMs,'Structure precedes indicators');
    await page.getByRole('button',{name:'Atualizar',exact:true}).click();
    await page.getByRole('button',{name:'Atualizando…',exact:true}).waitFor();
    assert(await heading.isVisible());assert(await page.getByText('Clientes cadastrados na empresa.',{exact:true}).isVisible());
    await page.evaluate(()=>window.poll());assert.equal(await page.evaluate(()=>window.requests.length),8,'Polling cannot overlap manual request');
    await page.evaluate(()=>{window.testHidden=true;document.dispatchEvent(new Event('visibilitychange'))});
    assert(await page.evaluate(()=>window.requests.slice(4).every(r=>r.aborted)));
    await page.evaluate(()=>window.poll());assert.equal(await page.evaluate(()=>window.requests.length),8,'Hidden page does not request');
    await page.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
    await page.getByRole('button',{name:'Atualizar',exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('button')?.textContent==='Atualizar');
    await page.evaluate(()=>window.fail=true);await page.getByRole('button',{name:'Atualizar',exact:true}).click();
    await page.getByText(/Os indicadores exibidos estão desatualizados/).waitFor();
    assert(await page.getByText('Clientes cadastrados na empresa.',{exact:true}).isVisible());
    await page.evaluate(()=>window.fail=false);await page.getByRole('button',{name:'Atualizar',exact:true}).click();
    const before=await page.evaluate(()=>window.requests.length);await page.evaluate(()=>window.unmount());
    assert(await page.evaluate(()=>window.requests.slice(-4).every(r=>r.aborted)));
    await page.evaluate(()=>window.poll());assert.equal(await page.evaluate(()=>window.requests.length),before,'Even a stale callback cannot start requests after unmount');
   }else assert(shellMs>=550,'Old structure waits for controlled customer request');
   await page.close();
  }
 }
 console.log(JSON.stringify({operation:'DASHBOARD_COMPONENT_BEFORE_AFTER',browserReal:true,networkSimulated:true,databaseUsed:false,rows},null,2));
 console.log('PASS: structure before data, existing indicators retained on refresh, manual/poll no overlap, hidden abort/suspend, resume, stale error and unmount cancellation. Component test, not authenticated full application or production speed.');
}finally{if(browser)await browser.close();await fs.rm(temp,{recursive:true,force:true})}

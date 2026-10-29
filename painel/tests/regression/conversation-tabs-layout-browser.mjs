// Layout only: real component and Chromium, synthetic counts, no application/API/database.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {compile} from '@tailwindcss/node';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url),root=process.cwd();
const component=path.join(root,'src/components/chat/ChatConversationSidebar.tsx');
const source=await fs.readFile(component,'utf8');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'m1m-tabs-'));
let browser;
try {
 const entry=path.join(temp,'entry.jsx');
 await fs.writeFile(entry,`import React,{useState} from ${JSON.stringify(require.resolve('react'))};import{createRoot}from ${JSON.stringify(require.resolve('react-dom/client'))};import Sidebar from ${JSON.stringify(component)};function App(){const[q,setQ]=useState('OPEN');const[count,setCount]=useState(1);window.setCount=setCount;return <Sidebar activeQueue={q} onQueueChange={v=>{window.lastQueue=v;setQ(v)}} queueCounts={{waiting:count,inService:count}} searchQuery="" onSearchChange={()=>{}} isLoading={false} hasLoaded={true} error={null} isLoadingMore={false} hasMore={false} onLoadMore={()=>{}} items={[]}/>};createRoot(document.getElementById('root')).render(<App/>);`);
 const js=(await build({entryPoints:[entry],bundle:true,write:false,jsx:'automatic',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"'}})).outputFiles[0].text;
 const compiler=await compile('@import "tailwindcss";',{base:root,onDependency:()=>{}});
 const css=compiler.build(source.match(/[^\s"'`<>]+/g));
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.route('**/*',route=>route.abort());
 let scenarios=0;
 for(const [viewport,column] of [[1440,320],[1024,288],[390,390],[320,320],[280,280]]){
  await page.setViewportSize({width:viewport,height:800});
  await page.setContent(`<style>${css}body{margin:0;font-family:Arial,sans-serif}#root{width:${column}px;height:800px}</style><div id="root"></div>`);
  await page.addScriptTag({content:js});
  for(const count of [1,17,156]){
   await page.evaluate(n=>window.setCount(n),count);
   await page.getByRole('button',{name:`Aguardando (${count})`,exact:true}).waitFor();
   for(const [name,queue] of [['Abertas','OPEN'],[`Aguardando (${count})`,'WAITING'],[`Em atendimento (${count})`,'IN_SERVICE']]){
    await page.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(q=>window.lastQueue===q,queue);
    await page.waitForFunction(n=>[...document.querySelectorAll('button')].find(b=>b.textContent===n)&&getComputedStyle([...document.querySelectorAll('button')].find(b=>b.textContent===n)).color==='rgb(10, 144, 144)',name);
    const result=await page.locator('button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect(),p=b.parentElement.getBoundingClientRect(),s=getComputedStyle(b);return {name:b.textContent,inside:r.left>=p.left&&r.right<=p.right+1,overflow:b.scrollWidth>b.clientWidth+1,font:parseFloat(s.fontSize),selected:s.color==='rgb(10, 144, 144)',box:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}}));
    assert.equal(result.length,3);assert(result.every(b=>b.inside&&!b.overflow&&b.font>=12),JSON.stringify(result));
    assert.equal(result.filter(b=>b.selected).length,1);assert.equal(result.find(b=>b.selected).name,name);
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){const x=result[a].box,y=result[b].box;assert(x.right<=y.x+1||y.right<=x.x+1||x.bottom<=y.y+1||y.bottom<=x.y+1,'Abas sobrepostas')}
    scenarios++;
   }
  }
 }
 console.log(`PASS: ${scenarios} cenarios Chromium, componente React real e CSS Tailwind real; 5 larguras, 3 contagens, 3 selecoes; texto completo, fonte >=12px, sem corte/sobreposicao e callbacks preservados. Sem APIs ou dados reais. Teste de layout, nao ChatInbox completo.`);
} finally {if(browser)await browser.close();await fs.rm(temp,{recursive:true,force:true})}

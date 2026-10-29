// Real Dashboard component with controlled React hooks, network and timers. No database/browser.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const path='src/components/dashboard/DashboardOperacional.tsx';
const current=fs.readFileSync(path,'utf8');
const baseline=execFileSync('git',['show',(process.env.M1M_DASHBOARD_BASELINE_REF || '636d0e0a86ef1226cf41aecbfa01744a46074b39')+':painel/'+path],{encoding:'utf8'});
function harness(source){
 const hooks=[],effects=[],timers=new Map(),events=new Map(),requests=[];let index=0,timerId=0;
 const document={hidden:false,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const window={setInterval:f=>{timers.set(++timerId,f);return timerId},clearInterval:id=>timers.delete(id)};
 const react={useState(initial){const i=index++;hooks[i]??={value:typeof initial==='function'?initial():initial};return[hooks[i].value,v=>hooks[i].value=typeof v==='function'?v(hooks[i].value):v]},useRef(initial){const i=index++;hooks[i]??={current:initial};return hooks[i]},useMemo(f){index++;return f()},useCallback(f){const i=index++;hooks[i]??=f;return hooks[i]},useEffect(f){const i=index++;if(!hooks[i]){hooks[i]=true;effects.push(f)}}};
 const fetch=(url,options={})=>new Promise(resolve=>requests.push({url,signal:options.signal,resolve:(body=[],ok=true)=>resolve({ok,json:async()=>body})}));
 const module={exports:{}};
 const context={module,exports:module.exports,require:n=>n==='react'?react:n==='react/jsx-runtime'?jsx:n==='next/link'?{default:({children})=>children}:null,document,window,fetch,AbortController,Date,console};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 let tree;const render=()=>{index=0;tree=module.exports.default();return tree};
 function flatten(n){if(n==null||typeof n==='boolean')return'';if(typeof n!=='object')return String(n);if(Array.isArray(n))return n.map(flatten).join(' ');if(typeof n.type==='function')return flatten(n.type(n.props));return flatten(n.props?.children)}
 function find(n,predicate){if(!n||typeof n!=='object')return null;if(Array.isArray(n))return n.map(v=>find(v,predicate)).find(Boolean);if(predicate(n))return n;return find(n.props?.children,predicate)}
 const text=()=>flatten(render());const manual=()=>find(render(),n=>n.type==='button'&&flatten(n).includes('Atualiz')).props.onClick();
 return{requests,timers,events,render,text,manual,mount(){render();return effects.map(f=>f())},hide(value){document.hidden=value;events.get('visibilitychange')?.()},tick(){for(const f of [...timers.values()])f()}};
}
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r))};
const bodies={ '/api/customers':[{id:'A',status:'IA'},{id:'B',status:'HUMANO'}],'/api/reminders':[], '/api/payment-receipts':[], '/api/company/access-status':{} };
const finish=requests=>requests.forEach(r=>r.resolve(bodies[r.url]));
const old=harness(baseline);const oldCleanup=old.mount();assert(!old.text().includes('Dashboard Operacional'));finish(old.requests);await flush();assert(old.text().includes('Dashboard Operacional'));oldCleanup.forEach(f=>f?.());
const h=harness(current);const cleanup=h.mount();assert(h.text().includes('Dashboard Operacional'));assert(h.text().includes('Carregando indicadores'));assert(!h.text().includes('Clientes cadastrados na empresa.'));
assert.equal(h.requests.length,4);h.manual();h.tick();assert.equal(h.requests.length,4,'No overlap while pending');finish(h.requests);await flush();assert(h.text().includes('Clientes cadastrados na empresa.'));
h.manual();assert.equal(h.requests.length,8);assert(h.text().includes('Clientes cadastrados na empresa.'));assert(h.text().includes('Atualizando'));h.requests.slice(4).forEach(r=>r.resolve(r.url==='/api/customers'?{error:'Falha controlada'}:bodies[r.url],r.url!=='/api/customers'));await flush();assert(h.text().includes('desatualizados'));assert(h.text().includes('Última atualização válida'));
h.manual();const obsolete=h.requests.slice(8);h.hide(true);assert(obsolete.every(r=>r.signal.aborted));assert.equal(h.timers.size,0);h.tick();assert.equal(h.requests.length,12);h.hide(false);const fresh=h.requests.slice(12);assert.equal(fresh.length,4);finish(fresh);await flush();const valid=h.text();obsolete.forEach(r=>r.resolve(r.url==='/api/customers'?Array(999).fill({id:'old',status:'IA'}):bodies[r.url]));await flush();assert.equal(h.text(),valid,'Late cancelled responses cannot overwrite new data');
h.manual();const exiting=h.requests.slice(16),staleTick=[...h.timers.values()][0],beforeExit=h.requests.length;cleanup.forEach(f=>f?.());assert(exiting.every(r=>r.signal.aborted));assert.equal(h.timers.size,0);assert.equal(h.events.size,0);staleTick();assert.equal(h.requests.length,beforeExit);
const retry=harness(current);retry.mount();retry.requests.forEach(r=>r.resolve(r.url==='/api/customers'?{}:bodies[r.url]));await flush();assert(retry.text().includes('Resposta inválida'));assert(retry.text().includes('Indicadores indisponíveis'));assert(!retry.text().includes('Clientes cadastrados na empresa.'));
console.log('PASS: actual before/after component: structure no longer waits for data; no fabricated initial zeros; keep data on refresh; manual/poll coalesced; errors mark stale data; hidden page stops and aborts; visible restarts; late responses discarded; unmount aborts and clears effects; malformed payload is error. Controlled hooks/network/timers; no real browser or DB performance claim.');

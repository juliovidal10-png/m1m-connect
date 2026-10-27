import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { unreadSnapshots } from './load-unread-snapshot.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
vm.runInNewContext(compile(fs.readFileSync('src/lib/loaded-conversation-refresh.ts','utf8')),{module:mod,exports:mod.exports,require(name){if(name==='./conversation-unread-snapshot')return unreadSnapshots;throw Error(name);}});
const {createRefreshFence,collectLoadedUnreadStates,applyLoadedUnreadStates}=mod.exports;
const jid=i=>`${100000+i}@s.whatsapp.net`;
const row=(i,count=1,rev=1)=>({remoteJid:jid(i),canonicalJid:jid(i),unreadCanonicalJid:jid(i),unreadSource:'LEDGER',unreadCount:count,unreadRevision:rev,updatedAt:'2026-01-01T00:00:00Z'});
const loaded=Array.from({length:237},(_,i)=>row(i));
let sizes=[];
const fetchBatch=async(ids,key)=>{sizes.push(ids.length);return {scopeKey:key,states:ids.map(id=>{let i=Number(id.split('@')[0])-100000;return {canonicalJid:id,removed:[180,199].includes(i),unreadCanonicalJid:id,unreadSource:'LEDGER',unreadCount:i===160?0:i===220?2:1,unreadRevision:2};})};};
const updates=await collectLoadedUnreadStates(loaded.map(r=>r.canonicalJid),'scope',fetchBatch,()=>true);
assert.equal(sizes.join(','),'100,100,37');
const result=applyLoadedUnreadStates(loaded,updates,[...loaded.filter(r=>r.canonicalJid!==jid(220)),row(220,3,4)]);
assert.equal(result.length,235);assert.equal(result.find(r=>r.canonicalJid===jid(160)).unreadCount,0);assert.equal(result.find(r=>r.canonicalJid===jid(220)).unreadCount,3);
assert.equal(applyLoadedUnreadStates([row(180,1,4)],updates).length,1);
console.log('PASSOU: 237 itens em lotes 100/100/37, leitura posterior, revisao nova preservada e remocoes oculto/permissao.');
for(const context of ['empresa','instancia','setor']){
 const gate=createRefreshFence();gate.accept('old');const a=gate.begin('list'),b=gate.begin('search');gate.accept(context);assert.equal(gate.current(a),false);assert.equal(gate.current(b),false);
}
const gate=createRefreshFence();gate.accept('scope');const before=gate.begin('search');gate.begin('search');assert.equal(gate.current(before),false);
let current=true,calls=0;
assert.equal(await collectLoadedUnreadStates(loaded.map(r=>r.canonicalJid),'scope',async(ids,key)=>{calls++;current=false;return fetchBatch(ids,key);},()=>current),null);assert.equal(calls,1);
await assert.rejects(collectLoadedUnreadStates([jid(1)],'scope',async()=>({scopeKey:'scope',states:[]}),()=>true));
console.log('PASSOU: respostas antigas de busca/contexto descartadas, ciclo cancelado para sem varrer e lote incompleto rejeitado.');
// Executa o callback REAL do ChatInbox, extraido pela AST; React/rede simulados.
const source=fs.readFileSync('src/components/chat/ChatInbox.tsx','utf8');
const ast=ts.createSourceFile('ChatInbox.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='loadChats')callback=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(callback);
let chats=loaded,selected=row(180),search=[row(199)],statesCalled=[];
const fence=createRefreshFence();fence.accept('scope');
const refs={chatsRef:{current:chats},selectedChatRef:{current:selected},searchResultsRef:{current:search},refreshFenceRef:{current:fence},loadChatsInFlightRef:{current:false},confirmedReadRefreshPendingRef:{current:false}};
const update=(old,value)=>typeof value==='function'?value(old):value;
const context={...refs,module:{exports:{}},console,AbortSignal,queueMicrotask,
 collectLoadedUnreadStates,applyLoadedUnreadStates,LedgerScopeChangedError:mod.exports.LedgerScopeChangedError,
 clearConversationContext(){throw Error('Contexto inesperado');},setErrorMessage(){},setIsLoadingChats(){},setIsLoadingMoreChats(){},setHasMoreChats(){},setSearchRefreshVersion(){},
 getCanonicalJid:c=>c.canonicalJid||c.remoteJid,isGroupChat:()=>false,
 mergeDuplicateChats(items){const m=new Map();for(const item of items){const old=m.get(item.canonicalJid);m.set(item.canonicalJid,old?{...old,...item,...unreadSnapshots.selectLedgerUnreadSnapshot(old,item)}:item);}return [...m.values()];},
 setChats(v){chats=update(chats,v);refs.chatsRef.current=chats;},setSelectedChat(v){selected=update(selected,v);},setSearchResults(v){search=update(search,v);},
 async fetch(url){assert.match(url,/limit=100&offset=0/);return {ok:true,json:async()=>({ledgerScopeKey:'scope',hasMore:true,items:[row(999),...loaded.slice(0,99)]})};},
 async fetchUnreadBatch(ids,key){statesCalled.push(ids.length);return fetchBatch(ids,key);},
};
vm.runInNewContext(compile('module.exports = '+callback),context);
await context.module.exports(false,'refresh');
assert.equal(chats.length,236);assert.ok(chats.some(r=>r.canonicalJid===jid(99)));assert.ok(chats.some(r=>r.canonicalJid===jid(999)));assert.equal(chats.find(r=>r.canonicalJid===jid(160)).unreadCount,0);assert.equal(chats.find(r=>r.canonicalJid===jid(220)).unreadCount,2);assert.equal(selected,null);assert.equal(search.length,0);assert.equal(statesCalled.join(','),'100,100,38');
console.log('PASSOU: callback real preserva item99 deslocado por nova cabeca, atualiza160/220 e remove180/199 da selecao/busca. Persistencia/rede/React simulados.');

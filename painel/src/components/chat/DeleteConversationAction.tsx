"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
type Preview={id:string;version:number;messageCount:number;conversation:string;remoteJid:string;company:string;instanceName:string};
export default function DeleteConversationAction({remoteJid,onDeleted}:{remoteJid:string;onDeleted:()=>Promise<void>|void}){
 const trigger=useRef<HTMLButtonElement>(null);
 const [menuPosition,setMenuPosition]=useState({top:0,left:0});
 const [allowed,setAllowed]=useState(false),[menu,setMenu]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch('/api/conversation-deletions',{signal:controller.signal,cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted)setAllowed(!!data?.enabled&&!!data.canDelete);}).catch(()=>{});return()=>controller.abort();},[remoteJid]);
 async function request(action:string,extra:object={}){const response=await fetch('/api/conversation-deletions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,remoteJid,...extra})});const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível concluir a operação.');return data;}
 async function prepare(){setBusy(true);setError('');setMenu(false);try{setPreview(await request('prepare',{requestKey:crypto.randomUUID()}));}catch(e){setError(e instanceof Error?e.message:'Falha ao preparar exclusão.');}finally{setBusy(false);}}
 async function decide(confirm:boolean){if(!preview)return;setBusy(true);setError('');try{await request(confirm?'confirm':'cancel',{id:preview.id,version:preview.version});setPreview(null);if(confirm)await onDeleted();}catch(e){setError(e instanceof Error?e.message:'Falha ao concluir exclusão.');}finally{setBusy(false);}}
 if(!allowed)return null;
 return <div className="relative"><button ref={trigger} type="button" aria-label="Opções da conversa" aria-expanded={menu} onClick={()=>{const rect=trigger.current?.getBoundingClientRect();if(rect)setMenuPosition({top:Math.min(rect.bottom+8,window.innerHeight-64),left:Math.max(8,Math.min(rect.right-224,window.innerWidth-232))});setMenu(!menu);}} disabled={busy} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-lg">⋮</button>
 {menu&&createPortal(<div style={{position:"fixed",top:menuPosition.top,left:menuPosition.left,zIndex:201,width:224}} className="rounded-xl border bg-white p-2 shadow-lg"><button type="button" onClick={()=>void prepare()} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700">Excluir conversa</button></div>,document.body)}
 {error&&<p role="alert" className="max-w-sm p-2 text-sm text-red-700">{error}</p>}
 {preview&&createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Excluir conversa" className="w-full max-w-lg rounded-2xl bg-white p-6 text-sm shadow-xl">
 <h2 className="text-lg font-bold">Excluir conversa</h2><p className="mt-3 font-semibold">{preview.conversation}</p><p className="break-all">{preview.remoteJid}</p><p className="mt-2">Empresa: {preview.company} · Instância: {preview.instanceName}</p>
 <p className="mt-3">Excluir permanentemente {preview.messageCount} mensagens desta conversa no M1M Connect. O contato, a agenda, os atendimentos e os registros financeiros serão preservados. Não apaga mensagens no WhatsApp.</p>
 <p className="mt-3">O histórico excluído não será recuperado por sincronização. Eventos de origem incerta ficarão separados para revisão administrativa.</p><p className="mt-2 font-semibold text-red-700">Esta exclusão não pode ser desfeita pela interface.</p>
 {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}<div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={()=>void decide(false)} className="rounded-xl border px-4 py-2">Cancelar</button><button type="button" disabled={busy} onClick={()=>void decide(true)} className="rounded-xl bg-red-700 px-4 py-2 text-white">{busy?'Aguarde…':'Confirmar exclusão'}</button></div>
 </section></div>,document.body)}</div>;
}

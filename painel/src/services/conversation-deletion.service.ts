import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createConversationDeletionRepository, ConversationDeletionError, type DeletionConnection, type DeletionScope } from "./conversation-deletion.repository";

type Row = Record<string, unknown>;
type Actor = {kind:"COMPANY_USER"|"PLATFORM_ADMIN";id:string};
export function conversationDeletionEnabled() {
  return process.env.M1M_CONVERSATION_DELETION_ENABLED === "true";
}
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient } from "pg";
type WorkContext={client:PoolClient;scope:DeletionScope};
const workContext=new AsyncLocalStorage<WorkContext>();
let pool:Pool|undefined;
function getPool(){
  if(!conversationDeletionEnabled())throw new ConversationDeletionError('FEATURE_DISABLED',503);
  return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:4,application_name:'m1m_conversation_deletion'});
}
const database = {
  async transaction<T>(work:(db:DeletionConnection)=>Promise<T>):Promise<T>{
    const held=workContext.getStore()?.client,client=held??await getPool().connect();
    try{
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='15000'");
      await client.query("SET LOCAL lock_timeout='2000'");
      const result=await work({query:async(sql,values=[])=>client.query(sql,values)});
      await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{if(!held)client.release();}
  },
};
export async function withDeletionConversation<T>(scope:DeletionScope,work:()=>Promise<T>):Promise<T>{
  if(!conversationDeletionEnabled())return work();
  const key=JSON.stringify([scope.companyId,scope.instanceName,scope.remoteJid]);
  const current=workContext.getStore();
  if(current){
    if(JSON.stringify([current.scope.companyId,current.scope.instanceName,current.scope.remoteJid])!==key)throw new ConversationDeletionError('IDENTITY_CHANGED_DURING_PROCESSING');
    return work();
  }
  const client=await getPool().connect();let locked=false;
  try{
    locked=(await client.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[key])).rows[0].locked;
    if(!locked)throw new ConversationDeletionError('CONVERSATION_BUSY');
    return await workContext.run({client,scope},work);
  }finally{try{if(locked)await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[key]);}finally{client.release();}}
}
export async function canonicalDeletionScope(scope:DeletionScope):Promise<DeletionScope>{
  const customer=await prisma.m1MCustomer.findFirst({where:{companyId:scope.companyId,remoteJid:scope.remoteJid},select:{remoteJid:true}});
  if(customer)return {...scope,remoteJid:customer.remoteJid};
  const message=await prisma.m1MMessage.findFirst({where:{companyId:scope.companyId,instanceName:scope.instanceName,remoteJid:scope.remoteJid},select:{customer:{select:{remoteJid:true}}}});
  if(message?.customer)return {...scope,remoteJid:message.customer.remoteJid};
  const rows=await prisma.$queryRaw<{remoteJid:string}[]>`SELECT "remoteJid" FROM m1m_conversation_deletions WHERE "companyId"=${scope.companyId}
    AND "instanceName"=${scope.instanceName} AND ${scope.remoteJid}=ANY(aliases) AND state IN ('DELETING','DELETED','RESUMED','FAILED') ORDER BY "previewAt" DESC,id DESC LIMIT 1`;
  return rows[0]?{...scope,remoteJid:rows[0].remoteJid}:scope;
}
export async function deletionMarker(scope:DeletionScope){
  if(!conversationDeletionEnabled())return null;
  const rows=await prisma.$queryRaw<Row[]>`SELECT id,state,aliases FROM m1m_conversation_deletions WHERE "companyId"=${scope.companyId}
    AND "instanceName"=${scope.instanceName} AND ${scope.remoteJid}=ANY(aliases)
    AND state IN ('DELETING','DELETED','RESUMED','FAILED') ORDER BY "previewAt" DESC,id DESC LIMIT 1`;
  return rows[0]??null;
}
export async function interceptDeletedEvent(scope:DeletionScope,message:{evolutionMessageId:string;content?:string|null;type?:unknown;fromMe?:boolean;sentAt?:Date;authorName?:string|null;rawPayload?:unknown;mediaUrl?:string|null;mimeType?:string|null}){
  if(!conversationDeletionEnabled())return {action:'NORMAL_FLOW'};
  const marker=await deletionMarker(scope);
  if(marker){
    const existing=await prisma.m1MMessage.findUnique({where:{companyId_instanceName_evolutionMessageId:{companyId:scope.companyId,instanceName:scope.instanceName,evolutionMessageId:message.evolutionMessageId}},select:{authorId:true,rawPayload:true}});
    const raw=existing?.rawPayload as Row|null,receipt=raw?.m1mSendReceipt as Row|undefined;
    if(existing?.authorId&&raw?.m1mOrigin==='AUTHENTICATED_PANEL_SEND'&&receipt?.deletionId===marker.id&&receipt?.userId===existing.authorId)return {action:'AUTHENTICATED_SEND_ALREADY_PROCESSED'};
  }
  const raw=message.rawPayload&&typeof message.rawPayload==='object'?message.rawPayload as Row:{};
  const body=raw.message&&typeof raw.message==='object'?raw.message as Row:{};
  const retained:Row={};
  for(const key of ['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage']){
    const source=body[key];if(!source||typeof source!=='object')continue;
    const object=source as Row,value:Row={};
    for(const field of ['url','directPath','mimetype','fileName','caption','fileLength','mediaKey','fileEncSha256','fileSha256','ptt','seconds','height','width','jpegThumbnail'])if(object[field]!==undefined)value[field]=object[field];
    retained[key]=value;
  }
  if(message.content)retained.conversation=message.content;
  const payload={text:message.content??null,type:String(message.type??'UNKNOWN'),fromMe:message.fromMe===true,sentAt:message.sentAt?.toISOString(),authorName:message.authorName??null,message:retained,mediaUrl:message.mediaUrl??null,mimeType:message.mimeType??null};
  if(!marker&&scope.remoteJid.endsWith('@lid')){
    const possible=await prisma.$queryRaw<Row[]>`SELECT id FROM m1m_conversation_deletions WHERE "companyId"=${scope.companyId} AND "instanceName"=${scope.instanceName}
      AND state IN ('DELETED','RESUMED','DELETING','FAILED') LIMIT 1`;
    if(possible.length)return conversationDeletionRepository.ingestUnresolved(scope,message.evolutionMessageId,payload);
  }
  return conversationDeletionRepository.ingestUncertain(scope,message.evolutionMessageId,payload);
}
export async function safeDeletedHistory(scope:DeletionScope){
  const messages=await prisma.m1MMessage.findMany({where:{companyId:scope.companyId,instanceName:scope.instanceName,remoteJid:scope.remoteJid},orderBy:{sentAt:'desc'},take:100});
  return messages.reverse().map(m=>({...((m.rawPayload&&typeof m.rawPayload==='object'&&!Array.isArray(m.rawPayload))?m.rawPayload:{}),key:{id:m.evolutionMessageId,remoteJid:m.remoteJid,fromMe:m.fromMe},message:(m.rawPayload&&typeof m.rawPayload==='object'&&!Array.isArray(m.rawPayload)?(m.rawPayload as Row).message:null)??{conversation:m.content??''},messageTimestamp:Math.floor(m.sentAt.getTime()/1000),m1mAuthor:{type:m.authorType,id:m.authorId,name:m.authorName}}));
}
export async function deletionListSnapshot(companyId:string,instanceName:string){
  if(!conversationDeletionEnabled())return [] as Row[];
  return prisma.$queryRaw<Row[]>`SELECT DISTINCT ON (d."remoteJid") d."remoteJid",d.state,d.aliases,
    (SELECT jsonb_build_object('key',jsonb_build_object('id',m."evolutionMessageId",'remoteJid',m."remoteJid",'fromMe',m."fromMe"),
      'message',COALESCE(m."rawPayload"->'message',jsonb_build_object('conversation',m.content)),
      'messageTimestamp',extract(epoch from m."sentAt")) FROM m1m_messages m WHERE m."companyId"=d."companyId" AND m."instanceName"=d."instanceName" AND m."remoteJid"=ANY(d.aliases) ORDER BY m."sentAt" DESC,m.id DESC LIMIT 1) AS "lastMessage"
    FROM m1m_conversation_deletions d WHERE d."companyId"=${companyId} AND d."instanceName"=${instanceName} AND d.state IN ('DELETING','DELETED','RESUMED','FAILED')
    ORDER BY d."remoteJid",d."previewAt" DESC,d.id DESC`;
}
export const conversationDeletionRepository=createConversationDeletionRepository(database);

export async function resolveDeletionScope(companyId:string,instanceName:string,remoteJid:string) {
  if(!remoteJid || remoteJid.length>180 || !/^[^\s@]+@(s\.whatsapp\.net|lid|g\.us)$/.test(remoteJid)) throw new ConversationDeletionError("INVALID_CONVERSATION",400);
  let customer=await prisma.m1MCustomer.findFirst({where:{companyId,remoteJid},select:{id:true,remoteJid:true,name:true,phone:true}});
  if(!customer){
    const message=await prisma.m1MMessage.findFirst({where:{companyId,instanceName,remoteJid},select:{customer:{select:{id:true,remoteJid:true,name:true,phone:true}}}});
    customer=message?.customer??null;
  }
  if(!customer) throw new ConversationDeletionError("CONVERSATION_NOT_FOUND",404);
  // Somente identidade ja associada no banco. Nenhum agrupamento por nome.
  const proven=await prisma.$queryRaw<{remoteJid:string;original:string|null;alternate:string|null}[]>`SELECT DISTINCT "remoteJid", "rawPayload"#>>'{key,remoteJid}' AS original,
    "rawPayload"#>>'{key,remoteJidAlt}' AS alternate FROM m1m_messages WHERE "companyId"=${companyId} AND "instanceName"=${instanceName} AND "customerId"=${customer.id} LIMIT 5001`;
  if(proven.length>5000)throw new ConversationDeletionError('CONVERSATION_REQUIRES_BATCH_PROCESSING',413);
  const aliases=[...new Set([remoteJid,customer.remoteJid,...proven.flatMap(row=>[row.remoteJid,row.original,row.alternate]).filter((jid):jid is string=>!!jid&&/^[^\s@]+@(s\.whatsapp\.net|lid|g\.us)$/.test(jid))])].filter(jid=>customer.remoteJid.endsWith('@g.us')?jid===customer.remoteJid:!jid.endsWith('@g.us'));
  return {scope:{companyId,instanceName,remoteJid:customer.remoteJid},aliases,customer};
}
export async function listDeletionReviews(companyId:string,instanceName:string,offset:number) {
  const [items,count]=await Promise.all([
    prisma.$queryRaw<Row[]>`SELECT id,"remoteJid","evolutionMessageId",reason,state,version,"normalizedPayload",
      "firstSeenAt" AT TIME ZONE 'UTC' AS "firstSeenAt" FROM m1m_conversation_deletion_reviews
      WHERE "companyId"=${companyId} AND "instanceName"=${instanceName} AND state='PENDING'
      ORDER BY "firstSeenAt",id LIMIT 100 OFFSET ${offset}`,
    prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) FROM m1m_conversation_deletion_reviews
      WHERE "companyId"=${companyId} AND "instanceName"=${instanceName} AND state='PENDING'`,
  ]);
  return {items,pendingCount:Number(count[0].count),hasMore:offset+items.length<Number(count[0].count)};
}
export async function importReviewedMessage(db:DeletionConnection,scope:DeletionScope,event:Row,actor:Actor) {
  const customer=(await db.query(`SELECT id FROM m1m_customers WHERE "companyId"=$1 AND "remoteJid"=$2 FOR UPDATE`,[scope.companyId,scope.remoteJid])).rows[0];
  if(!customer)throw new ConversationDeletionError("CONTACT_IDENTITY_REQUIRED");
  const active=(await db.query(`SELECT id,state FROM m1m_attendances WHERE "companyId"=$1 AND "customerId"=$2 AND state IN ('IA','HUMANO') ORDER BY "startedAt" DESC LIMIT 1 FOR UPDATE`,[scope.companyId,customer.id])).rows[0];
  if(active?.state==='HUMANO')throw new ConversationDeletionError("FINISH_HUMAN_ATTENDANCE_FIRST");
  const attendanceId=active?.id??randomUUID();
  if(!active)await db.query(`INSERT INTO m1m_attendances(id,"companyId","customerId",state,"updatedAt") VALUES($1,$2,$3,'IA',CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`,[attendanceId,scope.companyId,customer.id]);
  await db.query(`INSERT INTO m1m_attendance_events(id,"attendanceId",type,"actorType","actorId",metadata)
    VALUES($1,$2,'REOPENED_AFTER_REVIEW',$3,$4,$5::jsonb)`,[randomUUID(),attendanceId,actor.kind==='COMPANY_USER'?'USER':'SYSTEM',actor.kind==='COMPANY_USER'?actor.id:null,JSON.stringify({source:'ADMIN_ACCEPTED_UNCERTAIN',reviewerId:actor.id,reviewerKind:actor.kind,evolutionMessageId:event.evolutionMessageId,originalRemoteJid:event.originalRemoteJid??scope.remoteJid})]);
  const fromMe=event.fromMe===true,text=typeof event.text==='string'?event.text:null;
  const sentAt=typeof event.sentAt==='string' && !Number.isNaN(Date.parse(event.sentAt))?new Date(event.sentAt):new Date();
  const raw={key:{id:event.evolutionMessageId,remoteJid:scope.remoteJid,fromMe},message:event.message??{conversation:text??'Evento de origem incerta aceito para revisão.'},messageTimestamp:Math.floor(sentAt.getTime()/1000),m1mOrigin:'ADMIN_ACCEPTED_UNCERTAIN'};
  const type=['TEXT','IMAGE','VIDEO','AUDIO','DOCUMENT','STICKER','LOCATION','CONTACT','REACTION','UNKNOWN'].includes(String(event.type))?String(event.type):'TEXT';
  await db.query(`INSERT INTO m1m_messages(id,"companyId","customerId","attendanceId","instanceName","evolutionMessageId","remoteJid",direction,type,"fromMe",content,"rawPayload","sentAt","processedAt","updatedAt","mediaUrl","mimeType")
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::"M1MMessageDirection",$14::"M1MMessageType",$9,$10,$11::jsonb,$12,$13,$13,$15,$16)
    ON CONFLICT("companyId","instanceName","evolutionMessageId") DO NOTHING`,[randomUUID(),scope.companyId,customer.id,attendanceId,scope.instanceName,event.evolutionMessageId,scope.remoteJid,fromMe?'OUT':'IN',fromMe,text,JSON.stringify(raw),sentAt,new Date(),type,event.mediaUrl??null,event.mimeType??null]);
}

export async function recordAuthenticatedSend(scopeInput:DeletionScope,id:string,input:{content?:string|null;type?:unknown;mediaUrl?:string|null;mimeType?:string|null;rawPayload?:unknown},userId:string,authorName:string){
  if(!conversationDeletionEnabled())return;
  const scope=await canonicalDeletionScope(scopeInput);
  const held=workContext.getStore();
  if(!held||held.scope.companyId!==scope.companyId||held.scope.instanceName!==scope.instanceName||held.scope.remoteJid!==scope.remoteJid)throw new ConversationDeletionError('SEND_GUARD_REQUIRED');
  const marker=await deletionMarker(scope);if(!marker)return;
  await database.transaction(async db=>{
    const old=await db.query(`SELECT 1 FROM m1m_conversation_deletion_message_keys k JOIN m1m_conversation_deletions d ON d.id=k."deletionId"
      WHERE k."companyId"=$1 AND k."instanceName"=$2 AND k."evolutionMessageId"=$3 AND d.state IN ('DELETED','RESUMED','DELETING','FAILED') LIMIT 1`,[scope.companyId,scope.instanceName,id]);
    if(old.rows.length)throw new ConversationDeletionError('SEND_ID_ALREADY_DELETED');
    const customer=(await db.query(`SELECT id FROM m1m_customers WHERE "companyId"=$1 AND "remoteJid"=$2 FOR UPDATE`,[scope.companyId,scope.remoteJid])).rows[0];
    if(!customer)throw new ConversationDeletionError('CONTACT_IDENTITY_REQUIRED');
    const type=['TEXT','IMAGE','VIDEO','AUDIO','DOCUMENT','STICKER','LOCATION','CONTACT','REACTION','UNKNOWN'].includes(String(input.type))?String(input.type):'TEXT';
    const raw=input.rawPayload&&typeof input.rawPayload==='object'?input.rawPayload as Row:{};
    const payload={key:{id,remoteJid:scope.remoteJid,fromMe:true},message:raw.message??{conversation:input.content??''},messageTimestamp:Math.floor(Date.now()/1000),m1mOrigin:'AUTHENTICATED_PANEL_SEND',m1mSendReceipt:{userId,deletionId:marker.id,confirmedAt:new Date().toISOString()}};
    await db.query(`INSERT INTO m1m_messages(id,"companyId","customerId","instanceName","evolutionMessageId","remoteJid",direction,type,"fromMe","authorType","authorId","authorName",content,"mediaUrl","mimeType","rawPayload","sentAt","processedAt","updatedAt")
      VALUES($1,$2,$3,$4,$5,$6,'OUT',$7::"M1MMessageType",true,'HUMAN',$8,$9,$10,$11,$12,$13::jsonb,$14,$14,$14)
      ON CONFLICT("companyId","instanceName","evolutionMessageId") DO NOTHING`,[randomUUID(),scope.companyId,customer.id,scope.instanceName,id,scope.remoteJid,type,userId,authorName,input.content??null,input.mediaUrl??null,input.mimeType??null,JSON.stringify(payload),new Date()]);
    await db.query(`UPDATE m1m_conversation_deletions SET state='RESUMED',version=version+1 WHERE id=$1`,[marker.id]);
  });
}

export async function isDeletedOrPendingMessage(companyId:string,instanceName:string,id:string){
  if(!conversationDeletionEnabled())return false;
  const rows=await prisma.$queryRaw<Row[]>`SELECT 1 FROM m1m_conversation_deletion_message_keys k JOIN m1m_conversation_deletions d ON d.id=k."deletionId"
    WHERE k."companyId"=${companyId} AND k."instanceName"=${instanceName} AND k."evolutionMessageId"=${id}
      AND d.state IN ('DELETED','RESUMED','DELETING','FAILED')
    UNION ALL SELECT 1 FROM m1m_conversation_deletion_reviews WHERE "companyId"=${companyId} AND "instanceName"=${instanceName} AND "evolutionMessageId"=${id} AND state IN ('PENDING','DISCARDED') LIMIT 1`;
  return rows.length>0;
}

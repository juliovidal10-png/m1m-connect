import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
export type DeletionConnection = {
  query: (sql: string, values?: unknown[]) => Promise<{rows: Row[]; rowCount: number | null}>;
};
export type DeletionDatabase = {
  transaction: <T>(work: (db: DeletionConnection) => Promise<T>) => Promise<T>;
};
export type DeletionScope = { companyId: string; instanceName: string; remoteJid: string };
type Actor = { kind: "COMPANY_USER" | "PLATFORM_ADMIN"; id: string };
export class ConversationDeletionError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
const MAX_MANIFEST = 5000;
function nonempty(value: string) {
  if (!value?.trim()) throw new ConversationDeletionError("INVALID_SCOPE", 400);
  return value.trim();
}
function normalizeScope(scope: DeletionScope): DeletionScope {
  return {companyId: nonempty(scope.companyId), instanceName: nonempty(scope.instanceName), remoteJid: nonempty(scope.remoteJid)};
}
async function lock(db: DeletionConnection, scope: DeletionScope) {
  // Todos os escritores integrados devem usar a mesma identidade canonica e este bloqueio.
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [JSON.stringify([scope.companyId,scope.instanceName,scope.remoteJid])]);
}
async function operation(db: DeletionConnection, scope: DeletionScope, id: string) {
  const row = (await db.query(`SELECT * FROM m1m_conversation_deletions
    WHERE id=$1 AND "companyId"=$2 AND "instanceName"=$3 AND "remoteJid"=$4 FOR UPDATE`,
  [id,scope.companyId,scope.instanceName,scope.remoteJid])).rows[0];
  if (!row) throw new ConversationDeletionError("NOT_FOUND",404);
  return row;
}
async function noHuman(db: DeletionConnection, scope: DeletionScope, aliases: string[]) {
  const result = await db.query(`SELECT a.id,a.state FROM m1m_attendances a JOIN m1m_customers c
    ON c.id=a."customerId" AND c."companyId"=a."companyId"
    WHERE a."companyId"=$1 AND c."remoteJid"=ANY($2::text[]) AND a.state IN ('IA','HUMANO')
      AND a."finishedAt" IS NULL ORDER BY a.id FOR UPDATE OF a`,[scope.companyId, aliases]);
  if (result.rows.some(row=>row.state==='HUMANO')) throw new ConversationDeletionError("FINISH_HUMAN_ATTENDANCE_FIRST");
}

// Nucleo transacional. Nao autentica por conta propria: as rotas devem validar o ator,
// a permissao explicita, a visibilidade por setor e a instancia antes de chamar.
// Ainda nao conectado as rotas de producao; nao disponibilizar exclusao antes das barreiras.
export function createConversationDeletionRepository(database: DeletionDatabase) {
  return {
    async prepare(input: DeletionScope & {aliases: string[]; requestKey: string; actor: Actor}) {
      const scope=normalizeScope(input), aliases=[...new Set([scope.remoteJid,...input.aliases.map(nonempty)])];
      nonempty(input.actor.id); nonempty(input.requestKey);
      return database.transaction(async db => {
        await lock(db,scope);
        const prior=(await db.query(`SELECT * FROM m1m_conversation_deletions WHERE "companyId"=$1 AND "requestKey"=$2`,[scope.companyId,input.requestKey])).rows[0];
        if (prior) {
          if (prior.instanceName!==scope.instanceName || prior.remoteJid!==scope.remoteJid || prior.actorId!==input.actor.id || prior.actorKind!==input.actor.kind) throw new ConversationDeletionError("IDEMPOTENCY_SCOPE_CONFLICT");
          return prior;
        }
        // Bloquear cliente impede insercao concorrente de novas dependencias com FK.
        await db.query(`SELECT id FROM m1m_customers WHERE "companyId"=$1 AND "remoteJid"=ANY($2::text[]) ORDER BY id FOR UPDATE`,[scope.companyId,aliases]);
        await noHuman(db,scope,aliases);
        const messages=(await db.query(`SELECT id,"evolutionMessageId","updatedAt" FROM m1m_messages
          WHERE "companyId"=$1 AND "instanceName"=$2 AND "remoteJid"=ANY($3::text[]) ORDER BY id LIMIT $4`,
        [scope.companyId,scope.instanceName,aliases,MAX_MANIFEST+1])).rows;
        if(messages.length>MAX_MANIFEST) throw new ConversationDeletionError("CONVERSATION_REQUIRES_BATCH_PROCESSING",413);
        const id=randomUUID();
        const op=(await db.query(`INSERT INTO m1m_conversation_deletions
          (id,"companyId","instanceName","remoteJid",aliases,"requestKey","actorKind","actorId")
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [id,scope.companyId,scope.instanceName,scope.remoteJid,aliases,input.requestKey,input.actor.kind,input.actor.id])).rows[0];
        if(messages.length) await db.query(`INSERT INTO m1m_conversation_deletion_message_keys
          ("deletionId","companyId","instanceName","localMessageId","evolutionMessageId","expectedUpdatedAt")
          SELECT $1,$2,$3,m.id,m."evolutionMessageId",m."updatedAt" FROM m1m_messages m
          WHERE m."companyId"=$2 AND m."instanceName"=$3 AND m.id=ANY($4::text[])`,
        [id,scope.companyId,scope.instanceName,messages.map(m=>m.id)]);
        return {...op,messageCount:messages.length};
      });
    },
    async cancel(scopeInput: DeletionScope, id: string, expectedVersion: number) {
      const scope=normalizeScope(scopeInput);
      return database.transaction(async db=>{
        await lock(db,scope);const row=await operation(db,scope,id);
        if(row.state!=="PREVIEW" || row.version!==expectedVersion) throw new ConversationDeletionError("STALE_PREVIEW");
        await db.query(`UPDATE m1m_conversation_deletions SET state='CANCELLED',version=version+1 WHERE id=$1`,[id]);
        return {cancelled:true};
      });
    },
    async confirm(scopeInput: DeletionScope, id: string, expectedVersion: number) {
      const scope=normalizeScope(scopeInput);
      return database.transaction(async db=>{
        await lock(db,scope);const row=await operation(db,scope,id);
        if(row.state==='DELETED' || row.state==='RESUMED') return {alreadyCompleted:true,deletedMessageCount:0};
        if(row.state!=="PREVIEW" || row.version!==expectedVersion) throw new ConversationDeletionError("STALE_PREVIEW");
        const aliases=row.aliases as string[];
        await db.query(`SELECT id FROM m1m_customers WHERE "companyId"=$1 AND "remoteJid"=ANY($2::text[]) ORDER BY id FOR UPDATE`,[scope.companyId,aliases]);
        await noHuman(db,scope,aliases);
        const arrived=await db.query(`SELECT m.id FROM m1m_messages m WHERE m."companyId"=$1 AND m."instanceName"=$2 AND m."remoteJid"=ANY($3::text[])
          AND NOT EXISTS (SELECT 1 FROM m1m_conversation_deletion_message_keys k WHERE k."deletionId"=$4 AND k."localMessageId"=m.id) LIMIT 1`,[scope.companyId,scope.instanceName,aliases,id]);
        if(arrived.rows.length)throw new ConversationDeletionError("NEW_MESSAGES_AFTER_PREVIEW");
        // Mesmo ID alterado apos a previa nao pode ser apagado sem revalidacao.
        const changed=await db.query(`SELECT m.id FROM m1m_messages m JOIN m1m_conversation_deletion_message_keys k
          ON k."localMessageId"=m.id AND k."companyId"=m."companyId" AND k."instanceName"=m."instanceName"
          WHERE k."deletionId"=$1 AND m."updatedAt"<>k."expectedUpdatedAt" LIMIT 1`,[id]);
        if(changed.rows.length) throw new ConversationDeletionError("MESSAGE_CHANGED_AFTER_PREVIEW");
        await db.query(`UPDATE m1m_conversation_deletions SET state='DELETING',"confirmedAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC',version=version+1 WHERE id=$1`,[id]);
        const removed=await db.query(`DELETE FROM m1m_messages m USING m1m_conversation_deletion_message_keys k
          WHERE k."deletionId"=$1 AND m.id=k."localMessageId" AND m."companyId"=k."companyId"
            AND m."instanceName"=k."instanceName" AND m."updatedAt"=k."expectedUpdatedAt"`,[id]);
        await db.query(`UPDATE m1m_conversation_deletions SET state='DELETED',"completedAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE id=$1`,[id]);
        return {alreadyCompleted:false,deletedMessageCount:removed.rowCount??0};
      });
    },
    async ingestUncertain(scopeInput: DeletionScope, eventId: string, payload: Row) {
      const scope=normalizeScope(scopeInput);nonempty(eventId);
      // Whitelist normalizada; nunca persistir rawPayload/apikey/headers.
      const normalized=Object.fromEntries(["text","type","fromMe","sentAt","authorName","message","mediaUrl","mimeType"].filter(k=>Object.hasOwn(payload,k)).map(k=>[k,payload[k]]));
      return database.transaction(async db=>{
        await lock(db,scope);
        const row=(await db.query(`SELECT * FROM m1m_conversation_deletions WHERE "companyId"=$1 AND "instanceName"=$2
          AND $3=ANY(aliases) AND state IN ('DELETING','DELETED','RESUMED','FAILED') ORDER BY "previewAt" DESC,id DESC LIMIT 1 FOR UPDATE`,
        [scope.companyId,scope.instanceName,scope.remoteJid])).rows[0];
        if(!row) return {action:'NORMAL_FLOW'};
        const old=await db.query(`SELECT 1 FROM m1m_conversation_deletion_message_keys k JOIN m1m_conversation_deletions d ON d.id=k."deletionId"
          WHERE k."companyId"=$1 AND k."instanceName"=$2 AND k."evolutionMessageId"=$3 AND d.state IN ('DELETING','DELETED','RESUMED','FAILED') LIMIT 1`,[scope.companyId,scope.instanceName,eventId]);
        if(old.rows.length) return {action:'IGNORE_KNOWN_HISTORY'};
        const review=(await db.query(`INSERT INTO m1m_conversation_deletion_reviews
          (id,"deletionId","companyId","instanceName","remoteJid","evolutionMessageId",reason,"normalizedPayload")
          VALUES($1,$2,$3,$4,$5,$6,'UNCERTAIN_ORIGIN',$7::jsonb)
          ON CONFLICT("companyId","instanceName","evolutionMessageId") DO UPDATE
            SET "lastSeenAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          RETURNING id,state,version`,[randomUUID(),row.id,scope.companyId,scope.instanceName,scope.remoteJid,eventId,JSON.stringify(normalized)])).rows[0];
        return {action:review.state==='DISCARDED'?'IGNORE_DISCARDED_EVENT':review.state==='RESUMED'?'ALREADY_REVIEWED':'ADMIN_REVIEW',review};
      });
    },
    async ingestUnresolved(scopeInput: DeletionScope,eventId:string,payload:Row){
      const scope=normalizeScope(scopeInput);nonempty(eventId);
      const normalized=Object.fromEntries(["text","type","fromMe","sentAt","authorName","message","mediaUrl","mimeType"].filter(k=>Object.hasOwn(payload,k)).map(k=>[k,payload[k]]));
      return database.transaction(async db=>{
        await lock(db,scope);
        const row=(await db.query(`INSERT INTO m1m_conversation_deletion_reviews
          (id,"companyId","instanceName","remoteJid","evolutionMessageId",reason,"normalizedPayload")
          VALUES($1,$2,$3,$4,$5,'UNRESOLVED_IDENTITY',$6::jsonb)
          ON CONFLICT("companyId","instanceName","evolutionMessageId") DO UPDATE SET "lastSeenAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          RETURNING id,state,version`,[randomUUID(),scope.companyId,scope.instanceName,scope.remoteJid,eventId,JSON.stringify(normalized)])).rows[0];
        return {action:row.state==='DISCARDED'?'IGNORE_DISCARDED_EVENT':row.state==='RESUMED'?'ALREADY_REVIEWED':'ADMIN_REVIEW',review:row};
      });
    },
    async decide(scopeInput: DeletionScope, reviewId: string, expectedVersion: number, decision: "RESUME"|"DISCARD", actor: Actor,
      importSelected?: (db: DeletionConnection, event: Row) => Promise<void>, target?: DeletionScope) {
      const scope=normalizeScope(scopeInput);nonempty(actor.id);
      return database.transaction(async db=>{
        if(target&&(target.companyId!==scope.companyId||target.instanceName!==scope.instanceName))throw new ConversationDeletionError('INVALID_REVIEW_TARGET',403);
        const scopes=[scope,...(target&&target.remoteJid!==scope.remoteJid?[target]:[])].sort((a,b)=>a.remoteJid.localeCompare(b.remoteJid));
        for(const value of scopes)await lock(db,value);
        const row=(await db.query(`SELECT * FROM m1m_conversation_deletion_reviews WHERE id=$1 AND "companyId"=$2 AND "instanceName"=$3 AND "remoteJid"=$4 FOR UPDATE`,[reviewId,scope.companyId,scope.instanceName,scope.remoteJid])).rows[0];
        if(!row) throw new ConversationDeletionError('NOT_FOUND',404);
        if(row.state!=='PENDING' || row.version!==expectedVersion) throw new ConversationDeletionError('REVIEW_CONFLICT');
        if(!['RESUME','DISCARD'].includes(decision)) throw new ConversationDeletionError('INVALID_DECISION',400);
        const destination=target??scope;
        if(target&&row.deletionId)throw new ConversationDeletionError('REVIEW_TARGET_NOT_UNRESOLVED');
        let destinationDeletion=row.deletionId;
        if(decision==='RESUME') {
          const latest=(await db.query(`SELECT id,state FROM m1m_conversation_deletions WHERE "companyId"=$1 AND "instanceName"=$2 AND $3=ANY(aliases)
            AND state IN ('DELETING','DELETED','RESUMED','FAILED') ORDER BY "previewAt" DESC,id DESC LIMIT 1 FOR UPDATE`,[destination.companyId,destination.instanceName,destination.remoteJid])).rows[0];
          if(!latest || (!target&&latest.id!==row.deletionId) || !['DELETED','RESUMED'].includes(String(latest.state))) throw new ConversationDeletionError('STALE_DELETION');
          if(!importSelected) throw new ConversationDeletionError('IMPORT_HANDLER_REQUIRED',500);
          // Callback transacional: somente este evento, nunca pipeline automatico.
          destinationDeletion=latest.id;
          await importSelected(db,{...row.normalizedPayload as Row,evolutionMessageId:row.evolutionMessageId,originalRemoteJid:row.remoteJid,origin:'ADMIN_ACCEPTED_UNCERTAIN'});
          await db.query(`UPDATE m1m_conversation_deletions SET state='RESUMED',version=version+1 WHERE id=$1`,[destinationDeletion]);
        }
        await db.query(`UPDATE m1m_conversation_deletion_reviews SET state=$2,"remoteJid"=$5,"deletionId"=$6,"normalizedPayload"=NULL,"reviewedAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
          "reviewerKind"=$3,"reviewerId"=$4,version=version+1 WHERE id=$1`,[reviewId,decision==='RESUME'?'RESUMED':'DISCARDED',actor.kind,actor.id,destination.remoteJid,destinationDeletion]);
        return {state:decision==='RESUME'?'RESUMED':'DISCARDED'};
      });
    },
  };
}

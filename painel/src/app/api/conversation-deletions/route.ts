import { NextRequest, NextResponse } from "next/server";
import { sessionService } from "@/services/auth/session.service";
import { prisma } from "@/lib/prisma";
import { authorizationService, AuthorizationError } from "@/services/auth/authorization.service";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { conversationDeletionEnabled, conversationDeletionRepository, resolveDeletionScope, listDeletionReviews, importReviewedMessage } from "@/services/conversation-deletion.service";
import { ConversationDeletionError } from "@/services/conversation-deletion.repository";

const messages:Record<string,string>={NEW_MESSAGES_AFTER_PREVIEW:'Chegaram novas mensagens depois da prévia. Nada foi excluído. Gere uma nova prévia.',CONVERSATION_BUSY:'A conversa está sendo processada. Aguarde o término e tente novamente.',FINISH_HUMAN_ATTENDANCE_FIRST:'Finalize o atendimento humano antes de excluir ou retomar esta conversa.',MESSAGE_CHANGED_AFTER_PREVIEW:'A conversa mudou depois da prévia. Atualize a prévia antes de confirmar.',STALE_PREVIEW:'Esta prévia não pode mais ser usada. Gere uma nova prévia.',REVIEW_CONFLICT:'Este evento já foi revisado ou alterado. Atualize a lista.',STALE_DELETION:'A identidade ou exclusão deste evento precisa ser revalidada antes da retomada.',CONVERSATION_REQUIRES_BATCH_PROCESSING:'Esta conversa supera o limite de 5.000 mensagens desta etapa. Nenhum histórico foi apagado.',CONVERSATION_NOT_FOUND:'Conversa não encontrada nesta empresa.',NOT_FOUND:'Registro não encontrado nesta empresa.',INVALID_CONVERSATION:'Identificação da conversa inválida.'};
async function context(request:NextRequest){
  const selected=request.nextUrl.searchParams.get('companyId');
  let companyId:string,actor:{kind:'COMPANY_USER'|'PLATFORM_ADMIN';id:string},canDelete:boolean,canReview:boolean,userId:string|null;
  if(selected){
    if(!adminAuthService.isAuthorizedRequest(request))throw new AuthorizationError('Acesso administrativo não autorizado.');
    companyId=selected;actor={kind:'PLATFORM_ADMIN',id:'platform-admin'};canDelete=true;canReview=true;userId=null;
  }else{
    const token=request.cookies.get('m1m_session')?.value;
    if(!token)throw new ConversationDeletionError('SESSION_REQUIRED',401);
    try{await sessionService.verifyToken(token);}catch{throw new ConversationDeletionError('SESSION_REQUIRED',401);}
    const user=await authorizationService.getCurrentUser();companyId=user.companyId;userId=user.userId;
    // Capacidade nova exige concessao persistida; nao usa o atalho de isPrimary.
    canDelete=user.permissions.some(p=>String(p)==='DELETE_CONVERSATIONS');
    canReview=user.isPrimary||String(user.role)==='ADMIN';actor={kind:'COMPANY_USER',id:user.userId};
  }
  const company=await prisma.m1MCompany.findUnique({where:{id:companyId},select:{id:true,name:true,whatsappInstanceName:true}});
  if(!company)throw new ConversationDeletionError('NOT_FOUND',404);
  const instanceName=company.whatsappInstanceName?.trim();
  if(!instanceName)throw new ConversationDeletionError('WHATSAPP_INSTANCE_REQUIRED',400);
  return {company,companyId,instanceName,actor,canDelete,canReview,userId};
}
function failure(error:unknown){
  const status=error&&typeof error==='object'&&'code' in error&&error.code==='55P03'?409:error instanceof AuthorizationError?403:error instanceof ConversationDeletionError?error.status:500;
  const code=error instanceof ConversationDeletionError?error.code:'REQUEST_FAILED';
  return NextResponse.json({error:messages[code]??(status===403?'Você não possui autorização para esta ação.':'Não foi possível concluir a operação. Atualize e tente novamente.'),code},{status});
}
export async function GET(request:NextRequest){
  if(!conversationDeletionEnabled())return NextResponse.json({enabled:false,canDelete:false,canReview:false});
  try{
    const ctx=await context(request);
    if(!conversationDeletionEnabled())return NextResponse.json({enabled:false,canDelete:false,canReview:false});
    if(request.nextUrl.searchParams.get('reviews')==='1'){
      if(!ctx.canReview)throw new AuthorizationError();
      const offset=Number(request.nextUrl.searchParams.get('offset')??0);
      if(!Number.isSafeInteger(offset)||offset<0)throw new ConversationDeletionError('INVALID_OFFSET',400);
      return NextResponse.json(await listDeletionReviews(ctx.companyId,ctx.instanceName,offset),{headers:{'Cache-Control':'no-store'}});
    }
    const pendingCount=ctx.canReview?Number((await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) FROM m1m_conversation_deletion_reviews WHERE "companyId"=${ctx.companyId} AND "instanceName"=${ctx.instanceName} AND state='PENDING'`)[0].count):undefined;
    return NextResponse.json({enabled:true,canDelete:ctx.canDelete,canReview:ctx.canReview,company:ctx.company.name,instanceName:ctx.instanceName,pendingCount},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}
export async function POST(request:NextRequest){
  try{
    const ctx=await context(request);
    if(!conversationDeletionEnabled())throw new ConversationDeletionError('FEATURE_DISABLED',503);
    const origin=request.headers.get('origin');
    if(origin&&origin!==request.nextUrl.origin)throw new AuthorizationError();
    const body=await request.json().catch(()=>{throw new ConversationDeletionError('INVALID_BODY',400);});
    if(!body||typeof body!=='object'||Array.isArray(body))throw new ConversationDeletionError('INVALID_BODY',400);
    const action=body.action;
    if(action==='review'){
      if(!ctx.canReview)throw new AuthorizationError();
      if(!['RESUME','DISCARD'].includes(body.decision)||typeof body.reviewId!=='string'||!Number.isSafeInteger(body.version))throw new ConversationDeletionError('INVALID_BODY',400);
      const rows=await prisma.$queryRaw<{remoteJid:string}[]>`SELECT "remoteJid" FROM m1m_conversation_deletion_reviews WHERE id=${body.reviewId} AND "companyId"=${ctx.companyId} AND "instanceName"=${ctx.instanceName}`;
      if(!rows[0])throw new ConversationDeletionError('NOT_FOUND',404);
      const scope={companyId:ctx.companyId,instanceName:ctx.instanceName,remoteJid:rows[0].remoteJid};
      const target=body.targetRemoteJid?await resolveDeletionScope(ctx.companyId,ctx.instanceName,String(body.targetRemoteJid)):null;
      return NextResponse.json(await conversationDeletionRepository.decide(scope,body.reviewId,body.version,body.decision,ctx.actor,(db,event)=>importReviewedMessage(db,target?.scope??scope,event,ctx.actor),target?.scope));
    }
    if(!ctx.canDelete)throw new AuthorizationError();
    if(typeof body.remoteJid!=='string')throw new ConversationDeletionError('INVALID_BODY',400);
    const resolved=await resolveDeletionScope(ctx.companyId,ctx.instanceName,body.remoteJid);
    if(ctx.userId){
      const user=await authorizationService.getCurrentUser();
      if(!authorizationService.hasPermission(user,'VIEW_ALL_CONVERSATIONS')){
        const allowed=await prisma.m1MAttendance.findFirst({where:{companyId:ctx.companyId,customerId:resolved.customer.id,state:'HUMANO',sector:{sectorUsers:{some:{userId:ctx.userId}}},OR:[{responsibleId:null},{responsibleId:ctx.userId}]},select:{id:true}});
        if(!allowed)throw new AuthorizationError();
      }
    }
    if(action==='prepare'){
      if(typeof body.requestKey!=='string'||body.requestKey.length>100)throw new ConversationDeletionError('INVALID_BODY',400);
      const op=await conversationDeletionRepository.prepare({...resolved.scope,aliases:resolved.aliases,actor:ctx.actor,requestKey:body.requestKey});
      return NextResponse.json({id:op.id,version:op.version,state:op.state,messageCount:op.messageCount,conversation:resolved.customer.name||resolved.customer.phone||resolved.scope.remoteJid,remoteJid:resolved.scope.remoteJid,company:ctx.company.name,instanceName:ctx.instanceName});
    }
    if(typeof body.id!=='string'||!Number.isSafeInteger(body.version))throw new ConversationDeletionError('INVALID_BODY',400);
    const owner=await prisma.$queryRaw<{actorId:string;actorKind:string}[]>`SELECT "actorId","actorKind" FROM m1m_conversation_deletions WHERE id=${body.id} AND "companyId"=${ctx.companyId}`;
    if(!owner[0]||owner[0].actorId!==ctx.actor.id||owner[0].actorKind!==ctx.actor.kind)throw new AuthorizationError();
    if(action==='confirm'){
      const result=await conversationDeletionRepository.confirm(resolved.scope,body.id,body.version);
      const keys=await prisma.$queryRaw<{evolutionMessageId:string}[]>`SELECT "evolutionMessageId" FROM m1m_conversation_deletion_message_keys WHERE "deletionId"=${body.id} AND "companyId"=${ctx.companyId} AND "instanceName"=${ctx.instanceName}`;
      const globals=globalThis as typeof globalThis & {__m1mMediaCache?:Map<string,unknown>};
      for(const id of keys)for(const key of globals.__m1mMediaCache?.keys()??[])if(key.startsWith(`${ctx.instanceName}:${id.evolutionMessageId}:`))globals.__m1mMediaCache?.delete(key);
      return NextResponse.json(result);
    }
    if(action==='cancel')return NextResponse.json(await conversationDeletionRepository.cancel(resolved.scope,body.id,body.version));
    throw new ConversationDeletionError('INVALID_ACTION',400);
  }catch(error){return failure(error);}
}

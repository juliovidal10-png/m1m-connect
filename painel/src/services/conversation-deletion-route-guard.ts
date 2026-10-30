import { NextRequest, NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { prisma } from "@/lib/prisma";
import { canonicalDeletionScope, deletionMarker, withDeletionConversation } from "./conversation-deletion.service";
import { ConversationDeletionError } from "./conversation-deletion.repository";

export async function guardDeletionMutation(request:Request,worker:()=>Promise<NextResponse>,target:'remote'|'customer'|'attendance',authenticatedSend=false){
  try{
    const user=await authorizationService.getCurrentUser();
    const form=request.headers.get('content-type')?.includes('multipart/form-data');
    const body=form?Object.fromEntries((await request.clone().formData()).entries()):await request.clone().json();
    const company=await prisma.m1MCompany.findUnique({where:{id:user.companyId},select:{whatsappInstanceName:true}});
    if(!company?.whatsappInstanceName)return worker();
    let jid=typeof body.remoteJid==='string'?body.remoteJid:'';
    if(target==='customer'&&typeof body.customerId==='string'&&body.customerId){
      const customer=await prisma.m1MCustomer.findFirst({where:{id:body.customerId,companyId:user.companyId},select:{remoteJid:true}});
      if(!customer)return NextResponse.json({error:'Cliente não encontrado.'},{status:404});jid=customer.remoteJid;
    }
    if(target==='attendance'){
      const attendance=await prisma.m1MAttendance.findFirst({where:{id:String(body.attendanceId??''),companyId:user.companyId},select:{customer:{select:{remoteJid:true}}}});
      if(!attendance)return NextResponse.json({error:'Atendimento não encontrado.'},{status:404});jid=attendance.customer.remoteJid;
    }
    if(!jid)return worker();
    const scope=await canonicalDeletionScope({companyId:user.companyId,instanceName:company.whatsappInstanceName.trim(),remoteJid:jid});
    return withDeletionConversation(scope,async()=>{
      const marker=await deletionMarker(scope);
      if(marker&&marker.state!=='RESUMED'&&(!authenticatedSend||marker.state!=='DELETED'))throw new ConversationDeletionError('CONVERSATION_DELETED',410);
      return worker();
    });
  }catch(error){
    return NextResponse.json({error:error instanceof ConversationDeletionError&&error.code==='CONVERSATION_DELETED'?'Esta conversa foi excluída. Use a revisão administrativa para retomar um evento.':'A conversa está em processamento ou não pode ser alterada. Atualize e tente novamente.'},{status:error instanceof ConversationDeletionError?error.status:409});
  }
}
export function asNextRequest(request:Request){return request as NextRequest;}

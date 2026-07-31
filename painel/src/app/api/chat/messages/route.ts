import { NextRequest, NextResponse } from "next/server";
import { conversationSyncService } from "@/services/conversation-sync.service";

export async function GET(request: NextRequest) {
  try {
    const remoteJid = request.nextUrl.searchParams.get("remoteJid");

    if (!remoteJid) {
      return NextResponse.json(
        { error: "remoteJid é obrigatório." },
        { status: 400 },
      );
    }

    const messages =
      await conversationSyncService.syncConversation(remoteJid);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Erro ao sincronizar mensagens:", error);

    return NextResponse.json(
      { error: "Erro ao sincronizar mensagens." },
      { status: 500 },
    );
  }
}

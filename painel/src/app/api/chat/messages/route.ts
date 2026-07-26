import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/evolution";

export async function GET(request: NextRequest) {
  try {
    const remoteJid = request.nextUrl.searchParams.get("remoteJid");

    if (!remoteJid) {
      return NextResponse.json(
        { error: "remoteJid é obrigatório." },
        { status: 400 },
      );
    }

    const messages = await getMessages(remoteJid);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);

    return NextResponse.json(
      { error: "Erro ao buscar mensagens." },
      { status: 500 },
    );
  }
}
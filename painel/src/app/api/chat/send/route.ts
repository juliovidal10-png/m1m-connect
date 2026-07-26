import { NextResponse } from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

export async function POST(request: Request) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: "Configuração da Evolution API não encontrada." },
        { status: 500 },
      );
    }

    const body = await request.json();

    const remoteJid = String(body.remoteJid ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!remoteJid) {
      return NextResponse.json(
        { error: "Conversa não identificada." },
        { status: 400 },
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Digite uma mensagem." },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${API_URL}/message/sendText/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          number: remoteJid,
          text,
        }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.error ||
            "Não foi possível enviar a mensagem.",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);

    return NextResponse.json(
      { error: "Erro interno ao enviar a mensagem." },
      { status: 500 },
    );
  }
}
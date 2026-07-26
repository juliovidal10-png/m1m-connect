import { NextResponse } from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(request: Request) {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: "Configuração da Evolution API não encontrada." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const instanceName = String(body.instanceName ?? "").trim();

    if (!instanceName) {
      return NextResponse.json(
        { error: "Informe o nome da conexão." },
        { status: 400 },
      );
    }

    const response = await fetch(`${API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.message ?? "Não foi possível criar a conexão.",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao criar instância:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar a conexão." },
      { status: 500 },
    );
  }
}
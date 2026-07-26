import { NextResponse } from "next/server";

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "Financeiro";

export async function GET() {
  try {
    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: "Configuração da Evolution API não encontrada." },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${API_URL}/chat/findChats/${INSTANCE_NAME}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          where: {},
          take: 20,
          skip: 0,
        }),
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Não foi possível buscar as conversas.",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar conversas:", error);

    return NextResponse.json(
      { error: "Erro interno ao buscar as conversas." },
      { status: 500 },
    );
  }
}
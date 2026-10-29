import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAgentInstructions } from "@/lib/agent-instructions";
import { authorizationService, AuthorizationError } from "@/services/auth/authorization.service";

export async function GET() {
  try {
    const user = await authorizationService.requireAdmin();
    const company = await prisma.m1MCompany.findUnique({
      where: { id: user.companyId }, select: { agentInstructions: true },
    });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    return NextResponse.json(company, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível carregar a instrução do agente." },
      { status: error instanceof AuthorizationError ? 403 : 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authorizationService.requireAdmin();
    let agentInstructions: string | null;
    try {
      const body = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "agentInstructions")) throw new Error("Envie somente a instrução do agente.");
      agentInstructions = normalizeAgentInstructions(body.agentInstructions);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Texto inválido." }, { status: 400 });
    }
    const company = await prisma.m1MCompany.update({
      where: { id: user.companyId }, data: { agentInstructions },
      select: { agentInstructions: true },
    });
    return NextResponse.json(company, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível salvar a instrução do agente." },
      { status: error instanceof AuthorizationError ? 403 : 500 });
  }
}

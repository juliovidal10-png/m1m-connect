import { NextRequest, NextResponse } from "next/server";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { prisma } from "@/lib/prisma";
import { normalizeAgentInstructions } from "@/lib/agent-instructions";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!adminAuthService.isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 401 });
  }
  try {
    const { companyId } = await context.params;
    const company = await prisma.m1MCompany.findUnique({
      where: { id: companyId }, select: { agentInstructions: true },
    });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    return NextResponse.json(company, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a instrução do agente." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!adminAuthService.isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 401 });
  }
  try {
    const { companyId } = await context.params;
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
      where: { id: companyId }, data: { agentInstructions }, select: { agentInstructions: true },
    });
    return NextResponse.json(company, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a instrução do agente." }, { status: 500 });
  }
}

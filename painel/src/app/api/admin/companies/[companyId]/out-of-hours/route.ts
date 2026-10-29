import { NextRequest, NextResponse } from "next/server";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { outOfHoursService } from "@/services/out-of-hours.service";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!adminAuthService.isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 401 });
  }
  try {
    const { companyId } = await context.params;
    return NextResponse.json({ message: await outOfHoursService.getCompanyMessage(companyId) },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a mensagem automática." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!adminAuthService.isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 401 });
  }
  try {
    const { companyId } = await context.params;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some((key) => key !== "message")) {
      return NextResponse.json({ error: "Envie somente a mensagem automática." }, { status: 400 });
    }
    return NextResponse.json(await outOfHoursService.updateCompanyMessage(companyId, body.message),
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a mensagem automática." }, { status: 500 });
  }
}

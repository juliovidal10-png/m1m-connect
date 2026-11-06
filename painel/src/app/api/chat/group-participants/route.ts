import { NextRequest, NextResponse } from "next/server";
import { authorizationService } from "@/services/auth/authorization.service";
import { companyRepository } from "@/repositories/company.repository";

export async function GET(request: NextRequest) {
  const groupJid = request.nextUrl.searchParams.get("groupJid")?.trim();
  if (!groupJid || !/^\d+(?:-\d+)?@g\.us$/.test(groupJid)) {
    return NextResponse.json({ error: "Grupo inválido." }, { status: 400 });
  }

  const { companyId } = await authorizationService.getCurrentUser();
  const company = await companyRepository.findById(companyId);
  const instance = company?.whatsappInstanceName?.trim();
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const apikey = process.env.EVOLUTION_API_KEY;
  if (!instance || !base || !apikey) return NextResponse.json([]);

  try {
    const response = await fetch(
      `${base}/group/participants/${encodeURIComponent(instance)}?groupJid=${encodeURIComponent(groupJid)}`,
      { headers: { apikey }, cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return NextResponse.json([], { status: 502 });

    const data = await response.json();
    if (!Array.isArray(data?.participants)) return NextResponse.json([], { status: 502 });

    const participants = data.participants.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== "object") return [];
      const { id, lid, phoneNumber, name, notify, verifiedName } = entry as Record<string, unknown>;
      const jids = [id, lid, phoneNumber].filter(
        (jid): jid is string => typeof jid === "string" && /^\d+(?::\d+)?@(?:lid|s\.whatsapp\.net)$/.test(jid),
      ).map((jid) => jid.replace(/:\d+@/, "@"));
      const names = [name, notify, verifiedName].filter(
        (candidate): candidate is string => typeof candidate === "string" && Boolean(candidate.trim()),
      );
      return jids.length ? [{ jids: [...new Set(jids)], names }] : [];
    });

    return NextResponse.json(participants, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}

"use client";

import { useEffect, useState } from "react";

type CompanyAiControlProps = {
  compact?: boolean;
  apiUrl?: string;
  adminMode?: boolean;
};

export default function CompanyAiControl({
  compact = false,
  apiUrl = "/api/company",
  adminMode = false,
}: CompanyAiControlProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!authorized || enabled === null || saving) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: !enabled }),
      });
      const data = await response.json();

      if (!response.ok || typeof data.aiEnabled !== "boolean") {
        throw new Error(data.error || "Falha ao alterar a IA.");
      }

      setEnabled(data.aiEnabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao alterar a IA.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    fetch(adminMode ? "/api/admin/session" : "/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthorized(
          adminMode ? data.authenticated === true : data.user?.role === "ADMIN" || data.user?.isPrimary === true
        );
      })
      .catch(() => setAuthorized(false));

    fetch(apiUrl, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.aiEnabled === "boolean") {
          setEnabled(data.aiEnabled);
        }
      })
      .catch(() => setEnabled(null));
  }, [apiUrl, adminMode]);

  return (
    <div className={compact
      ? "flex min-w-0 flex-wrap items-center gap-2"
      : "flex flex-col gap-4 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"}>
      <div className={compact ? "flex flex-wrap items-center gap-2" : "min-w-0"}>
        <p className={compact ? "text-xs font-semibold text-black/60" : "text-sm font-bold text-[#171717]"}>
          {compact ? "IA da empresa" : "Atendimento automático por IA"}
        </p>
        {!compact && <p className="mt-1 text-xs text-black/50">Controle geral da IA desta empresa.</p>}
        <span className={"inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold " +
          (enabled === null ? "bg-black/5 text-black/50" : enabled ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800")}>
          <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " +
            (enabled === null ? "bg-black/30" : enabled ? "bg-[#0A9090]" : "bg-amber-600")} />
          {enabled === null ? "Consultando IA..." : enabled ? "IA ligada" : "IA pausada"}
        </span>
      </div>
      {authorized && enabled !== null && (
        <button type="button" onClick={() => void toggle()} disabled={saving}
          className={"inline-flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-bold transition disabled:opacity-50 " +
            (enabled ? "border-black/10 bg-white text-black/65 hover:border-teal-200 hover:text-teal-700" : "border-[#0A9090] bg-[#0A9090] text-white hover:bg-[#087B7B]")}>
          {saving ? "Salvando..." : enabled ? "Pausar IA" : "Ligar IA"}
        </button>
      )}
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
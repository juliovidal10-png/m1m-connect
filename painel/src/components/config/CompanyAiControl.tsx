"use client";

import { useEffect, useState } from "react";

type CompanyAiControlProps = {
  compact?: boolean;
};

export default function CompanyAiControl({
  compact = false,
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
      const response = await fetch("/api/company", {
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
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthorized(
          data.user?.role === "ADMIN" || data.user?.isPrimary === true
        );
      })
      .catch(() => setAuthorized(false));

    fetch("/api/company", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.aiEnabled === "boolean") {
          setEnabled(data.aiEnabled);
        }
      })
      .catch(() => setEnabled(null));
  }, []);

  return (
    <div>
      <p>{compact ? "IA da empresa" : "Atendimento automático por IA"}</p>
      <p>
        {enabled === null
          ? "Consultando IA..."
          : enabled
            ? "IA ligada"
            : "IA pausada"}
      </p>
      {authorized && enabled !== null && (
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={saving}
          className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : enabled ? "Pausar IA" : "Ligar IA"}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
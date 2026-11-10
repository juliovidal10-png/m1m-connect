"use client";

import { useState } from "react";

export default function ManualContactRemoval({
  customerId,
  name,
  onRemoved,
}: {
  customerId: string;
  name: string;
  onRemoved: (customerId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !window.confirm(`Excluir o cadastro manual de ${name}?`)) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.removed !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : "Não foi possível confirmar a exclusão. Atualize a lista antes de tentar novamente.");
      }
      onRemoved(customerId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível excluir o cadastro manual.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Excluindo..." : "Excluir cadastro manual"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

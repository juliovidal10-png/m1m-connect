"use client";

import { useEffect, useState } from "react";
import CompanyAiControl from "./CompanyAiControl";
import { MAX_AGENT_INSTRUCTIONS_LENGTH } from "@/lib/agent-instructions";

export default function AgentInstructionsSettings({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/agent-instructions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao carregar.");
        if (!controller.signal.aborted) { setText(data.agentInstructions || ""); setLoaded(true); }
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, []);

  async function save() {
    if (!loaded || saving) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/agent-instructions", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentInstructions: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar.");
      setText(data.agentInstructions || ""); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  }

  return <section className="space-y-5">
    <button type="button" onClick={onBack} className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700">← Voltar para configurações</button>
    <h2 className="text-xl font-bold">Agente de IA</h2>
    <CompanyAiControl />
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
      <label htmlFor="agent-instructions" className="block font-semibold">Instrução do agente</label>
      <p className="text-sm text-black/60">Oriente o comportamento, a concisão, as perguntas necessárias, os limites e os encaminhamentos desta empresa. Cadastre produtos e informações do negócio na área de conhecimento.</p>
      <textarea id="agent-instructions" rows={16} maxLength={MAX_AGENT_INSTRUCTIONS_LENGTH}
        disabled={!loaded || saving} value={text}
        onChange={(event) => { setText(event.target.value); setSaved(false); }}
        className="w-full rounded-xl border border-black/15 p-4 disabled:opacity-50" />
      <p className="text-xs text-black/50">{text.length.toLocaleString("pt-BR")} / 20.000 caracteres. Após salvar, a instrução vale para as próximas respostas geradas.</p>
      <button type="button" disabled={!loaded || saving} onClick={() => void save()}
        className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
        {saving ? "Salvando..." : "Salvar instrução"}
      </button>
      {saved && <p role="status" className="text-sm text-teal-700">Instrução salva para esta empresa.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  </section>;
}

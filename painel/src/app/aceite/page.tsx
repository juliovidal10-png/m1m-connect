"use client";

import Link from "next/link";
import { useState } from "react";

export default function AceitePage() {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!checked || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/legal-acceptance", {
        method: "POST",
      });

      const result = (await response.json()) as {
        accepted?: boolean;
        error?: string;
      };

      if (!response.ok || !result.accepted) {
        throw new Error(
          result.error ||
            "Não foi possível registrar o aceite.",
        );
      }

      window.location.assign("/");
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Não foi possível registrar o aceite.",
      );
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f5f6f7] px-4 py-8 text-[#171717] sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-[30px] border border-black/[0.06] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex justify-center">
            <img
              src="/m1m-connect-aceite-logo.png"
              alt="M1M Connect"
              className="h-auto w-[235px] max-w-full object-contain"
            />
          </div>

          <div className="mt-7 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087B7B]">
              Aceite eletrônico
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-[-0.03em]">
              Termos para utilização do M1M Connect
            </h1>

            <p className="mx-auto mt-3 max-w-[380px] text-sm leading-6 text-black/50">
              Para continuar, o responsável pela empresa deve confirmar a leitura e o aceite das condições legais vigentes.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/termos"
              target="_blank"
              className="rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 py-4 text-sm font-bold transition hover:border-[#087B7B]/30 hover:bg-white"
            >
              Termos de Uso
            </Link>

            <Link
              href="/privacidade"
              target="_blank"
              className="rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 py-4 text-sm font-bold transition hover:border-[#087B7B]/30 hover:bg-white"
            >
              Política de Privacidade
            </Link>

            <Link
              href="/whatsapp"
              target="_blank"
              className="rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 py-4 text-sm font-bold transition hover:border-[#087B7B]/30 hover:bg-white"
            >
              Condições do WhatsApp
            </Link>

            <Link
              href="/lgpd"
              target="_blank"
              className="rounded-2xl border border-black/[0.08] bg-[#fafafa] px-4 py-4 text-sm font-bold transition hover:border-[#087B7B]/30 hover:bg-white"
            >
              LGPD
            </Link>
          </div>

          <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.08] bg-[#f8fafb] p-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#087B7B]"
            />

            <span className="text-sm leading-6 text-black/65">
              Li e aceito os Termos de Uso, a Política de Privacidade/LGPD e as condições de utilização do WhatsApp no M1M Connect.
            </span>
          </label>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!checked || saving}
            onClick={handleAccept}
            className="mt-5 w-full rounded-2xl bg-[#171717] px-5 py-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35"
          >
            {saving
              ? "Registrando aceite..."
              : "Li e aceito"}
          </button>

          <p className="mt-2.5 text-center text-xs leading-5 text-black/35">
            Documento: M1M_CONNECT_LEGAL_TERMS · Versão 1.0
          </p>
        </section>
      </div>
    </main>
  );
}

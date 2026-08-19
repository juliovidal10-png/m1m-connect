"use client";

import { useState } from "react";

type ChatCustomerQuickPanelProps = {
  name: string;
  phone: string;
  company: string | null;
  city: string | null;
  responsible: string | null;
  attendanceStatus: string | null;
  customerId: string | null;
  canAssumeAttendance: boolean;
  onAssigned: () => Promise<void> | void;
  onClose: () => void;
};

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#f7f7f8] px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-black/35">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-[#171717]">
        {value?.trim() || "Não informado"}
      </p>
    </div>
  );
}

export default function ChatCustomerQuickPanel({
  name,
  phone,
  company,
  city,
  responsible,
  attendanceStatus,
  customerId,
  canAssumeAttendance,
  onAssigned,
  onClose,
}: ChatCustomerQuickPanelProps) {
  const human =
    attendanceStatus === "HUMANO";

  const [isAssigning, setIsAssigning] =
    useState(false);
  const [assignError, setAssignError] =
    useState("");

  async function handleAssumeAttendance() {
    if (!customerId || isAssigning) return;

    setIsAssigning(true);
    setAssignError("");

    try {
      const response = await fetch(
        "/api/customers/assign",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ customerId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível assumir o atendimento.",
        );
      }

      await onAssigned();
    } catch (error) {
      setAssignError(
        error instanceof Error
          ? error.message
          : "Erro ao assumir o atendimento.",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-black/5 bg-white">
      <header className="flex min-h-20 items-center justify-between gap-3 border-b border-black/5 px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087B7B]">
            Cliente 360°
          </p>

          <h3 className="mt-1 truncate text-base font-bold text-[#171717]">
            {name}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Fechar Cliente 360"
          aria-label="Fechar Cliente 360"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg text-black/40 transition hover:border-[#0A9090]/25 hover:bg-[#F2FAFA] hover:text-[#087B7B]"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[#171717]">
                {name}
              </p>

              <p className="mt-1 text-xs text-black/45">
                {phone}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${
                human
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : "border-teal-100 bg-teal-50 text-teal-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  human
                    ? "bg-blue-500"
                    : "bg-teal-500"
                }`}
              />
              {human ? "Humano" : "IA"}
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            <InfoRow
              label="Empresa"
              value={company}
            />

            <InfoRow
              label="Cidade"
              value={city}
            />

            <InfoRow
              label="Responsável"
              value={responsible}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#0A9090]/10 bg-[#F8FCFC] p-4">
          <p className="text-xs font-bold text-[#087B7B]">
            Atendimento integrado
          </p>

          <p className="mt-1 text-xs leading-5 text-black/45">
            Consulte rapidamente os principais dados do cliente sem sair da conversa.
          </p>
        </div>
      </div>
    
      {canAssumeAttendance && (
        <div className="mt-auto border-t border-black/5 p-4">
          <button
            type="button"
            onClick={handleAssumeAttendance}
            disabled={!customerId || isAssigning}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0A9090] px-4 text-sm font-semibold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAssigning
              ? "Assumindo atendimento..."
              : "Assumir atendimento"}
          </button>

          {assignError && (
            <p className="mt-2 text-xs font-medium text-red-600">
              {assignError}
            </p>
          )}
        </div>
      )}
</aside>
  );
}

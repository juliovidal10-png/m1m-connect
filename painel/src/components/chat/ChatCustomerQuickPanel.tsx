"use client";

type ChatCustomerQuickPanelProps = {
  name: string;
  phone: string;
  company: string | null;
  city: string | null;
  responsible: string | null;
  attendanceStatus: string | null;
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
  onClose,
}: ChatCustomerQuickPanelProps) {
  const human =
    attendanceStatus === "HUMANO";

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-black/5 bg-white">
      <header className="flex min-h-20 items-center justify-between gap-3 border-b border-black/5 px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e93800]">
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg text-black/40 transition hover:border-[#ff3d00]/25 hover:bg-[#fff5f1] hover:text-[#e93800]"
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
                  : "border-orange-100 bg-orange-50 text-orange-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  human
                    ? "bg-blue-500"
                    : "bg-orange-500"
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

        <div className="mt-4 rounded-2xl border border-[#ff3d00]/10 bg-[#fffaf8] p-4">
          <p className="text-xs font-bold text-[#e93800]">
            Atendimento integrado
          </p>

          <p className="mt-1 text-xs leading-5 text-black/45">
            Consulte rapidamente os principais dados do cliente sem sair da conversa.
          </p>
        </div>
      </div>
    </aside>
  );
}

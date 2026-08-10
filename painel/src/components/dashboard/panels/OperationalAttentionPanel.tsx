"use client";

type OperationalAttentionPanelProps = {
  overdueReminders: number;
  pendingReceipts: number;
  waitingCustomers: number;
};

type AttentionItemProps = {
  color: "red" | "amber" | "green";
  title: string;
  description: string;
};

function AttentionItem({
  color,
  title,
  description,
}: AttentionItemProps) {
  const colors = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-emerald-500",
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-black/5 bg-white p-4">
      <span
        className={`mt-1 h-3 w-3 rounded-full ${colors[color]}`}
      />

      <div>
        <p className="text-sm font-semibold text-[#171717]">
          {title}
        </p>

        <p className="mt-1 text-xs text-black/50">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function OperationalAttentionPanel({
  overdueReminders,
  pendingReceipts,
  waitingCustomers,
}: OperationalAttentionPanelProps) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/35">
            Prioridades
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#171717]">
            O que precisa da sua atenção
          </h2>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <AttentionItem
          color={pendingReceipts > 0 ? "red" : "green"}
          title={
            pendingReceipts > 0
              ? `${pendingReceipts} comprovante(s) aguardando análise`
              : "Nenhum comprovante pendente"
          }
          description="Financeiro"
        />

        <AttentionItem
          color={waitingCustomers > 0 ? "amber" : "green"}
          title={
            waitingCustomers > 0
              ? `${waitingCustomers} cliente(s) aguardando atendimento`
              : "Nenhum cliente aguardando"
          }
          description="Atendimento"
        />

        <AttentionItem
          color={overdueReminders > 0 ? "amber" : "green"}
          title={
            overdueReminders > 0
              ? `${overdueReminders} lembrete(s) vencido(s)`
              : "Nenhum lembrete vencido"
          }
          description="Agenda"
        />
      </div>
    </section>
  );
}
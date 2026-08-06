"use client";

type CustomerSummaryProps = {
  messages: number;
  receipts: number;
  reminders: number;
  attendances: number;
  customerSince?: string;
  lastActivity?: string;
};

type CardProps = {
  title: string;
  value: string | number;
};

function SummaryCard({
  title,
  value,
}: CardProps) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-black">
        {value}
      </p>
    </div>
  );
}

export default function CustomerSummary({
  messages,
  receipts,
  reminders,
  attendances,
  customerSince,
  lastActivity,
}: CustomerSummaryProps) {
  return (
    <div className="mt-5">

      <h3 className="mb-4 text-lg font-bold">
        Resumo do Cliente
      </h3>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        <SummaryCard
          title="Mensagens"
          value={messages}
        />

        <SummaryCard
          title="Comprovantes"
          value={receipts}
        />

        <SummaryCard
          title="Pendências"
          value={reminders}
        />

        <SummaryCard
          title="Atendimentos"
          value={attendances}
        />

        <SummaryCard
          title="Cliente desde"
          value={
            customerSince ??
            "-"
          }
        />

        <SummaryCard
          title="Última atividade"
          value={
            lastActivity ??
            "-"
          }
        />

      </div>

    </div>
  );
}
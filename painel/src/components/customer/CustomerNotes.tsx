"use client";

type CustomerNotesProps = {
  value: string;
  isSaving?: boolean;
  onChange: (
    value: string,
  ) => void;
  onSave: () => void;
};

export default function CustomerNotes({
  value,
  isSaving = false,
  onChange,
  onSave,
}: CustomerNotesProps) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">

      <div className="mb-5">

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
          CRM
        </p>

        <h3 className="mt-1 text-lg font-bold">
          Observações do Cliente
        </h3>

        <p className="mt-2 text-sm text-black/55">
          Informações internas utilizadas pela equipe durante os
          atendimentos.
        </p>

      </div>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        rows={10}
        placeholder="Digite observações importantes sobre este cliente..."
        className="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-4 text-sm leading-6 outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
      />

      <div className="mt-5 flex justify-end">

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-[#ff3d00] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Salvando..."
            : "Salvar observações"}
        </button>

      </div>

    </section>
  );
}
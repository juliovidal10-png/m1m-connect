"use client";

import {
  formatReminderDate,
  isReminderOverdue,
} from "./customer-utils";

export type ReminderRecord = {
  id: string;
  title: string;
  description?: string | null;
  remindAt: string;
  responsible?: string | null;
};

type CustomerRemindersProps = {
  reminders: ReminderRecord[];

  reminderTitle: string;
  reminderDescription: string;
  reminderDate: string;
  reminderTime: string;
  reminderResponsible: string;

  isLoading: boolean;
  isSaving: boolean;

  completingReminderId: string | null;

  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;

  onSave: () => void;

  onComplete: (
    reminderId: string,
  ) => void;
};

export default function CustomerReminders({
  reminders,

  reminderTitle,
  reminderDescription,
  reminderDate,
  reminderTime,
  reminderResponsible,

  isLoading,
  isSaving,

  completingReminderId,

  onTitleChange,
  onDescriptionChange,
  onDateChange,
  onTimeChange,
  onResponsibleChange,

  onSave,
  onComplete,
}: CustomerRemindersProps) {
  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
              Pendentes
            </p>

            <h3 className="mt-1 text-lg font-bold">
              {reminders.length}{" "}
              {reminders.length === 1
                ? "lembrete"
                : "lembretes"}
            </h3>
          </div>

          {isLoading && (
            <span className="text-xs text-black/40">
              Atualizando...
            </span>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-black/10 bg-white px-4 py-5 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-6 w-6 text-black/35"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="3"
              />
              <path d="M8.5 12.2 11 14.7 15.8 9.8" />
            </svg>

            <p className="mt-2 text-sm font-semibold">
              Nenhum lembrete pendente
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {reminders.map(
              (reminder) => {
                const overdue =
                  isReminderOverdue(
                    reminder.remindAt,
                  );

                const isCompleting =
                  completingReminderId ===
                  reminder.id;

                return (
                  <article
                    key={reminder.id}
                    className={`rounded-xl border p-4 ${
                      overdue
                        ? "border-red-200 bg-red-50"
                        : "border-orange-200 bg-orange-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          overdue
                            ? "bg-red-100"
                            : "bg-orange-100"
                        }`}
                      >
                        {overdue
                          ? "⚠️"
                          : "⏰"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold">
                              {reminder.title}
                            </h4>

                            <p
                              className={`mt-1 text-xs font-semibold ${
                                overdue
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {formatReminderDate(
                                reminder.remindAt,
                              )}
                            </p>
                          </div>

                          {overdue && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-600">
                              Atrasado
                            </span>
                          )}
                        </div>

                        {reminder.description && (
                          <p className="mt-3 text-sm leading-5 text-black/60">
                            {reminder.description}
                          </p>
                        )}

                        {reminder.responsible && (
                          <p className="mt-3 text-xs text-black/45">
                            Responsável:
                            <strong className="ml-1 text-black/65">
                              {reminder.responsible}
                            </strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        completingReminderId !==
                        null
                      }
                      onClick={() =>
                        onComplete(
                          reminder.id,
                        )
                      }
                      className="mt-4 h-10 w-full rounded-xl border border-green-300 bg-green-50 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCompleting
                        ? "Concluindo..."
                        : "✓ Concluir lembrete"}
                    </button>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
            Novo lembrete
          </p>

          <h3 className="mt-1 text-base font-bold">
            Agendar retorno
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/40">
              Título
            </label>

            <input
              value={reminderTitle}
              onChange={(event) =>
                onTitleChange(
                  event.target.value,
                )
              }
              placeholder="Ex.: Ligar para o cliente"
              className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/40">
              Descrição opcional
            </label>

            <textarea
              rows={3}
              value={reminderDescription}
              onChange={(event) =>
                onDescriptionChange(
                  event.target.value,
                )
              }
              placeholder="Ex.: Cliente pediu retorno sobre o orçamento."
              className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/40">
                Data
              </label>

              <input
                type="date"
                value={reminderDate}
                onChange={(event) =>
                  onDateChange(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/40">
                Horário
              </label>

              <input
                type="time"
                value={reminderTime}
                onChange={(event) =>
                  onTimeChange(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/40">
              Responsável
            </label>

            <select
              value={reminderResponsible}
              onChange={(event) =>
                onResponsibleChange(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
            >
              <option value="Julinho">
                Julinho
              </option>

              <option value="">
                Sem responsável
              </option>
            </select>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="h-11 w-full rounded-xl bg-[#ff3d00] text-sm font-semibold text-white transition hover:bg-[#e93800] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Salvando..."
              : "Salvar lembrete"}
          </button>
        </div>
      </section>
    </div>
  );
}

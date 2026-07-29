"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ReminderRecord = {
  id: string;
  title: string;
  remindAt: string;
  status: string;
  responsible?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    remoteJid?: string | null;
  } | null;
};

function isReminderOverdue(
  reminder: ReminderRecord,
) {
  const remindAt = new Date(
    reminder.remindAt,
  );

  return (
    reminder.status === "PENDING" &&
    !Number.isNaN(remindAt.getTime()) &&
    remindAt.getTime() < Date.now()
  );
}

function formatDelay(remindAt: string) {
  const reminderDate = new Date(remindAt);

  if (
    Number.isNaN(
      reminderDate.getTime(),
    )
  ) {
    return "Horário indisponível";
  }

  const delay =
    Date.now() -
    reminderDate.getTime();

  const minutes = Math.max(
    1,
    Math.floor(delay / 60_000),
  );

  if (minutes < 60) {
    return `Atrasado há ${minutes} minuto${
      minutes === 1 ? "" : "s"
    }`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `Atrasado há ${hours} hora${
      hours === 1 ? "" : "s"
    }`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `Atrasado há ${days} dia${
    days === 1 ? "" : "s"
  }`;
}

export default function CentralPendencias() {
  const [reminders, setReminders] =
    useState<ReminderRecord[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);

  const [isOpen, setIsOpen] =
    useState(false);

  const [
    completingReminderId,
    setCompletingReminderId,
  ] = useState<string | null>(null);

  const [
    postponingReminderId,
    setPostponingReminderId,
  ] = useState<string | null>(null);

  const [
    reminderBeingPostponed,
    setReminderBeingPostponed,
  ] = useState<string | null>(null);

  const loadReminders =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/reminders",
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Erro ao carregar pendências.",
          );
        }

        setReminders(
          Array.isArray(data)
            ? data
            : [],
        );

        setHasError(false);
      } catch (error) {
        console.error(
          "Erro ao carregar a Central de Pendências:",
          error,
        );

        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadReminders();

    const intervalId =
      window.setInterval(
        loadReminders,
        60_000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [loadReminders]);

  const overdueReminders =
    useMemo(
      () =>
        reminders
          .filter(
            isReminderOverdue,
          )
          .sort(
            (
              firstReminder,
              secondReminder,
            ) =>
              new Date(
                firstReminder.remindAt,
              ).getTime() -
              new Date(
                secondReminder.remindAt,
              ).getTime(),
          ),
      [reminders],
    );

  const overdueCount =
    overdueReminders.length;

  const hasOverdueReminders =
    overdueCount > 0;

  async function handlePostponeReminder(
    reminderId: string,
    minutesToPostpone: number,
  ) {
    if (
      postponingReminderId ||
      completingReminderId
    ) {
      return;
    }

    setPostponingReminderId(
      reminderId,
    );

    try {
      const remindAt = new Date(
        Date.now() +
          minutesToPostpone *
            60_000,
      ).toISOString();

      const response = await fetch(
        "/api/reminders",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: reminderId,
            action: "postpone",
            remindAt,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível adiar o lembrete.",
        );
      }

      setReminders(
        (currentReminders) =>
          currentReminders.map(
            (reminder) =>
              reminder.id ===
              reminderId
                ? {
                    ...reminder,
                    remindAt:
                      data.remindAt ||
                      remindAt,
                    status:
                      data.status ||
                      "PENDING",
                  }
                : reminder,
          ),
      );

      setReminderBeingPostponed(
        null,
      );
    } catch (error) {
      console.error(
        "Erro ao adiar lembrete:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Erro ao adiar o lembrete.",
      );
    } finally {
      setPostponingReminderId(
        null,
      );
    }
  }

  async function handleCompleteReminder(
    reminderId: string,
  ) {
    if (completingReminderId) {
      return;
    }

    setCompletingReminderId(
      reminderId,
    );

    try {
      const response = await fetch(
        "/api/reminders",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: reminderId,
            action: "complete",
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível concluir o lembrete.",
        );
      }

      setReminders(
        (currentReminders) =>
          currentReminders.filter(
            (reminder) =>
              reminder.id !==
              reminderId,
          ),
      );
    } catch (error) {
      console.error(
        "Erro ao concluir lembrete:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Erro ao concluir o lembrete.",
      );
    } finally {
      setCompletingReminderId(
        null,
      );
    }
  }

  return (
    <section className="border-b border-gray-200 p-4">
      <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
        <button
          type="button"
          onClick={() =>
            setIsOpen(
              (currentValue) =>
                !currentValue,
            )
          }
          aria-expanded={isOpen}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="text-lg"
              >
                🔔
              </span>

              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                Central de Pendências
              </p>
            </div>

            <span
              aria-hidden="true"
              className="text-sm font-bold text-orange-700"
            >
              {isOpen ? "▲" : "▼"}
            </span>
          </div>

          <div
            className={`mt-3 rounded-xl border bg-white px-3 py-3 ${
              hasOverdueReminders
                ? "border-red-200"
                : "border-green-100"
            }`}
          >
            {isLoading ? (
              <p className="text-sm font-semibold text-gray-500">
                Atualizando pendências...
              </p>
            ) : hasError ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <span aria-hidden="true">
                  ⚠️
                </span>
                Não foi possível carregar
              </p>
            ) : hasOverdueReminders ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <span aria-hidden="true">
                    🔴
                  </span>

                  {overdueCount} retorno
                  {overdueCount === 1
                    ? ""
                    : "s"}{" "}
                  atrasado
                  {overdueCount === 1
                    ? ""
                    : "s"}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Clique para visualizar.
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <span aria-hidden="true">
                    ✅
                  </span>
                  Nenhuma pendência
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Nenhum retorno está atrasado neste momento.
                </p>
              </>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="mt-3">
            {hasError ? (
              <button
                type="button"
                onClick={loadReminders}
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                Tentar novamente
              </button>
            ) : overdueReminders.length ===
              0 ? (
              <p className="rounded-xl bg-white px-3 py-3 text-xs text-gray-500">
                Não há retornos atrasados.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {overdueReminders.map(
                  (reminder) => (
                    <article
                      key={reminder.id}
                      className="rounded-xl border border-red-100 bg-white p-3"
                    >
                      <p className="truncate text-sm font-bold text-gray-900">
                        {reminder.customer
                          ?.name?.trim() ||
                          reminder.customer
                            ?.phone ||
                          "Cliente"}
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-gray-600">
                        {reminder.title}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-red-700">
                        {formatDelay(
                          reminder.remindAt,
                        )}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            !reminder.customer
                              ?.remoteJid
                          }
                          onClick={() => {
                            const remoteJid =
                              reminder.customer
                                ?.remoteJid;

                            if (!remoteJid) {
                              return;
                            }

                            window.dispatchEvent(
                              new CustomEvent(
                                "m1m:open-chat",
                                {
                                  detail: {
                                    remoteJid,
                                  },
                                },
                              ),
                            );

                            setIsOpen(false);
                          }}
                          className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Abrir atendimento
                        </button>

                        <button
                          type="button"
                          disabled={
                            completingReminderId !==
                              null ||
                            postponingReminderId !==
                              null
                          }
                          onClick={() =>
                            handleCompleteReminder(
                              reminder.id,
                            )
                          }
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {completingReminderId ===
                          reminder.id
                            ? "Concluindo..."
                            : "Concluir"}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={
                          completingReminderId !==
                            null ||
                          postponingReminderId !==
                            null
                        }
                        onClick={() =>
                          setReminderBeingPostponed(
                            (currentReminderId) =>
                              currentReminderId ===
                              reminder.id
                                ? null
                                : reminder.id,
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reminderBeingPostponed ===
                        reminder.id
                          ? "Fechar opções"
                          : "Adiar"}
                      </button>

                      {reminderBeingPostponed ===
                        reminder.id && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={
                              postponingReminderId !==
                              null
                            }
                            onClick={() =>
                              handlePostponeReminder(
                                reminder.id,
                                30,
                              )
                            }
                            className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            30 min
                          </button>

                          <button
                            type="button"
                            disabled={
                              postponingReminderId !==
                              null
                            }
                            onClick={() =>
                              handlePostponeReminder(
                                reminder.id,
                                60,
                              )
                            }
                            className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            1 hora
                          </button>

                          <button
                            type="button"
                            disabled={
                              postponingReminderId !==
                              null
                            }
                            onClick={() =>
                              handlePostponeReminder(
                                reminder.id,
                                24 * 60,
                              )
                            }
                            className="rounded-lg border border-blue-100 bg-white px-2 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            1 dia
                          </button>
                        </div>
                      )}

                      {postponingReminderId ===
                        reminder.id && (
                        <p className="mt-2 text-center text-xs font-semibold text-blue-700">
                          Adiando lembrete...
                        </p>
                      )}
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
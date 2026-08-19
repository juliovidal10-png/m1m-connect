"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

type CompanySchedule = {
  dayOfWeek: Weekday;
  enabled: boolean;
  allDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
  secondOpeningTime: string | null;
  secondClosingTime: string | null;
};

type ScheduleForm = {
  dayOfWeek: Weekday;
  enabled: boolean;
  allDay: boolean;
  closesForLunch: boolean;
  openingTime: string;
  closingTime: string;
  secondOpeningTime: string;
  secondClosingTime: string;
};

type CompanySchedulesResponse = {
  company: {
    id: string;
    name: string;
  };
  schedules: CompanySchedule[];
};

type CompanySchedulesSettingsProps = {
  onBack: () => void;
};

const weekdayLabels: Record<Weekday, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export default function CompanySchedulesSettings({
  onBack,
}: CompanySchedulesSettingsProps) {
  const [companyName, setCompanyName] =
    useState("");

  const [schedules, setSchedules] =
    useState<ScheduleForm[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadSchedules =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/company/schedules",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            | CompanySchedulesResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data &&
              data.error
              ? data.error
              : "Não foi possível carregar os horários.",
          );
        }

        const result =
          data as CompanySchedulesResponse;

        setCompanyName(
          result.company.name,
        );

        setSchedules(
          result.schedules.map(
            (schedule) => ({
              dayOfWeek:
                schedule.dayOfWeek,
              enabled:
                schedule.enabled,
              allDay:
                schedule.allDay,
              closesForLunch:
                Boolean(
                  schedule.secondOpeningTime &&
                    schedule.secondClosingTime,
                ),
              openingTime:
                schedule.openingTime ?? "",
              closingTime:
                schedule.closingTime ?? "",
              secondOpeningTime:
                schedule.secondOpeningTime ?? "",
              secondClosingTime:
                schedule.secondClosingTime ?? "",
            }),
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar os horários.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  function updateSchedule(
    dayOfWeek: Weekday,
    field: keyof ScheduleForm,
    value: string | boolean,
  ) {
    setSchedules((current) =>
      current.map((schedule) => {
        if (
          schedule.dayOfWeek !==
          dayOfWeek
        ) {
          return schedule;
        }

        if (
          field === "enabled" &&
          value === false
        ) {
          return {
            ...schedule,
            enabled: false,
            allDay: false,
            closesForLunch: false,
            openingTime: "",
            closingTime: "",
            secondOpeningTime: "",
            secondClosingTime: "",
          };
        }

        if (
          field === "allDay" &&
          value === true
        ) {
          return {
            ...schedule,
            allDay: true,
            closesForLunch: false,
            openingTime: "",
            closingTime: "",
            secondOpeningTime: "",
            secondClosingTime: "",
          };
        }

        if (
          field === "closesForLunch" &&
          value === false
        ) {
          return {
            ...schedule,
            closesForLunch: false,
            secondOpeningTime: "",
            secondClosingTime: "",
          };
        }

        return {
          ...schedule,
          [field]: value,
        };
      }),
    );

    setError(null);
    setSuccess(null);
  }

  async function saveSchedules() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/company/schedules",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            schedules:
              schedules.map(
                (schedule) => ({
                  dayOfWeek:
                    schedule.dayOfWeek,
                  enabled:
                    schedule.enabled,
                  allDay:
                    schedule.allDay,
                  openingTime:
                    schedule.allDay
                      ? null
                      : schedule.openingTime ||
                        null,
                  closingTime:
                    schedule.allDay
                      ? null
                      : schedule.closingTime ||
                        null,
                  secondOpeningTime:
                    !schedule.allDay &&
                    schedule.closesForLunch
                      ? schedule.secondOpeningTime ||
                        null
                      : null,
                  secondClosingTime:
                    !schedule.allDay &&
                    schedule.closesForLunch
                      ? schedule.secondClosingTime ||
                        null
                      : null,
                }),
              ),
          }),
        },
      );

      const data =
        (await response.json()) as {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar os horários.",
        );
      }

      setSuccess(
        "Horário geral da empresa salvo com sucesso.",
      );

      await loadSchedules();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar os horários.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700"
      >
        ← Voltar para configurações
      </button>

      <section className="rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 lg:p-8">
          <p className="text-sm font-semibold text-teal-600">
            Horário geral da empresa
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Atendimento de {companyName || "sua empresa"}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Este é o horário padrão da empresa. Um setor
            só utilizará outro horário quando tiver uma
            configuração específica.
          </p>
        </div>

        <div className="p-6 lg:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl bg-black/5"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <article
                  key={schedule.dayOfWeek}
                  className="rounded-2xl border border-black/5 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="font-bold">
                        {weekdayLabels[
                          schedule.dayOfWeek
                        ]}
                      </h3>

                      <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-black/60">
                        <input
                          type="checkbox"
                          checked={
                            schedule.enabled
                          }
                          onChange={(event) =>
                            updateSchedule(
                              schedule.dayOfWeek,
                              "enabled",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 accent-teal-600"
                        />

                        Empresa aberta neste dia
                      </label>
                    </div>

                    {schedule.enabled && (
                      <label className="flex items-center gap-3 text-sm font-semibold text-black/60">
                        <input
                          type="checkbox"
                          checked={
                            schedule.allDay
                          }
                          onChange={(event) =>
                            updateSchedule(
                              schedule.dayOfWeek,
                              "allDay",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 accent-teal-600"
                        />

                        Atendimento 24 horas
                      </label>
                    )}
                  </div>

                  {schedule.enabled &&
                    !schedule.allDay && (
                      <div className="mt-5">
                        <label className="flex items-center gap-3 text-sm font-semibold text-black/60">
                          <input
                            type="checkbox"
                            checked={
                              schedule.closesForLunch
                            }
                            onChange={(event) =>
                              updateSchedule(
                                schedule.dayOfWeek,
                                "closesForLunch",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-teal-600"
                          />

                          Fecha para almoço
                        </label>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {[
                            ["Abertura", "openingTime"],
                            ["Fechamento", "closingTime"],
                            ["Retorno", "secondOpeningTime"],
                            ["Fechamento final", "secondClosingTime"],
                          ].map(([label, field]) => {
                            const optional =
                              field ===
                                "secondOpeningTime" ||
                              field ===
                                "secondClosingTime";

                            if (
                              optional &&
                              !schedule.closesForLunch
                            ) {
                              return null;
                            }

                            return (
                              <label
                                key={field}
                                className="block"
                              >
                                <span className="mb-2 block text-xs font-semibold text-black/50">
                                  {label}
                                </span>

                                <input
                                  type="time"
                                  value={
                                    schedule[
                                      field as
                                        | "openingTime"
                                        | "closingTime"
                                        | "secondOpeningTime"
                                        | "secondClosingTime"
                                    ]
                                  }
                                  onChange={(event) =>
                                    updateSchedule(
                                      schedule.dayOfWeek,
                                      field as
                                        | "openingTime"
                                        | "closingTime"
                                        | "secondOpeningTime"
                                        | "secondClosingTime",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() =>
                void saveSchedules()
              }
              disabled={
                isLoading ||
                isSaving
              }
              className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : "Salvar horários"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
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
  id?: string;
  companyId?: string;
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

type SectorSchedulesSettingsProps = {
  sectorId: string;
  onBack: () => void;
};

const weekdayLabels: Record<
  Weekday,
  string
> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

function mapSchedulesToForm(
  schedules: CompanySchedule[],
): ScheduleForm[] {
  return schedules.map(
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
  );
}

export default function SectorSchedulesSettings({
  onBack,
}: SectorSchedulesSettingsProps) {
  const [
    companyName,
    setCompanyName,
  ] = useState("");

  const [
    schedules,
    setSchedules,
  ] = useState<ScheduleForm[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    success,
    setSuccess,
  ] = useState<string | null>(null);

  const loadSchedules =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
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
          mapSchedulesToForm(
            result.schedules,
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
          field === "enabled" &&
          value === true
        ) {
          return {
            ...schedule,
            enabled: true,
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
          field === "allDay" &&
          value === false
        ) {
          return {
            ...schedule,
            allDay: false,
          };
        }

        if (
          field ===
            "closesForLunch" &&
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
      const response =
        await fetch(
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
                      schedule.openingTime ||
                      null,
                    closingTime:
                      schedule.closingTime ||
                      null,
                    secondOpeningTime:
                      schedule.closesForLunch
                        ? schedule.secondOpeningTime ||
                          null
                        : null,
                    secondClosingTime:
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
        className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-orange-200 hover:text-orange-700"
      >
        ← Voltar para o setor
      </button>

      <section className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 lg:p-8">
          <p className="text-sm font-semibold text-orange-600">
            Horário geral
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Funcionamento da empresa
            {companyName
              ? ` ${companyName}`
              : ""}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Configure o horário geral de
            atendimento. Esta configuração
            será aplicada automaticamente a
            todos os setores da empresa.
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
              {[
                1,
                2,
                3,
                4,
                5,
                6,
                7,
              ].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl bg-black/5"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map(
                (schedule) => (
                  <article
                    key={
                      schedule.dayOfWeek
                    }
                    className="rounded-2xl border border-black/5 bg-white p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                      <div className="min-w-44">
                        <h3 className="text-base font-bold">
                          {
                            weekdayLabels[
                              schedule
                                .dayOfWeek
                            ]
                          }
                        </h3>

                        <p className="mt-1 text-sm text-black/40">
                          {schedule.enabled
                            ? schedule.allDay
                              ? "Aberto 24 horas"
                              : schedule.closesForLunch
                                ? "Fecha para almoço"
                                : "Horário contínuo"
                            : "Fechado"}
                        </p>
                      </div>

                      <div className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-wrap gap-5">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                schedule.enabled
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSchedule(
                                  schedule.dayOfWeek,
                                  "enabled",
                                  event.target.checked,
                                )
                              }
                              className="h-4 w-4 accent-orange-600"
                            />

                            <span className="text-sm font-semibold text-black/65">
                              Aberto
                            </span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                schedule.allDay
                              }
                              disabled={
                                !schedule.enabled
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSchedule(
                                  schedule.dayOfWeek,
                                  "allDay",
                                  event.target.checked,
                                )
                              }
                              className="h-4 w-4 accent-orange-600 disabled:opacity-40"
                            />

                            <span className="text-sm font-semibold text-black/65">
                              24 horas
                            </span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                schedule.closesForLunch
                              }
                              disabled={
                                !schedule.enabled ||
                                schedule.allDay
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSchedule(
                                  schedule.dayOfWeek,
                                  "closesForLunch",
                                  event.target.checked,
                                )
                              }
                              className="h-4 w-4 accent-orange-600 disabled:opacity-40"
                            />

                            <span className="text-sm font-semibold text-black/65">
                              Fecha para almoço
                            </span>
                          </label>
                        </div>

                        {schedule.enabled &&
                          !schedule.allDay && (
                            <div
                              className={
                                schedule.closesForLunch
                                  ? "grid gap-4 md:grid-cols-2"
                                  : "max-w-xl"
                              }
                            >
                              <div className="rounded-xl bg-black/[0.025] p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-black/40">
                                  {schedule.closesForLunch
                                    ? "Primeiro período"
                                    : "Horário de funcionamento"}
                                </p>

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <label>
                                    <span className="mb-1 block text-xs font-semibold text-black/50">
                                      Abertura
                                    </span>

                                    <input
                                      type="time"
                                      value={
                                        schedule.openingTime
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        updateSchedule(
                                          schedule.dayOfWeek,
                                          "openingTime",
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                                    />
                                  </label>

                                  <label>
                                    <span className="mb-1 block text-xs font-semibold text-black/50">
                                      {schedule.closesForLunch
                                        ? "Saída para almoço"
                                        : "Fechamento"}
                                    </span>

                                    <input
                                      type="time"
                                      value={
                                        schedule.closingTime
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        updateSchedule(
                                          schedule.dayOfWeek,
                                          "closingTime",
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                                    />
                                  </label>
                                </div>
                              </div>

                              {schedule.closesForLunch && (
                                <div className="rounded-xl bg-orange-50/60 p-4">
                                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700/60">
                                    Após o almoço
                                  </p>

                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    <label>
                                      <span className="mb-1 block text-xs font-semibold text-black/50">
                                        Retorno
                                      </span>

                                      <input
                                        type="time"
                                        value={
                                          schedule.secondOpeningTime
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          updateSchedule(
                                            schedule.dayOfWeek,
                                            "secondOpeningTime",
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                                      />
                                    </label>

                                    <label>
                                      <span className="mb-1 block text-xs font-semibold text-black/50">
                                        Fechamento
                                      </span>

                                      <input
                                        type="time"
                                        value={
                                          schedule.secondClosingTime
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          updateSchedule(
                                            schedule.dayOfWeek,
                                            "secondClosingTime",
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </article>
                ),
              )}
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
              className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : "Salvar horário geral"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

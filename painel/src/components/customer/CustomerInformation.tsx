"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CustomerInformationProps = {
  company: string;
  city: string;
  responsible: string;
  responsibleId: string;
  phone: string;
  attendanceStatus: "IA" | "HUMANO";

  lastInteraction?: string;

  isLoading?: boolean;

  onCompanyChange: (
    value: string,
  ) => void;

  onCityChange: (
    value: string,
  ) => void;

  onResponsibleChange: (
    value: string,
    userId: string,
  ) => void;
};

type CustomerSuggestionRecord = {
  company?: string | null;
  city?: string | null;
};

type CustomerUserOption = {
  id: string;
  name: string;
  displayName?: string | null;
  active: boolean;
};

function normalizeSuggestion(
  value?: string | null,
) {
  return value?.trim() || "";
}

function buildSuggestions(
  values: Array<
    string | null | undefined
  >,
) {
  const uniqueValues =
    new Map<string, string>();

  for (const value of values) {
    const normalizedValue =
      normalizeSuggestion(value);

    if (!normalizedValue) {
      continue;
    }

    const key =
      normalizedValue.toLocaleLowerCase(
        "pt-BR",
      );

    if (!uniqueValues.has(key)) {
      uniqueValues.set(
        key,
        normalizedValue,
      );
    }
  }

  return Array.from(
    uniqueValues.values(),
  ).sort((firstValue, secondValue) =>
    firstValue.localeCompare(
      secondValue,
      "pt-BR",
      {
        sensitivity: "base",
      },
    ),
  );
}

export default function CustomerInformation({
  company,
  city,
  responsible,
  responsibleId,
  phone,
  attendanceStatus,
  lastInteraction,
  isLoading = false,
  onCompanyChange,
  onCityChange,
  onResponsibleChange,
}: CustomerInformationProps) {
  const [
    suggestionRecords,
    setSuggestionRecords,
  ] = useState<CustomerSuggestionRecord[]>(
    [],
  );
  const [
    responsibleUsers,
    setResponsibleUsers,
  ] = useState<CustomerUserOption[]>([]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadResponsibleUsers() {
      try {
        const response = await fetch(
          "/api/users",
          {
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Nao foi possivel carregar os responsaveis.",
          );
        }

        setResponsibleUsers(
          (Array.isArray(data)
            ? data
            : []
          ).filter(
            (
              user: CustomerUserOption,
            ) => user.active,
          ),
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Erro ao carregar responsaveis do CRM:",
          error,
        );

        setResponsibleUsers([]);
      }
    }

    void loadResponsibleUsers();

    return () => {
      controller.abort();
    };
  }, []);
  useEffect(() => {
    const controller =
      new AbortController();

    async function loadSuggestions() {
      try {
        const response = await fetch(
          "/api/customers",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar as sugestões.",
          );
        }

        setSuggestionRecords(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Erro ao carregar sugestões de clientes:",
          error,
        );
      }
    }

    void loadSuggestions();

    return () => {
      controller.abort();
    };
  }, []);

  const companySuggestions =
    useMemo(
      () =>
        buildSuggestions([
          company,
          ...suggestionRecords.map(
            (record) =>
              record.company,
          ),
        ]),
      [
        company,
        suggestionRecords,
      ],
    );

  const citySuggestions =
    useMemo(
      () =>
        buildSuggestions([
          city,
          ...suggestionRecords.map(
            (record) =>
              record.city,
          ),
        ]),
      [
        city,
        suggestionRecords,
      ],
    );

  return (
    <div className="space-y-5">
      <section>
        <label
          htmlFor="customer-company"
          className="text-xs font-semibold uppercase tracking-wide text-black/40"
        >
          Empresa
        </label>

        <input
          id="customer-company"
          type="text"
          list="m1m-company-suggestions"
          autoComplete="off"
          value={company}
          disabled={isLoading}
          onChange={(event) =>
            onCompanyChange(
              event.target.value,
            )
          }
          placeholder="Nome da empresa"
          className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
        />

        <datalist id="m1m-company-suggestions">
          {companySuggestions.map(
            (suggestion) => (
              <option
                key={suggestion}
                value={suggestion}
              />
            ),
          )}
        </datalist>

        {companySuggestions.length > 0 && (
          <p className="mt-2 text-[11px] text-black/35">
            Clique no campo para reutilizar uma empresa já cadastrada.
          </p>
        )}
      </section>

      <section>
        <label
          htmlFor="customer-city"
          className="text-xs font-semibold uppercase tracking-wide text-black/40"
        >
          Cidade
        </label>

        <input
          id="customer-city"
          type="text"
          list="m1m-city-suggestions"
          autoComplete="off"
          value={city}
          disabled={isLoading}
          onChange={(event) =>
            onCityChange(
              event.target.value,
            )
          }
          placeholder="Cidade do cliente"
          className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
        />

        <datalist id="m1m-city-suggestions">
          {citySuggestions.map(
            (suggestion) => (
              <option
                key={suggestion}
                value={suggestion}
              />
            ),
          )}
        </datalist>

        {citySuggestions.length > 0 && (
          <p className="mt-2 text-[11px] text-black/35">
            Clique no campo para reutilizar uma cidade já cadastrada.
          </p>
        )}
      </section>

      <section>
        <label
          className="text-xs font-semibold uppercase tracking-wide text-black/40"
        >
          Responsável
        </label>

        <select
          value={responsibleId}
          disabled={isLoading}
          onChange={(event) => {
            const selectedUser =
              responsibleUsers.find(
                (user) =>
                  user.id ===
                  event.target.value,
              );

            onResponsibleChange(
              selectedUser
                ? selectedUser.displayName?.trim() ||
                    selectedUser.name
                : "",
              selectedUser?.id || "",
            );
          }}
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
        >
          <option value="">
            Sem responsável
          </option>

          {responsibleUsers.map((user) => {
            const visibleName =
              user.displayName?.trim() ||
              user.name;

            return (
              <option
                key={user.id}
                value={user.id}
              >
                {visibleName}
              </option>
            );
          })}
        </select>

        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
            attendanceStatus === "HUMANO"
              ? "bg-green-50 text-green-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <span>
            {attendanceStatus ===
            "HUMANO"
              ? "🟢"
              : "🤖"}
          </span>

          {attendanceStatus ===
          "HUMANO"
            ? `Atendimento assumido por ${
                responsible ||
                "um atendente"
              }`
            : "Atendimento conduzido pela IA"}
        </div>
      </section>

      <section className="rounded-xl bg-black/[0.025] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
          Última interação
        </p>

        <p className="mt-2 text-sm text-black/60">
          {lastInteraction ||
            "Informação indisponível"}
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-black/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
          Identificação
        </p>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-black/40">
              Telefone
            </span>

            <span className="font-medium">
              {phone}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-black/40">
              Canal
            </span>

            <span className="font-medium">
              WhatsApp
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

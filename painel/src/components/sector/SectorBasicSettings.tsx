"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type Sector = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
};

type SectorBasicSettingsProps = {
  sector: Sector;
  onBack: () => void;
  onSaved: (sector: Sector) => void;
};

export default function SectorBasicSettings({
  sector,
  onBack,
  onSaved,
}: SectorBasicSettingsProps) {
  const [name, setName] =
    useState(sector.name);

  const [description, setDescription] =
    useState(sector.description ?? "");

  const [sortOrder, setSortOrder] =
    useState(String(sector.sortOrder));

  const [active, setActive] =
    useState(sector.active);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    setName(sector.name);
    setDescription(
      sector.description ?? "",
    );
    setSortOrder(
      String(sector.sortOrder),
    );
    setActive(sector.active);
  }, [sector]);

  async function saveSettings(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const normalizedName =
      name.trim();

    if (!normalizedName) {
      setError(
        "Informe o nome do setor.",
      );
      return;
    }

    const normalizedSortOrder =
      Number(sortOrder);

    if (
      !Number.isInteger(
        normalizedSortOrder,
      ) ||
      normalizedSortOrder < 0
    ) {
      setError(
        "A ordem deve ser um número inteiro maior ou igual a zero.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/sectors/${sector.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: normalizedName,
            description:
              description.trim() ||
              null,
            sortOrder:
              normalizedSortOrder,
            active,
          }),
        },
      );

      const data =
        (await response.json()) as
          | Sector
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data &&
            data.error
            ? data.error
            : "Não foi possível salvar as configurações do setor.",
        );
      }

      onSaved(data as Sector);

      setSuccess(
        "Configurações do setor salvas com sucesso.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar as configurações do setor.",
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
            Configurações do Setor
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Dados e organização
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Atualize o nome, a descrição, a ordem de exibição e a situação deste setor.
          </p>
        </div>

        <form
          onSubmit={saveSettings}
          className="p-6 lg:p-8"
        >
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

          <div className="grid gap-5 md:grid-cols-[1fr_180px]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Nome do setor *
              </span>

              <input
                type="text"
                value={name}
                disabled={isSaving}
                onChange={(event) => {
                  setName(
                    event.target.value,
                  );
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Ordem
              </span>

              <input
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                disabled={isSaving}
                onChange={(event) => {
                  setSortOrder(
                    event.target.value,
                  );
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-black/70">
              Descrição
            </span>

            <textarea
              rows={5}
              value={description}
              disabled={isSaving}
              placeholder="Explique quais assuntos e atendimentos pertencem a este setor."
              onChange={(event) => {
                setDescription(
                  event.target.value,
                );
                setError(null);
                setSuccess(null);
              }}
              className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
            />
          </label>

          <label className="mt-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              disabled={isSaving}
              onChange={(event) => {
                setActive(
                  event.target.checked,
                );
                setError(null);
                setSuccess(null);
              }}
              className="h-4 w-4 accent-orange-600"
            />

            <span className="text-sm font-semibold text-black/65">
              Setor ativo
            </span>
          </label>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : "Salvar configurações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

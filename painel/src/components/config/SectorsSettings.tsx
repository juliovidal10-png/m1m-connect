"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type Sector = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type SectorFormData = {
  name: string;
  description: string;
  sortOrder: string;
  active: boolean;
};

type SectorsSettingsProps = {
  onBack: () => void;
};

const emptyForm: SectorFormData = {
  name: "",
  description: "",
  sortOrder: "0",
  active: true,
};

export default function SectorsSettings({
  onBack,
}: SectorsSettingsProps) {
  const router = useRouter();

  const [sectors, setSectors] = useState<
    Sector[]
  >([]);

  const [form, setForm] =
    useState<SectorFormData>(emptyForm);

  const [editingSectorId, setEditingSectorId] =
    useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [processingSectorId, setProcessingSectorId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadSectors = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/sectors",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as
          | Sector[]
          | {
              error?: string;
            };

        if (!response.ok) {
          throw new Error(
            !Array.isArray(data) &&
              data.error
              ? data.error
              : "Não foi possível carregar os setores.",
          );
        }

        setSectors(
          Array.isArray(data) ? data : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar os setores.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSectors();
  }, [loadSectors]);

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  function openCreateForm() {
    setEditingSectorId(null);
    setForm({
      ...emptyForm,
      sortOrder: String(
        sectors.length + 1,
      ),
    });
    setIsFormOpen(true);
    clearFeedback();
  }

  function openEditForm(sector: Sector) {
    setEditingSectorId(sector.id);
    setForm({
      name: sector.name,
      description:
        sector.description ?? "",
      sortOrder: String(
        sector.sortOrder,
      ),
      active: sector.active,
    });
    setIsFormOpen(true);
    clearFeedback();
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setEditingSectorId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
    clearFeedback();
  }

  function updateField<
    Field extends keyof SectorFormData,
  >(
    field: Field,
    value: SectorFormData[Field],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    clearFeedback();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const normalizedName =
      form.name.trim();

    if (!normalizedName) {
      setError(
        "Informe o nome do setor.",
      );
      return;
    }

    const sortOrder =
      Number(form.sortOrder);

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "A ordem deve ser um número inteiro maior ou igual a zero.",
      );
      return;
    }

    setIsSaving(true);
    clearFeedback();

    try {
      const isEditing =
        Boolean(editingSectorId);

      const response = await fetch(
        isEditing
          ? `/api/sectors/${editingSectorId}`
          : "/api/sectors",
        {
          method: isEditing
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: normalizedName,
            description:
              form.description,
            active: form.active,
            sortOrder,
          }),
        },
      );

      const data = (await response.json()) as
        | Sector
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : isEditing
              ? "Não foi possível atualizar o setor."
              : "Não foi possível criar o setor.",
        );
      }

      setEditingSectorId(null);
      setForm(emptyForm);
      setIsFormOpen(false);

      setSuccess(
        isEditing
          ? "Setor atualizado com sucesso."
          : "Setor criado com sucesso.",
      );

      await loadSectors();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar o setor.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSector(
    sector: Sector,
  ) {
    if (processingSectorId) {
      return;
    }

    setProcessingSectorId(sector.id);
    clearFeedback();

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
            active: !sector.active,
          }),
        },
      );

      const data = (await response.json()) as
        | Sector
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Não foi possível alterar o setor.",
        );
      }

      setSuccess(
        sector.active
          ? "Setor inativado com sucesso."
          : "Setor ativado com sucesso.",
      );

      await loadSectors();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Erro ao alterar o setor.",
      );
    } finally {
      setProcessingSectorId(null);
    }
  }

  async function deleteSector(
    sector: Sector,
  ) {
    if (processingSectorId) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir o setor "${sector.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setProcessingSectorId(sector.id);
    clearFeedback();

    try {
      const response = await fetch(
        `/api/sectors/${sector.id}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível excluir o setor.",
        );
      }

      setSuccess(
        "Setor excluído com sucesso.",
      );

      await loadSectors();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Erro ao excluir o setor.",
      );
    } finally {
      setProcessingSectorId(null);
    }
  }

  function openSectorWorkspace(
    sectorId: string,
  ) {
    router.push(
      `/configuracoes/setores/${sectorId}`,
    );
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

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-black/5 p-6 md:flex-row md:items-center md:justify-between lg:p-8">
          <div>
            <p className="text-sm font-semibold text-teal-600">
              Setores
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Estrutura de atendimento
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
              Organize as áreas da empresa para que
              clientes, atendentes e inteligência
              artificial saibam exatamente para onde
              cada conversa deve ser encaminhada.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="shrink-0 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            + Adicionar setor
          </button>
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

          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="mb-7 rounded-2xl border border-teal-100 bg-teal-50/40 p-5 lg:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-600">
                    {editingSectorId
                      ? "Editar setor"
                      : "Novo setor"}
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    {editingSectorId
                      ? "Atualize as informações do setor"
                      : "Cadastre uma nova área de atendimento"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/50 hover:text-black"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_160px]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black/70">
                    Nome do setor *
                  </span>

                  <input
                    type="text"
                    value={form.name}
                    placeholder="Ex.: Comercial"
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
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
                    value={form.sortOrder}
                    onChange={(event) =>
                      updateField(
                        "sortOrder",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-black/70">
                  Descrição
                </span>

                <textarea
                  rows={4}
                  value={form.description}
                  placeholder="Explique quais assuntos e atendimentos pertencem a este setor."
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                />
              </label>

              <label className="mt-5 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    updateField(
                      "active",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-teal-600"
                />

                <span className="text-sm font-semibold text-black/65">
                  Setor ativo
                </span>
              </label>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Salvando..."
                    : editingSectorId
                      ? "Salvar alterações"
                      : "Criar setor"}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl bg-black/5"
                />
              ))}
            </div>
          ) : sectors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">
              <h3 className="text-lg font-bold">
                Nenhum setor cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/45">
                Clique em “Adicionar setor” para começar
                a organizar o atendimento da empresa.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                + Adicionar setor
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sectors.map((sector) => {
                const isProcessing =
                  processingSectorId ===
                  sector.id;

                return (
                  <article
                    key={sector.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openSectorWorkspace(
                        sector.id,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        openSectorWorkspace(
                          sector.id,
                        );
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-teal-100"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold">
                            {sector.name}
                          </h3>

                          <span
                            className={
                              sector.active
                                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                : "rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/40"
                            }
                          >
                            {sector.active
                              ? "Ativo"
                              : "Inativo"}
                          </span>

                          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                            Ordem {sector.sortOrder}
                          </span>
                        </div>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
                          {sector.description ||
                            "Nenhuma descrição cadastrada."}
                        </p>

                      </div>

                      <div
                        className="flex shrink-0 flex-wrap gap-2"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        onKeyDown={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            openSectorWorkspace(
                              sector.id,
                            )
                          }
                          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                        >
                          Configurar
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            openEditForm(sector)
                          }
                          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700 disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            void toggleSector(
                              sector,
                            )
                          }
                          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700 disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Aguarde..."
                            : sector.active
                              ? "Inativar"
                              : "Ativar"}
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            void deleteSector(
                              sector,
                            )
                          }
                          className="rounded-lg border border-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type SectorUser = {
  id: string;
  name: string;
  displayName: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  active: boolean;
  assigned: boolean;
};

type SectorUsersResponse = {
  sector: {
    id: string;
    name: string;
  };
  users: SectorUser[];
};

type SectorUsersSettingsProps = {
  sectorId: string;
  onBack: () => void;
};

export default function SectorUsersSettings({
  sectorId,
  onBack,
}: SectorUsersSettingsProps) {
  const [sectorName, setSectorName] =
    useState("");

  const [users, setUsers] =
    useState<SectorUser[]>([]);

  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadUsers = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sectors/${sectorId}/users`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            | SectorUsersResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Não foi possível carregar os responsáveis.",
          );
        }

        const result =
          data as SectorUsersResponse;

        setSectorName(
          result.sector.name,
        );

        setUsers(result.users);

        setSelectedUserIds(
          result.users
            .filter(
              (user) => user.assigned,
            )
            .map((user) => user.id),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar os responsáveis.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sectorId],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter(
            (id) => id !== userId,
          )
        : [...current, userId],
    );

    setError(null);
    setSuccess(null);
  }

  async function saveUsers() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/sectors/${sectorId}/users`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userIds: selectedUserIds,
          }),
        },
      );

      const data = (await response.json()) as {
        users?: SectorUser[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar os responsáveis.",
        );
      }

      setSuccess(
        "Responsáveis do setor salvos com sucesso.",
      );

      await loadUsers();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar os responsáveis.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const assignedCount =
    selectedUserIds.length;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-teal-200 hover:text-teal-700"
      >
        ← Voltar para o setor
      </button>

      <section className="rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-black/5 p-6 md:flex-row md:items-center md:justify-between lg:p-8">
          <div>
            <p className="text-sm font-semibold text-teal-600">
              Responsáveis
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Equipe do setor {sectorName}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
              Selecione os colaboradores que poderão
              atender e assumir conversas neste setor.
            </p>
          </div>

          <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700">
            {assignedCount}{" "}
            {assignedCount === 1
              ? "responsável"
              : "responsáveis"}
          </div>
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
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-black/5"
                />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">
              <h3 className="text-lg font-bold">
                Nenhum usuário cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/45">
                Cadastre usuários da empresa antes de
                definir os responsáveis deste setor.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const isSelected =
                  selectedUserIds.includes(
                    user.id,
                  );

                const visibleName =
                  user.displayName ||
                  user.name;

                return (
                  <label
                    key={user.id}
                    className={
                      isSelected
                        ? "flex cursor-pointer items-center gap-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-5 transition"
                        : "flex cursor-pointer items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 transition hover:border-teal-100"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!user.active}
                      onChange={() =>
                        toggleUser(user.id)
                      }
                      className="h-5 w-5 shrink-0 accent-teal-600"
                    />

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-lg font-bold text-teal-700">
                      {visibleName
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold">
                          {visibleName}
                        </h3>

                        <span
                          className={
                            user.active
                              ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                              : "rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/40"
                          }
                        >
                          {user.active
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-black/45">
                        {user.email}
                      </p>

                      {user.jobTitle && (
                        <p className="mt-1 text-sm font-medium text-black/60">
                          {user.jobTitle}
                        </p>
                      )}
                    </div>

                    <span
                      className={
                        isSelected
                          ? "text-sm font-bold text-teal-700"
                          : "text-sm font-semibold text-black/30"
                      }
                    >
                      {isSelected
                        ? "Selecionado"
                        : "Selecionar"}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() =>
                void saveUsers()
              }
              disabled={
                isLoading ||
                isSaving
              }
              className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : "Salvar responsáveis"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

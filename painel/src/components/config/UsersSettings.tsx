"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type User = {
  id: string;
  companyId: string;
  name: string;
  displayName: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserFormData = {
  name: string;
  displayName: string;
  email: string;
  jobTitle: string;
  phone: string;
  active: boolean;
};

const emptyForm: UserFormData = {
  name: "",
  displayName: "",
  email: "",
  jobTitle: "",
  phone: "",
  active: true,
};

export default function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] =
    useState<UserFormData>(emptyForm);

  const [editingUserId, setEditingUserId] =
    useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [processingUserId, setProcessingUserId] =
    useState<string | null>(null);

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
          "/api/users",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as
          | User[]
          | {
              error?: string;
            };

        if (!response.ok) {
          throw new Error(
            !Array.isArray(data) &&
              data.error
              ? data.error
              : "Não foi possível carregar os usuários.",
          );
        }

        setUsers(
          Array.isArray(data) ? data : [],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar os usuários.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function clearFeedback() {
    setError(null);
    setSuccess(null);
  }

  function openCreateForm() {
    setEditingUserId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    clearFeedback();
  }

  function openEditForm(user: User) {
    setEditingUserId(user.id);

    setForm({
      name: user.name,
      displayName:
        user.displayName ?? "",
      email: user.email,
      jobTitle:
        user.jobTitle ?? "",
      phone:
        user.phone ?? "",
      active: user.active,
    });

    setIsFormOpen(true);
    clearFeedback();
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setEditingUserId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
    clearFeedback();
  }

  function updateField<
    Field extends keyof UserFormData,
  >(
    field: Field,
    value: UserFormData[Field],
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

    if (!form.name.trim()) {
      setError(
        "Informe o nome completo do usuário.",
      );
      return;
    }

    if (!form.email.trim()) {
      setError(
        "Informe o e-mail do usuário.",
      );
      return;
    }

    setIsSaving(true);
    clearFeedback();

    try {
      const isEditing =
        Boolean(editingUserId);

      const response = await fetch(
        isEditing
          ? `/api/users/${editingUserId}`
          : "/api/users",
        {
          method: isEditing
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            displayName:
              form.displayName,
            email: form.email,
            jobTitle:
              form.jobTitle,
            phone: form.phone,
            active: form.active,
          }),
        },
      );

      const data = (await response.json()) as
        | User
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : isEditing
              ? "Não foi possível atualizar o usuário."
              : "Não foi possível criar o usuário.",
        );
      }

      setEditingUserId(null);
      setForm(emptyForm);
      setIsFormOpen(false);

      setSuccess(
        isEditing
          ? "Usuário atualizado com sucesso."
          : "Usuário criado com sucesso.",
      );

      await loadUsers();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar o usuário.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUser(user: User) {
    if (
      processingUserId ||
      user.id === "julio"
    ) {
      return;
    }

    setProcessingUserId(user.id);
    clearFeedback();

    try {
      const response = await fetch(
        `/api/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            active: !user.active,
          }),
        },
      );

      const data = (await response.json()) as
        | User
        | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Não foi possível alterar o usuário.",
        );
      }

      setSuccess(
        user.active
          ? "Usuário inativado com sucesso."
          : "Usuário ativado com sucesso.",
      );

      await loadUsers();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Erro ao alterar o usuário.",
      );
    } finally {
      setProcessingUserId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-orange-600">
            Gestão de usuários
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Colaboradores da empresa
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/55">
            Cadastre e gerencie os colaboradores que
            poderão acessar e utilizar o M1M Connect.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="shrink-0 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
        >
          + Novo usuário
        </button>
      </div>

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
          className="mb-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-5 lg:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-orange-600">
                {editingUserId
                  ? "Editar usuário"
                  : "Novo usuário"}
              </p>

              <h3 className="mt-1 text-lg font-bold">
                {editingUserId
                  ? "Atualize os dados do colaborador"
                  : "Cadastre um novo colaborador"}
              </h3>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/50 transition hover:text-black"
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Nome completo *
              </span>

              <input
                type="text"
                value={form.name}
                placeholder="Ex.: Maria da Silva"
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Nome exibido ao cliente
              </span>

              <input
                type="text"
                value={form.displayName}
                placeholder="Ex.: Maria"
                onChange={(event) =>
                  updateField(
                    "displayName",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                E-mail *
              </span>

              <input
                type="email"
                value={form.email}
                placeholder="usuario@empresa.com.br"
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Cargo
              </span>

              <input
                type="text"
                value={form.jobTitle}
                placeholder="Ex.: Atendente"
                onChange={(event) =>
                  updateField(
                    "jobTitle",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Telefone
              </span>

              <input
                type="text"
                value={form.phone}
                placeholder="(65) 90000-0000"
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
          </div>

          <label className="mt-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.active}
              disabled={
                editingUserId === "julio"
              }
              onChange={(event) =>
                updateField(
                  "active",
                  event.target.checked,
                )
              }
              className="h-4 w-4 accent-orange-600"
            />

            <span className="text-sm font-semibold text-black/65">
              Usuário ativo
            </span>
          </label>

          {editingUserId === "julio" && (
            <p className="mt-2 text-xs text-black/40">
              O usuário principal não pode ser
              inativado nesta etapa.
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Salvando..."
                : editingUserId
                  ? "Salvar alterações"
                  : "Criar usuário"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
          <div className="text-5xl">
            👥
          </div>

          <h3 className="mt-5 text-lg font-bold">
            Nenhum usuário cadastrado
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/45">
            Clique em “Novo usuário” para cadastrar
            o primeiro colaborador da empresa.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const isProcessing =
              processingUserId === user.id;

            const visibleName =
              user.displayName ||
              user.name;

            return (
              <article
                key={user.id}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-orange-100"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-lg font-bold text-orange-700">
                      {visibleName
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">
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

                        {user.id === "julio" && (
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                            Usuário principal
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-black/50">
                        {user.name}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/45">
                        <span>
                          {user.email}
                        </span>

                        {user.jobTitle && (
                          <span>
                            {user.jobTitle}
                          </span>
                        )}

                        {user.phone && (
                          <span>
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(user)
                      }
                      className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-orange-200 hover:text-orange-700"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        user.id === "julio"
                      }
                      onClick={() =>
                        void toggleUser(user)
                      }
                      className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isProcessing
                        ? "Aguarde..."
                        : user.id === "julio"
                          ? "Principal"
                          : user.active
                            ? "Inativar"
                            : "Ativar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

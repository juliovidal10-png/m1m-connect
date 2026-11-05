"use client";

export type UserPermission =
  | "VIEW_ALL_CONVERSATIONS"
  | "ASSUME_ATTENDANCE"
  | "TRANSFER_ATTENDANCE"
  | "CLOSE_ATTENDANCE"
  | "EDIT_CRM"
  | "VIEW_RECEIPTS"
  | "DELETE_CUSTOMERS"
  | "DELETE_MESSAGES"
  | "MANAGE_USERS"
  | "MANAGE_SECTORS"
  | "MANAGE_HOURS"
  | "ACCESS_SETTINGS";

type PermissionOption = {
  value: UserPermission;
  label: string;
  description: string;
  group:
    | "Atendimento"
    | "Clientes e CRM"
    | "Administração";
};

const permissionOptions: PermissionOption[] = [
  {
    value: "VIEW_ALL_CONVERSATIONS",
    label: "Visualizar todas as conversas",
    description:
      "Permite acompanhar conversas de todos os atendentes e setores autorizados.",
    group: "Atendimento",
  },
  {
    value: "ASSUME_ATTENDANCE",
    label: "Assumir atendimento",
    description:
      "Permite assumir conversas atendidas pela IA ou disponíveis na fila.",
    group: "Atendimento",
  },
  {
    value: "TRANSFER_ATTENDANCE",
    label: "Transferir atendimento",
    description:
      "Permite encaminhar conversas para outros responsáveis ou setores.",
    group: "Atendimento",
  },
  {
    value: "CLOSE_ATTENDANCE",
    label: "Finalizar atendimento",
    description:
      "Permite encerrar atendimentos humanos concluídos.",
    group: "Atendimento",
  },
  {
    value: "EDIT_CRM",
    label: "Editar dados do CRM",
    description:
      "Permite atualizar dados, observações e informações dos clientes.",
    group: "Clientes e CRM",
  },
  {
    value: "VIEW_RECEIPTS",
    label: "Visualizar comprovantes",
    description:
      "Permite acessar comprovantes e documentos enviados pelos clientes.",
    group: "Clientes e CRM",
  },
  {
    value: "DELETE_CUSTOMERS",
    label: "Excluir clientes",
    description:
      "Permite excluir registros de clientes da empresa.",
    group: "Clientes e CRM",
  },
  {
    value: "DELETE_MESSAGES",
    label: "Excluir mensagens",
    description:
      "Permite utilizar recursos de exclusão de mensagens quando disponíveis.",
    group: "Clientes e CRM",
  },
  {
    value: "MANAGE_USERS",
    label: "Gerenciar usuários",
    description:
      "Permite cadastrar, editar, ativar e inativar colaboradores.",
    group: "Administração",
  },
  {
    value: "MANAGE_SECTORS",
    label: "Gerenciar setores",
    description:
      "Permite criar, editar e organizar os setores da empresa.",
    group: "Administração",
  },
  {
    value: "MANAGE_HOURS",
    label: "Gerenciar horários",
    description:
      "Permite alterar dias, horários e regras de funcionamento.",
    group: "Administração",
  },
  {
    value: "ACCESS_SETTINGS",
    label: "Acessar configurações operacionais",
    description:
      "Permite entrar nas configurações operacionais liberadas para a empresa.",
    group: "Administração",
  },
];

const groups: PermissionOption["group"][] = [
  "Atendimento",
  "Clientes e CRM",
  "Administração",
];

type UserPermissionsEditorProps = {
  enabled: boolean;
  permissions: UserPermission[];
  disabled?: boolean;
  onEnabledChange: (
    enabled: boolean,
  ) => void;
  onPermissionsChange: (
    permissions: UserPermission[],
  ) => void;
};

export default function UserPermissionsEditor({
  enabled,
  permissions,
  disabled = false,
  onEnabledChange,
  onPermissionsChange,
}: UserPermissionsEditorProps) {
  function togglePermission(
    permission: UserPermission,
  ) {
    if (disabled || !enabled) {
      return;
    }

    if (permissions.includes(permission)) {
      onPermissionsChange(
        permissions.filter(
          (currentPermission) =>
            currentPermission !== permission,
        ),
      );

      return;
    }

    onPermissionsChange([
      ...permissions,
      permission,
    ]);
  }

  function selectAll() {
    if (disabled) {
      return;
    }

    onPermissionsChange(
      permissionOptions.map(
        (permission) => permission.value,
      ),
    );
  }

  function clearAll() {
    if (disabled) {
      return;
    }

    onPermissionsChange([]);
  }

  if (disabled) {
    return (
      <section className="mt-6 rounded-2xl border border-teal-100 bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
            🔒
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-600">
              Permissões operacionais
            </p>

            <h3 className="mt-1 text-lg font-bold">
              Administrador da Empresa
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
              Este usuário possui acesso total aos
              recursos operacionais do M1M Connect.
              As permissões individuais são
              desnecessárias para este perfil.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="text-sm font-bold text-green-700">
                  Atendimento completo
                </p>

                <p className="mt-1 text-xs leading-5 text-green-700/70">
                  Pode visualizar, assumir, transferir
                  e finalizar atendimentos.
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-bold text-blue-700">
                  Gestão operacional
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700/70">
                  Pode administrar usuários, setores,
                  horários e dados do CRM.
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                <p className="text-sm font-bold text-purple-700">
                  Acesso protegido
                </p>

                <p className="mt-1 text-xs leading-5 text-purple-700/70">
                  Enquanto este colaborador possuir o
                  perfil Administrador, todas as
                  permissões operacionais permanecerão
                  liberadas automaticamente.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-5 py-4">
              <p className="text-sm font-bold text-teal-800">
                🔒 Inteligência protegida pela M1M
              </p>

              <p className="mt-2 text-xs leading-5 text-teal-700">
                Esta área faz parte da infraestrutura
                inteligente do M1M Connect.
              </p>

              <p className="mt-2 text-xs leading-5 text-teal-700">
                Prompts, IA, Base de Conhecimento e regras
                avançadas são administrados exclusivamente
                pela equipe M1M para garantir estabilidade,
                segurança e qualidade do atendimento.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-600">
            Permissões operacionais
          </p>

          <h3 className="mt-1 text-lg font-bold">
            Controle personalizado de acesso
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
            O colaborador herda os acessos do perfil.
            Ative esta opção somente quando precisar
            criar regras operacionais específicas.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              onEnabledChange(
                event.target.checked,
              )
            }
            className="h-5 w-5 accent-teal-600"
          />

          <span className="text-sm font-bold text-black/65">
            Usar permissões personalizadas
          </span>
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-5 py-4">
        <p className="text-sm font-bold text-teal-800">
          🔒 Inteligência protegida pela M1M
        </p>

        <p className="mt-2 text-xs leading-5 text-teal-700">
          Esta área faz parte da infraestrutura
          inteligente do M1M Connect.
        </p>

        <p className="mt-2 text-xs leading-5 text-teal-700">
          Prompts, IA, Base de Conhecimento e regras
          avançadas são administrados exclusivamente
          pela equipe M1M para garantir estabilidade,
          segurança e qualidade do atendimento.
        </p>
      </div>

      {!enabled ? (
        <div className="mt-5 rounded-xl bg-black/[0.03] px-5 py-4">
          <p className="text-sm font-semibold text-black/55">
            O usuário está herdando as permissões
            do perfil selecionado.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-black/55">
              {permissions.length} de{" "}
              {permissionOptions.length} permissões selecionadas
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-black/55 transition hover:border-teal-200 hover:text-teal-700"
              >
                Marcar todas
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-black/55 transition hover:border-teal-200 hover:text-teal-700"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {groups.map((group) => (
              <div key={group}>
                <h4 className="text-sm font-bold text-black/75">
                  {group}
                </h4>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {permissionOptions
                    .filter(
                      (permission) =>
                        permission.group === group,
                    )
                    .map((permission) => {
                      const isSelected =
                        permissions.includes(
                          permission.value,
                        );

                      return (
                        <label
                          key={permission.value}
                          className={
                            isSelected
                              ? "flex cursor-pointer gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4"
                              : "flex cursor-pointer gap-3 rounded-xl border border-black/5 p-4 transition hover:border-teal-100"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              togglePermission(
                                permission.value,
                              )
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
                          />

                          <span>
                            <span className="block text-sm font-bold text-black/75">
                              {permission.label}
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-black/45">
                              {permission.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

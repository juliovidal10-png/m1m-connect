"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type HumanReturnMode =
  | "IMMEDIATE"
  | "NEXT_CONVERSATION"
  | "MANUAL";

type CompanyResponse = {
  humanReturnMode?: HumanReturnMode;
  humanClosingMessage?: string | null;
  error?: string;
};

type HumanAttendanceSettingsProps = {
  onBack: () => void;
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export default function HumanAttendanceSettings({
  onBack,
}: HumanAttendanceSettingsProps) {
  const [humanReturnMode, setHumanReturnMode] =
    useState<HumanReturnMode>(
      "NEXT_CONVERSATION",
    );

  const [
    humanClosingMessage,
    setHumanClosingMessage,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadSettings =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/company",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            CompanyResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar as configurações do atendimento humano.",
          );
        }

        setHumanReturnMode(
          data.humanReturnMode ??
            "NEXT_CONVERSATION",
        );

        setHumanClosingMessage(
          data.humanClosingMessage ?? "",
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Erro ao carregar as configurações do atendimento humano.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveSettings(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        "/api/company",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            humanReturnMode,
            humanClosingMessage:
              humanClosingMessage.trim() ||
              null,
          }),
        },
      );

      const data =
        (await response.json()) as
          CompanyResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar as configurações do atendimento humano.",
        );
      }

      setHumanReturnMode(
        data.humanReturnMode ??
          humanReturnMode,
      );

      setHumanClosingMessage(
        data.humanClosingMessage ?? "",
      );

      setSuccess(
        "Configurações do atendimento humano salvas com sucesso.",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Erro ao salvar as configurações do atendimento humano.",
        ),
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
        ← Voltar para configurações
      </button>

      <section className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 lg:p-8">
          <p className="text-sm font-semibold text-orange-600">
            Atendimento Humano
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Comportamento da IA
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Quando um colaborador assume uma conversa,
            a IA para de responder automaticamente.
            Defina apenas quando ela deverá voltar após
            o encerramento do atendimento.
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

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-2xl bg-black/5" />
              <div className="h-52 animate-pulse rounded-2xl bg-black/5" />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-black/5 p-5">
                <h3 className="text-base font-bold">
                  Quando a IA deve voltar?
                </h3>

                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/5 p-4 transition hover:border-orange-200">
                    <input
                      type="radio"
                      name="humanReturnMode"
                      value="IMMEDIATE"
                      checked={
                        humanReturnMode ===
                        "IMMEDIATE"
                      }
                      onChange={() =>
                        setHumanReturnMode(
                          "IMMEDIATE",
                        )
                      }
                      className="mt-1 h-4 w-4 accent-orange-600"
                    />

                    <span>
                      <span className="block text-sm font-bold">
                        Voltar imediatamente
                      </span>

                      <span className="mt-1 block text-sm leading-6 text-black/50">
                        A IA fica disponível novamente assim que
                        o colaborador finalizar o atendimento.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/5 p-4 transition hover:border-orange-200">
                    <input
                      type="radio"
                      name="humanReturnMode"
                      value="NEXT_CONVERSATION"
                      checked={
                        humanReturnMode ===
                        "NEXT_CONVERSATION"
                      }
                      onChange={() =>
                        setHumanReturnMode(
                          "NEXT_CONVERSATION",
                        )
                      }
                      className="mt-1 h-4 w-4 accent-orange-600"
                    />

                    <span>
                      <span className="block text-sm font-bold">
                        Voltar na próxima conversa
                      </span>

                      <span className="mt-1 block text-sm leading-6 text-black/50">
                        A conversa atual permanece encerrada e
                        a IA volta quando o cliente iniciar um
                        novo atendimento.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/5 p-4 transition hover:border-orange-200">
                    <input
                      type="radio"
                      name="humanReturnMode"
                      value="MANUAL"
                      checked={
                        humanReturnMode ===
                        "MANUAL"
                      }
                      onChange={() =>
                        setHumanReturnMode(
                          "MANUAL",
                        )
                      }
                      className="mt-1 h-4 w-4 accent-orange-600"
                    />

                    <span>
                      <span className="block text-sm font-bold">
                        Voltar somente de forma manual
                      </span>

                      <span className="mt-1 block text-sm leading-6 text-black/50">
                        A IA não retorna automaticamente após
                        o encerramento feito pelo colaborador.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-semibold text-black/70">
                  Mensagem de encerramento
                </span>

                <textarea
                  rows={6}
                  value={humanClosingMessage}
                  maxLength={1000}
                  placeholder="Ex.: Obrigado pelo contato! Sempre que precisar, estaremos à disposição."
                  disabled={isSaving}
                  onChange={(event) => {
                    setHumanClosingMessage(
                      event.target.value,
                    );

                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex items-center justify-between text-xs text-black/40">
                  <span>
                    Deixe vazio para não enviar mensagem automática.
                  </span>

                  <span>
                    {humanClosingMessage.length}/1000
                  </span>
                </div>
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
            </>
          )}
        </form>
      </section>
    </div>
  );
}
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type AutomaticMessagesSettingsProps = {
  onBack: () => void;
};

type MessageResponse = {
  message?: string;
  error?: string;
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

export default function AutomaticMessagesSettings({
  onBack,
}: AutomaticMessagesSettingsProps) {
  const [message, setMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadMessage =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/company/out-of-hours",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            MessageResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar a mensagem automática.",
          );
        }

        setMessage(
          data.message ?? "",
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Erro ao carregar a mensagem automática.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadMessage();
  }, [loadMessage]);

  async function saveMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const normalizedMessage =
      message.trim();

    if (!normalizedMessage) {
      setError(
        "Informe a mensagem que será enviada fora do expediente.",
      );

      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/company/out-of-hours",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              message:
                normalizedMessage,
            }),
          },
        );

      const data =
        (await response.json()) as
          MessageResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar a mensagem automática.",
        );
      }

      setMessage(
        normalizedMessage,
      );

      setSuccess(
        "Mensagem automática salva com sucesso.",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Erro ao salvar a mensagem automática.",
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
            Mensagens automáticas
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Mensagem fora do expediente
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Esta mensagem será enviada automaticamente quando
            um cliente entrar em contato fora do horário geral
            de atendimento da empresa.
          </p>
        </div>

        <form
          onSubmit={saveMessage}
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
            <div className="h-44 animate-pulse rounded-2xl bg-black/5" />
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-black/70">
                  Mensagem enviada ao cliente
                </span>

                <textarea
                  rows={7}
                  value={message}
                  maxLength={1000}
                  placeholder="Ex.: Olá! No momento estamos fora do nosso horário de atendimento. Sua mensagem foi recebida e será respondida assim que retornarmos."
                  disabled={isSaving}
                  onChange={(event) => {
                    setMessage(
                      event.target.value,
                    );

                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <div className="mt-3 flex flex-col gap-2 text-xs text-black/40 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Use uma mensagem simples e acolhedora.
                </span>

                <span>
                  {message.length}/1000
                </span>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !message.trim()
                  }
                  className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Salvando..."
                    : "Salvar mensagem"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

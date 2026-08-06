"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type SectorKnowledgeSettingsProps = {
  sectorId: string;
  sectorName: string;
  onBack: () => void;
  onSaved?: (
    knowledge: string | null,
  ) => void;
};

type SectorResponse = {
  id: string;
  name: string;
  knowledge: string | null;
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

export default function SectorKnowledgeSettings({
  sectorId,
  sectorName,
  onBack,
  onSaved,
}: SectorKnowledgeSettingsProps) {
  const [knowledge, setKnowledge] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadKnowledge =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sectors/${sectorId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            SectorResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar o conhecimento do setor.",
          );
        }

        setKnowledge(
          data.knowledge ?? "",
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Erro ao carregar o conhecimento do setor.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [sectorId]);

  useEffect(() => {
    void loadKnowledge();
  }, [loadKnowledge]);

  async function saveKnowledge(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const normalizedKnowledge =
      knowledge.trim();

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/sectors/${sectorId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            knowledge:
              normalizedKnowledge ||
              null,
          }),
        },
      );

      const data =
        (await response.json()) as
          SectorResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar o conhecimento do setor.",
        );
      }

      const savedKnowledge =
        data.knowledge ?? "";

      setKnowledge(savedKnowledge);

      onSaved?.(
        savedKnowledge || null,
      );

      setSuccess(
        "Conhecimento do setor salvo com sucesso.",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Erro ao salvar o conhecimento do setor.",
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
        ← Voltar para o setor
      </button>

      <section className="rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="border-b border-black/5 p-6 lg:p-8">
          <p className="text-sm font-semibold text-orange-600">
            Conhecimento do setor
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Informações de {sectorName}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
            Registre de forma simples o que este setor faz,
            quais assuntos atende e quais informações são
            importantes durante uma conversa com o cliente.
          </p>
        </div>

        <form
          onSubmit={saveKnowledge}
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

          <div className="mb-5 rounded-2xl bg-orange-50/70 p-5">
            <p className="text-sm font-bold text-orange-800">
              O que você pode informar
            </p>

            <p className="mt-2 text-sm leading-6 text-orange-900/70">
              Produtos e serviços, dúvidas frequentes,
              prazos, entregas, garantias, regras e
              orientações importantes deste setor.
            </p>
          </div>

          {isLoading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-black/5" />
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-black/70">
                  Informações do setor
                </span>

                <textarea
                  rows={14}
                  value={knowledge}
                  maxLength={12000}
                  disabled={isSaving}
                  placeholder={`Exemplo:

O setor ${sectorName} é responsável por...

Atendemos os seguintes produtos e serviços...

As dúvidas mais frequentes são...

Informações importantes para o atendimento...`}
                  onChange={(event) => {
                    setKnowledge(
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
                  Escreva naturalmente, sem termos técnicos.
                </span>

                <span>
                  {knowledge.length}/12000
                </span>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Salvando..."
                    : "Salvar conhecimento"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
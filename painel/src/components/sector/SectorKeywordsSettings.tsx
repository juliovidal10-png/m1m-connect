"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type SectorKeyword = {
  id: string;
  sectorId: string;
  keyword: string;
  createdAt: string;
  updatedAt: string;
};

type SectorKeywordsSettingsProps = {
  sectorId: string;
  sectorName?: string;
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

export default function SectorKeywordsSettings({
  sectorId,
  sectorName,
  onBack,
}: SectorKeywordsSettingsProps) {
  const [keywords, setKeywords] =
    useState<SectorKeyword[]>([]);

  const [newKeyword, setNewKeyword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingKeywordId,
    setDeletingKeywordId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadKeywords =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/sectors/${sectorId}/keywords`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as
            | SectorKeyword[]
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            !Array.isArray(data) &&
              data.error
              ? data.error
              : "Não foi possível carregar as palavras-chave.",
          );
        }

        setKeywords(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
            "Erro ao carregar as palavras-chave.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [sectorId]);

  useEffect(() => {
    void loadKeywords();
  }, [loadKeywords]);

  async function createKeyword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const normalizedKeyword =
      newKeyword.trim();

    if (!normalizedKeyword) {
      setError(
        "Informe uma palavra-chave ou expressão.",
      );

      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/sectors/${sectorId}/keywords`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              keyword:
                normalizedKeyword,
            }),
          },
        );

      const data =
        (await response.json()) as
          | SectorKeyword
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data &&
            data.error
            ? data.error
            : "Não foi possível cadastrar a palavra-chave.",
        );
      }

      setNewKeyword("");

      setSuccess(
        "Palavra-chave adicionada com sucesso.",
      );

      await loadKeywords();
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Erro ao cadastrar a palavra-chave.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteKeyword(
    keyword: SectorKeyword,
  ) {
    if (deletingKeywordId) {
      return;
    }

    const confirmed =
      window.confirm(
        `Deseja excluir a palavra-chave "${keyword.keyword}"?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingKeywordId(
      keyword.id,
    );

    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/sectors/${sectorId}/keywords`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              keywordId:
                keyword.id,
            }),
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível excluir a palavra-chave.",
        );
      }

      setSuccess(
        "Palavra-chave excluída com sucesso.",
      );

      await loadKeywords();
    } catch (deleteError) {
      setError(
        getErrorMessage(
          deleteError,
          "Erro ao excluir a palavra-chave.",
        ),
      );
    } finally {
      setDeletingKeywordId(null);
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
        <div className="flex flex-col gap-5 border-b border-black/5 p-6 md:flex-row md:items-center md:justify-between lg:p-8">
          <div>
            <p className="text-sm font-semibold text-orange-600">
              Roteamento inteligente
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Palavras-chave
              {sectorName
                ? ` do setor ${sectorName}`
                : ""}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/50">
              Cadastre palavras e expressões que indiquem
              que o cliente deseja falar com este setor.
              Exemplos: boleto, segunda via, orçamento,
              vendas ou pagamento.
            </p>
          </div>

          <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
            {keywords.length}{" "}
            {keywords.length === 1
              ? "palavra-chave"
              : "palavras-chave"}
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

          <form
            onSubmit={createKeyword}
            className="rounded-2xl border border-black/5 bg-[#f7f7f8] p-5"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-black/70">
                Nova palavra-chave ou expressão
              </span>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={newKeyword}
                  placeholder="Ex.: segunda via do boleto"
                  maxLength={120}
                  disabled={isSaving}
                  onChange={(event) => {
                    setNewKeyword(
                      event.target.value,
                    );

                    setError(null);
                    setSuccess(null);
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !newKeyword.trim()
                  }
                  className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Adicionando..."
                    : "Adicionar"}
                </button>
              </div>
            </label>

            <p className="mt-3 text-xs leading-5 text-black/40">
              Use termos que seus clientes realmente
              utilizam. O sistema normaliza letras
              maiúsculas, acentos e espaços.
            </p>
          </form>

          <div className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-2xl bg-black/5"
                    />
                  ),
                )}
              </div>
            ) : keywords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center">
                <h3 className="text-lg font-bold">
                  Nenhuma palavra-chave cadastrada
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/45">
                  Adicione palavras ou expressões para
                  que o Router identifique este setor
                  automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {keywords.map(
                  (keyword) => {
                    const isDeleting =
                      deletingKeywordId ===
                      keyword.id;

                    return (
                      <article
                        key={keyword.id}
                        className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 transition hover:border-orange-100 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-black/75">
                            {keyword.keyword}
                          </p>

                          <p className="mt-1 text-xs text-black/35">
                            Usada para identificar
                            automaticamente este setor.
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            Boolean(
                              deletingKeywordId,
                            )
                          }
                          onClick={() =>
                            void deleteKeyword(
                              keyword,
                            )
                          }
                          className="shrink-0 rounded-lg border border-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting
                            ? "Excluindo..."
                            : "Excluir"}
                        </button>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

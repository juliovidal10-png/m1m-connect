"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import LegalFooter from "@/components/legal/LegalFooter";

export default function ResetPasswordPage() {
  const [token, setToken] =
    useState("");
  const [validating, setValidating] =
    useState(true);
  const [valid, setValid] =
    useState(false);
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const currentToken =
      new URLSearchParams(
        window.location.search,
      )
        .get("token")
        ?.trim() || "";

    setToken(currentToken);

    if (!currentToken) {
      setValidating(false);
      setValid(false);
      return;
    }

    fetch(
      `/api/auth/validate-password-reset-token?token=${encodeURIComponent(
        currentToken,
      )}`,
      {
        cache: "no-store",
      },
    )
      .then((response) => {
        setValid(response.ok);
      })
      .catch(() => {
        setValid(false);
      })
      .finally(() => {
        setValidating(false);
      });
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      loading ||
      !valid
    ) {
      return;
    }

    if (password.length < 8) {
      setError(
        "A senha deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "As senhas não coincidem.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              token,
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível redefinir a senha.",
        );
      }

      setSuccess(true);
      setValid(false);
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Não foi possível redefinir a senha.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-black/[0.06] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087B7B]">
            Recuperação de acesso
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#171717]">
            Criar nova senha
          </h1>

          {validating ? (
            <p className="mt-6 text-sm text-black/50">
              Validando seu link...
            </p>
          ) : success ? (
            <div className="mt-6">
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                Senha redefinida com sucesso.
              </div>

              <a
                href="/login"
                className="mt-6 block w-full rounded-2xl bg-[#171717] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-black"
              >
                Voltar para o login
              </a>
            </div>
          ) : !valid ? (
            <div className="mt-6">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Este link é inválido, expirou ou já foi utilizado.
              </div>

              <a
                href="/esqueci-senha"
                className="mt-6 block text-center text-sm font-semibold text-[#087B7B] transition hover:underline"
              >
                Solicitar novo link
              </a>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-black/65">
                  Nova senha
                </span>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );
                      setError(null);
                    }}
                    placeholder="Mínimo de 8 caracteres"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 pr-20 text-sm text-[#171717] outline-none transition placeholder:text-black/25 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-black/40 transition hover:bg-black/[0.04] hover:text-black/60"
                  >
                    {showPassword
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>
                </div>
              </label>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-bold text-black/65">
                  Confirmar nova senha
                </span>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value,
                    );
                    setError(null);
                  }}
                  placeholder="Digite novamente"
                  className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm text-[#171717] outline-none transition placeholder:text-black/25 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </label>

              {error && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Salvando..."
                  : "Redefinir senha"}
              </button>
            </form>
          )}
        </section>
      </div>

      <LegalFooter />
    </main>
  );
}

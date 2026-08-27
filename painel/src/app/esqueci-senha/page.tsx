"use client";

import {
  FormEvent,
  useState,
} from "react";

import LegalFooter from "@/components/legal/LegalFooter";

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Informe seu e-mail.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/auth/forgot-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
            }),
          },
        );

      const data =
        await response.json();

      setMessage(
        data?.message ||
          "Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir sua senha.",
      );
    } catch {
      setError(
        "Não foi possível concluir a solicitação. Tente novamente.",
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
            Esqueci minha senha
          </h1>

          <p className="mt-3 text-sm leading-6 text-black/50">
            Informe o e-mail cadastrado no M1M Connect.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-black/65">
                E-mail
              </span>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value,
                  );
                  setError(null);
                  setMessage(null);
                }}
                placeholder="seuemail@empresa.com.br"
                className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm text-[#171717] outline-none transition placeholder:text-black/25 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
              />
            </label>

            {error && (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Enviando..."
                : "Enviar instruções"}
            </button>

            <a
              href="/login"
              className="mt-4 block text-center text-sm font-semibold text-[#087B7B] transition hover:underline"
            >
              Voltar para o login
            </a>
          </form>
        </section>
      </div>

      <LegalFooter />
    </main>
  );
}

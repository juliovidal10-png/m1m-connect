"use client";

import {
  FormEvent,
  useState,
} from "react";
import LegalFooter from "@/components/legal/LegalFooter";

type LoginResponse = {
  authenticated: boolean;
  error?: string;
};

type MeResponse = {
  authenticated: boolean;
  company?: {
    onboardingCompleted: boolean;
  };
};

export default function LoginPage() {
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setIsLoading(true);

    try {
      const loginResponse =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
            }),
          },
        );

      const loginResult =
        (await loginResponse.json()) as
          LoginResponse;

      if (!loginResponse.ok) {
        throw new Error(
          loginResult.error ||
            "E-mail ou senha inválidos.",
        );
      }

      const meResponse =
        await fetch(
          "/api/auth/me",
          {
            method: "GET",
            cache: "no-store",
          },
        );

      const meResult =
        (await meResponse.json()) as
          MeResponse;

      if (
        !meResponse.ok ||
        !meResult.authenticated
      ) {
        throw new Error(
          "Sua sessão não pôde ser iniciada.",
        );
      }

      if (
        meResult.company
          ?.onboardingCompleted
      ) {
        window.location.assign("/dashboard");
        return;
      }

      window.location.assign(
        "/onboarding",
      );
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar.",
      );
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)]">
      <section
        aria-label="Centralizap — atendimento inteligente"
        className="relative hidden min-h-screen overflow-hidden bg-[#003b22] lg:flex lg:items-center lg:justify-center"
      >
        <img
          src="/brand/centralizap-login-hero.png"
          alt="Centralizap. Seu WhatsApp, sua equipe, tudo conectado."
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
      </section>

      <section className="flex min-h-screen flex-col bg-white px-6 py-8 sm:px-12 lg:px-10 xl:px-16">
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-8">
          <div className="mb-8 flex justify-center">
            <img
              src="/brand/centralizap-sidebar-logo.png"
              alt="Centralizap"
              className="h-auto w-[190px] object-contain sm:w-[220px]"
            />
          </div>

          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#078f8c]">
              Acesso à plataforma
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#173b32]">
              Bem-vindo de volta
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#64746f]">
              Entre com o e-mail e a senha cadastrados para acessar sua empresa.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#263d37]">
                E-mail
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-[#d8e3df] bg-[#fbfcfc] px-4 py-3.5 text-sm text-[#173b32] outline-none transition placeholder:text-[#9aa9a4] focus:border-[#0a9995] focus:bg-white focus:ring-4 focus:ring-[#0a9995]/10"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-[#263d37]">
                Senha
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="Digite sua senha"
                  className="w-full rounded-xl border border-[#d8e3df] bg-[#fbfcfc] px-4 py-3.5 pr-20 text-sm text-[#173b32] outline-none transition placeholder:text-[#9aa9a4] focus:border-[#0a9995] focus:bg-white focus:ring-4 focus:ring-[#0a9995]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-[#60736d] transition hover:bg-[#eef5f2] hover:text-[#173b32]"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>

            <div className="mt-3 flex justify-end">
              <a
                href="/esqueci-senha"
                className="text-sm font-semibold text-[#078f8c] transition hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#00a77b] to-[#008e83] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,143,119,0.18)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Entrando..." : "Entrar na Centralizap"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[#7b8b86]">
            Seu acesso é vinculado à empresa cadastrada na plataforma.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[760px] shrink-0">
          <LegalFooter />
        </div>
      </section>
    </main>
  );
}

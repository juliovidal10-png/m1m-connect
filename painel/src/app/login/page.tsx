"use client";

import {
  FormEvent,
  useState,
} from "react";

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
        window.location.assign("/");
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
    <main className="min-h-screen bg-[#f5f6f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden min-h-[640px] flex-col justify-between bg-[#171717] p-10 text-white lg:flex xl:p-12">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e93800] text-lg font-black">
                  M
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight">
                    M1M Connect
                  </p>
                  <p className="text-xs text-white/45">
                    Marketing1Minuto
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-md">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff7043]">
                  Atendimento inteligente
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.03em]">
                  Seu WhatsApp.
                  <br />
                  Sua equipe.
                  <br />
                  Tudo conectado.
                </h1>

                <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                  Organize conversas, clientes, setores e inteligência artificial em um único lugar.
                </p>
              </div>
            </div>

            <p className="text-xs text-white/30">
              M1M Connect • Plataforma de atendimento
            </p>
          </section>

          <section className="flex min-h-[640px] items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
            <div className="w-full max-w-md">
              <div className="lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e93800] font-black text-white">
                    M
                  </div>

                  <div>
                    <p className="font-black text-[#171717]">
                      M1M Connect
                    </p>
                    <p className="text-xs text-black/35">
                      Marketing1Minuto
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 lg:mt-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e93800]">
                  Acesso à plataforma
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#171717]">
                  Bem-vindo de volta
                </h2>

                <p className="mt-3 text-sm leading-6 text-black/45">
                  Entre com o e-mail e a senha cadastrados para acessar sua empresa.
                </p>
              </div>

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
                    }}
                    placeholder="seuemail@empresa.com.br"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 text-sm text-[#171717] outline-none transition placeholder:text-black/25 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-bold text-black/65">
                    Senha
                  </span>

                  <div className="relative">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );
                        setError(null);
                      }}
                      placeholder="Digite sua senha"
                      className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3.5 pr-20 text-sm text-[#171717] outline-none transition placeholder:text-black/25 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
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

                {error && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 w-full rounded-2xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading
                    ? "Entrando..."
                    : "Entrar no M1M Connect"}
                </button>
              </form>

              <div className="mt-8 border-t border-black/[0.06] pt-6">
                <p className="text-center text-xs leading-5 text-black/35">
                  Seu acesso é vinculado à empresa cadastrada no M1M Connect.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

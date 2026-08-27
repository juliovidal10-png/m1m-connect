"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import LegalFooter from "@/components/legal/LegalFooter";

type SetupPasswordResponse = {
  passwordConfigured: boolean;
  email?: string;
  error?: string;
};

type ValidateTokenResponse = {
  valid?: boolean;
  error?: string;
};

export default function PrimeiroAcessoPage() {
  const [token, setToken] =
    useState("");
  const [tokenChecked, setTokenChecked] =
    useState(false);
  const [tokenValid, setTokenValid] =
    useState(false);
  const [
    tokenValidationError,
    setTokenValidationError,
  ] = useState<string | null>(null);
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");
  const [
    showPassword,
    setShowPassword,
  ] = useState(false);
  const [isLoading, setIsLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState(false);
  const [email, setEmail] =
    useState<string | null>(null);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const currentToken =
      params.get("token")?.trim() || "";

    setToken(currentToken);

    if (!currentToken) {
      setTokenValid(false);
      setTokenValidationError(
        "Link de primeiro acesso inválido ou incompleto.",
      );
      setTokenChecked(true);
      return;
    }

    let cancelled = false;

    async function validateFirstAccessToken() {
      try {
        const response =
          await fetch(
            "/api/auth/validate-first-access-token",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                token: currentToken,
              }),
            },
          );

        const result =
          (await response.json()) as
            ValidateTokenResponse;

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !result.valid
        ) {
          setTokenValid(false);
          setTokenValidationError(
            result.error ||
              "Link de primeiro acesso inválido, expirado ou já utilizado.",
          );
          return;
        }

        setTokenValid(true);
        setTokenValidationError(null);
      } catch {
        if (!cancelled) {
          setTokenValid(false);
          setTokenValidationError(
            "Não foi possível validar o link de primeiro acesso.",
          );
        }
      } finally {
        if (!cancelled) {
          setTokenChecked(true);
        }
      }
    }

    void validateFirstAccessToken();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setError(null);

    if (!token || !tokenValid) {
      setError(
        "Link de primeiro acesso inválido, expirado ou já utilizado.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "A senha deve ter pelo menos 8 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "As senhas informadas não coincidem.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/setup-password",
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

      const result =
        (await response.json()) as
          SetupPasswordResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível concluir o primeiro acesso.",
        );
      }

      setEmail(
        result.email || null,
      );
      setSuccess(true);
      setTokenValid(false);
      setPassword("");
      setConfirmPassword("");
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Não foi possível concluir o primeiro acesso.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden min-h-[640px] flex-col justify-between bg-[#171717] p-10 text-white lg:flex xl:p-12">
            <div>
              <img
                src="/m1m-connect-login-logo.png"
                alt="M1M Connect"
                className="block h-auto w-[320px] max-w-full object-contain object-left sm:w-[345px]"
              />

              <div className="mt-20 max-w-md">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087B7B]">
                  Primeiro acesso
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.03em]">
                  Crie sua senha.
                  <br />
                  Acesse sua empresa.
                </h1>

                <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
                  Este link é individual, temporário e só pode ser utilizado uma vez.
                </p>
              </div>
            </div>

            <p className="text-xs text-white/30">
              M1M Connect • Plataforma de atendimento
            </p>
          </section>

          <section className="flex min-h-[640px] items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
            <div className="w-full max-w-md">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087B7B]">
                  Ativação da conta
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#171717]">
                  {success
                    ? "Senha criada com sucesso"
                    : "Defina sua senha"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-black/45">
                  {success
                    ? "Seu acesso ao M1M Connect está pronto."
                    : "Crie uma senha com pelo menos 8 caracteres para concluir seu primeiro acesso."}
                </p>
              </div>

              {!tokenChecked ? (
                <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4 text-sm text-black/55">
                  Verificando link de primeiro acesso...
                </div>
              ) : success ? (
                <div className="mt-8">
                  {email && (
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      Conta ativada para <strong>{email}</strong>.
                    </div>
                  )}

                  <a
                    href="/login"
                    className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black"
                  >
                    Entrar no M1M Connect
                  </a>
                </div>
              ) : !token || !tokenValid ? (
                <div className="mt-8">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                    {tokenValidationError ||
                      "Link de primeiro acesso inválido, expirado ou já utilizado."}
                  </div>

                  <a
                    href="/login"
                    className="mt-6 flex w-full items-center justify-center rounded-2xl border border-black/10 px-5 py-3.5 text-sm font-bold text-[#171717] transition hover:bg-black/[0.03]"
                  >
                    Voltar para o login
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
                      Confirmar senha
                    </span>

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(
                          event.target.value,
                        );
                        setError(null);
                      }}
                      placeholder="Digite a senha novamente"
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
                    disabled={isLoading}
                    className="mt-6 w-full rounded-2xl bg-[#171717] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading
                      ? "Criando senha..."
                      : "Criar senha e ativar acesso"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-[1050px] px-4">
        <LegalFooter />
      </div>
    </main>
  );
}
"use client";

import {
  useEffect,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AccessStatus =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED";

type AccessResponse = {
  companyId?: string;
  subscriptionStatus?: AccessStatus;
  trialEndsAt?: string | null;
  accessEndsAt?: string | null;
  accessAllowed?: boolean;
  accessReason?: string;
};

export default function CompanyAccessGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const previewExpired =
    searchParams.get("m1mPreviewExpired") ===
    "1";

  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<AccessResponse | null>(
      null,
    );

  const [
    legalAcceptanceRequired,
    setLegalAcceptanceRequired,
  ] = useState(false);

  const [
    legalAcceptanceChecked,
    setLegalAcceptanceChecked,
  ] = useState(false);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/aceite" || pathname === "/termos" || pathname === "/privacidade" || pathname === "/lgpd" || pathname === "/whatsapp" || pathname.startsWith("/m1m-admin")) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAccess() {
      try {
        const response =
          await fetch(
            "/api/company/access-status",
            {
              cache:
                "no-store",
            },
          );

        if (!response.ok) {
          if (!cancelled) {
            setData(null);
          }

          return;
        }

        const json =
          (await response.json()) as AccessResponse;

        if (!cancelled) {
          setData(json);
        }

        const legalResponse =
          await fetch(
            "/api/legal-acceptance",
            {
              cache: "no-store",
            },
          );

        if (legalResponse.ok) {
          const legalJson =
            (await legalResponse.json()) as {
              required?: boolean;
              accepted?: boolean;
            };

          if (!cancelled) {
            setLegalAcceptanceRequired(
              legalJson.required === true &&
                legalJson.accepted === false,
            );
          }
        }

        if (!cancelled) {
          setLegalAcceptanceChecked(true);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setLegalAcceptanceChecked(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname === "/login" || pathname === "/aceite" || pathname === "/termos" || pathname === "/privacidade" || pathname === "/lgpd" || pathname === "/whatsapp" || pathname.startsWith("/m1m-admin")) {
    return children;
  }

  if (loading || !legalAcceptanceChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-6 text-[#191919]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
          <p className="mt-4 text-sm text-black/50">
            Carregando sua conta...
          </p>
        </div>
      </div>
    );
  }

  if (
    legalAcceptanceRequired &&
    pathname !== "/aceite"
  ) {
    if (typeof window !== "undefined") {
      window.location.replace("/aceite");
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-6 text-[#191919]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
          <p className="mt-4 text-sm text-black/50">
            Verificando aceite...
          </p>
        </div>
      </div>
    );
  }

  if (
    previewExpired ||
    (
      data &&
      data.accessAllowed === false
    )
  ) {
    const isSuspended =
      !previewExpired &&
      data?.subscriptionStatus ===
        "SUSPENDED";

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-6 py-6 text-[#191919]">
        <section className="w-full max-w-[440px] rounded-[24px] border border-black/10 bg-white px-6 py-6 shadow-[0_14px_38px_rgba(15,23,42,0.09)]">
          <div className="flex justify-center">
            <img
              src="/brand/m1m-connect-logo.svg"
              alt="M1M Connect"
              className="h-auto w-full max-w-[210px] object-contain"
            />
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#111827]">
              {isSuspended
                ? "Acesso temporariamente suspenso"
                : "Seu período de acesso terminou"}
            </h1>

            <p className="mx-auto mt-3 max-w-[380px] text-left text-[13px] leading-5 text-[#5f6877]">
              {isSuspended
                ? "A conta da empresa está suspensa no momento."
                : "Seu período de teste gratuito terminou ou seu acesso está temporariamente suspenso."}
            </p>

            <p className="mx-auto mt-3 max-w-[380px] text-left text-[13px] leading-5 text-[#5f6877]">
              Seus clientes, conversas, configurações, setores e demais dados
              continuam preservados. Assim que a conta for reativada pela
              M1M Connect, a plataforma volta a funcionar normalmente.
            </p>
          </div>

          <div className="my-4 h-px w-full bg-[#dfe4e8]" />

          <div className="flex items-center gap-3">
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#eef9f9] text-[#079ba5]">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
                <path d="M18 19c0 1.1-.9 2-2 2h-2" />
                <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Z" />
                <path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" />
              </svg>
            </div>

            <div className="min-w-0 text-left">
              <p className="text-[14px] font-bold text-[#111827]">
                Fale com a M1M Connect para reativar seu acesso.
              </p>

              <a
                href="https://wa.me/5565996051599?text=Ol%C3%A1%21%20Gostaria%20de%20falar%20sobre%20a%20reativa%C3%A7%C3%A3o%20do%20meu%20acesso%20%C3%A0%20M1M%20Connect."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-[18px] font-bold text-[#079ba5] underline decoration-[#079ba5]/35 underline-offset-4 transition hover:opacity-80"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-[#18b85b]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12.04 2C6.52 2 2.05 6.46 2.05 11.97c0 1.93.55 3.82 1.58 5.45L2 22l4.72-1.55a9.95 9.95 0 0 0 5.31 1.5h.01c5.51 0 9.99-4.46 9.99-9.97C22.03 6.46 17.55 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.8.92.94-2.73-.2-.31a8.1 8.1 0 0 1-1.25-4.73c0-4.49 3.66-8.14 8.17-8.14 4.5 0 8.16 3.65 8.16 8.14 0 4.49-3.66 8.17-8.17 8.17Zm4.48-6.11c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                </svg>
                (65) 99605-1599
              </a>

              <p className="mt-1 text-[11px] text-[#667085]">
                Clique no número para abrir o WhatsApp
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#eef9fa] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#079ba5]">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#26313f]">
                Seus dados estão seguros e protegidos.
              </p>
              <p className="mt-1 text-[12px] leading-4 text-[#5f6877]">
                Basta reativar sua conta para continuar de onde parou.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return children;
}

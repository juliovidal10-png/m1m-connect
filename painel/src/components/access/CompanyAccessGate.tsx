"use client";

import {
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

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

  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<AccessResponse | null>(
      null,
    );

  useEffect(() => {
    if (pathname === "/login") {
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
      } catch {
        if (!cancelled) {
          setData(null);
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

  if (pathname === "/login") {
    return children;
  }

  if (loading) {
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
    data &&
    data.accessAllowed === false
  ) {
    const isSuspended =
      data.subscriptionStatus ===
      "SUSPENDED";

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-6 py-10 text-[#191919]">
        <section className="w-full max-w-xl rounded-3xl border border-black/5 bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
            M1M
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            M1M Connect
          </p>

          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            {isSuspended
              ? "Acesso temporariamente suspenso"
              : "Seu período de acesso terminou"}
          </h1>

          <p className="mt-4 leading-7 text-black/60">
            {isSuspended
              ? "A conta da empresa está suspensa no momento."
              : "O período de teste ou de acesso da empresa chegou ao fim."}
          </p>

          <p className="mt-3 leading-7 text-black/60">
            Seus clientes, conversas, configurações, setores e demais dados
            continuam preservados. Assim que a conta for reativada pela M1M, a
            plataforma volta a funcionar normalmente.
          </p>

          <p className="mt-6 text-sm text-black/45">
            Entre em contato com a Marketing1Minuto para reativação.
          </p>
        </section>
      </main>
    );
  }

  return children;
}

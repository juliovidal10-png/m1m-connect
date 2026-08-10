"use client";

import { useCallback, useEffect, useState } from "react";

type ConnectionState = "CONNECTED" | "CONNECTING" | "DISCONNECTED";

type StatusResponse = {
  instanceName: string;
  exists: boolean;
  state: ConnectionState;
  phone: string | null;
  profileName: string | null;
  error?: string;
};

type ConnectResponse = {
  instanceName?: string;
  base64?: string | null;
  code?: string | null;
  error?: string;
};

type DisconnectResponse = {
  success?: boolean;
  state?: ConnectionState;
  error?: string;
};

function normalizeQrSource(value: string | null) {
  if (!value) return null;
  if (value.startsWith("data:image")) return value;
  return `data:image/png;base64,${value}`;
}

function formatPhone(value: string | null) {
  if (!value) return "Não informado";

  if (value.length === 13 && value.startsWith("55")) {
    return `+55 (${value.slice(2, 4)}) ${value.slice(4, 9)}-${value.slice(9)}`;
  }

  return `+${value}`;
}

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/whatsapp/status", {
        cache: "no-store",
      });

      const data = (await response.json()) as StatusResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível consultar a conexão.",
        );
      }

      setStatus(data);

      if (data.state === "CONNECTED") {
        setQrCode(null);
        setError(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar a conexão.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const timer = window.setInterval(() => {
      void loadStatus();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [loadStatus]);

  async function generateQrCode() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
      });

      const data = (await response.json()) as ConnectResponse;

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível gerar o QR Code.");
      }

      const source = normalizeQrSource(data.base64 || null);

      if (!source) {
        throw new Error(
          "A conexão respondeu sem imagem de QR Code.",
        );
      }

      setQrCode(source);
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível gerar o QR Code.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function disconnectWhatsApp() {
    const confirmed = window.confirm(
      "Deseja realmente desconectar este WhatsApp do M1M Connect?",
    );

    if (!confirmed) return;

    setIsDisconnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
      });

      const data = (await response.json()) as DisconnectResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível desconectar o WhatsApp.",
        );
      }

      setQrCode(null);
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível desconectar o WhatsApp.",
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  const connected = status?.state === "CONNECTED";

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
            Configurações
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#161616]">
            Conectar WhatsApp
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
            Conecte o número da empresa ao M1M Connect escaneando o QR Code pelo WhatsApp.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
            <div className="border-b border-black/[0.05] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#171717]">
                    QR Code de conexão
                  </p>
                  <p className="mt-1 text-xs text-black/40">
                    Abra o WhatsApp no celular e leia o código abaixo.
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    connected
                      ? "bg-emerald-50 text-emerald-700"
                      : status?.state === "CONNECTING"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-black/[0.04] text-black/50"
                  }`}
                >
                  {connected
                    ? "Conectado"
                    : status?.state === "CONNECTING"
                      ? "Conectando"
                      : "Desconectado"}
                </div>
              </div>
            </div>

            <div className="flex min-h-[430px] flex-col items-center justify-center p-7 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black/50" />
                  <p className="mt-4 text-sm text-black/45">
                    Verificando conexão...
                  </p>
                </div>
              ) : connected ? (
                <div className="flex max-w-sm flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-10 w-10"
                      aria-hidden="true"
                    >
                      <path
                        d="m6.5 12.5 3.3 3.3 7.7-8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-[#171717]">
                    WhatsApp conectado
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-black/45">
                    A conexão está ativa e pronta para receber e enviar mensagens pelo M1M Connect.
                  </p>

                  <button
                    type="button"
                    onClick={disconnectWhatsApp}
                    disabled={isDisconnecting}
                    className="mt-7 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDisconnecting
                      ? "Desconectando..."
                      : "Desconectar WhatsApp"}
                  </button>
                </div>
              ) : qrCode ? (
                <>
                  <div className="rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm">
                    <img
                      src={qrCode}
                      alt="QR Code para conectar WhatsApp"
                      className="h-72 w-72 object-contain"
                    />
                  </div>

                  <p className="mt-5 text-sm font-semibold text-[#171717]">
                    Escaneie pelo WhatsApp
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    O status será atualizado automaticamente após a leitura.
                  </p>
                </>
              ) : (
                <div className="max-w-sm">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f0f1f2] text-black/40">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-9 w-9"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm11 1h2v2h-2v-2Zm3 0h2v5h-2v-5Zm-3 3h2v2h-2v-2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-[#171717]">
                    Gere o QR Code
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-black/45">
                    Clique abaixo para preparar a conexão da empresa com o WhatsApp.
                  </p>
                </div>
              )}

              {!connected && (
                <button
                  type="button"
                  onClick={generateQrCode}
                  disabled={isGenerating}
                  className="mt-7 rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating
                    ? "Gerando QR Code..."
                    : qrCode
                      ? "Atualizar QR Code"
                      : "Gerar QR Code"}
                </button>
              )}

              {error && (
                <div className="mt-5 max-w-md rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-xs font-medium leading-5 text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-bold text-[#171717]">
                Status da conexão
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-black/[0.05] pb-4">
                  <span className="text-xs font-medium text-black/40">
                    Número conectado
                  </span>
                  <span className="text-sm font-semibold text-[#171717]">
                    {formatPhone(status?.phone || null)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-black/40">
                    Nome do WhatsApp
                  </span>
                  <span className="max-w-[190px] truncate text-right text-sm font-semibold text-[#171717]">
                    {status?.profileName || "Não informado"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
              <p className="text-sm font-bold text-[#171717]">
                Como conectar
              </p>

              <div className="mt-4 space-y-3 text-sm leading-6 text-black/50">
                <p>1. Abra o WhatsApp no celular.</p>
                <p>2. Acesse Dispositivos conectados.</p>
                <p>3. Toque em Conectar um dispositivo.</p>
                <p>4. Aponte a câmera para o QR Code.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

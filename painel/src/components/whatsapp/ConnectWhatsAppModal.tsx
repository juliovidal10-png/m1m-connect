"use client";

import { useState } from "react";

type ConnectWhatsAppModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CreateConnectionResponse = {
  error?: string;
  instance?: {
    instanceName?: string;
  };
  qrcode?: {
    base64?: string;
    code?: string;
  };
  base64?: string;
  code?: string;
};

export default function ConnectWhatsAppModal({
  isOpen,
  onClose,
}: ConnectWhatsAppModalProps) {
  const [connectionName, setConnectionName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCode, setQrCode] = useState("");

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const instanceName = connectionName.trim();

    if (!instanceName) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setQrCode("");

    try {
      const response = await fetch("/api/whatsapp/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName,
        }),
      });

      const data: CreateConnectionResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível criar a conexão.");
      }

      const receivedQrCode = data.qrcode?.base64 || data.base64 || "";

      if (!receivedQrCode) {
        throw new Error("A conexão foi criada, mas o QR Code não foi retornado.");
      }

      setQrCode(receivedQrCode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setConnectionName("");
    setErrorMessage("");
    setQrCode("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#191919]">
              {qrCode ? "Escaneie o QR Code" : "Conectar WhatsApp"}
            </h2>

            <p className="mt-1 text-sm text-black/50">
              {qrCode
                ? "Abra o WhatsApp no celular e conecte um novo dispositivo."
                : "Dê um nome para identificar esta conexão."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-black/40 transition hover:bg-black/5 hover:text-black"
            aria-label="Fechar janela"
          >
            ×
          </button>
        </div>

        {qrCode ? (
          <div className="mt-6">
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <img
                src={qrCode}
                alt="QR Code para conectar o WhatsApp"
                className="mx-auto h-64 w-64"
              />
            </div>

            <p className="mt-4 text-center text-sm text-black/50">
              WhatsApp → Dispositivos conectados → Conectar dispositivo
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <label
              htmlFor="connection-name"
              className="text-sm font-semibold text-[#191919]"
            >
              Nome da conexão
            </label>

            <input
              id="connection-name"
              type="text"
              value={connectionName}
              onChange={(event) => setConnectionName(event.target.value)}
              placeholder="Ex.: Financeiro"
              autoFocus
              disabled={isLoading}
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
            />

            <p className="mt-2 text-xs text-black/40">
              Esse nome aparecerá somente dentro do M1M Connect.
            </p>

            {errorMessage && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!connectionName.trim() || isLoading}
                className="rounded-xl bg-[#ff3d00] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? "Criando..." : "Criar conexão"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
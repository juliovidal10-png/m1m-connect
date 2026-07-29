"use client";

import useMediaLoader from "@/hooks/useMediaLoader";
import type { ChatMessage } from "./MessageRenderer";

type CustomerAudioPlayerProps = {
  message: ChatMessage;
  onClose: () => void;
};

function formatDuration(seconds?: number) {
  if (
    typeof seconds !== "number" ||
    Number.isNaN(seconds) ||
    seconds < 0
  ) {
    return "";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export default function CustomerAudioPlayer({
  message,
  onClose,
}: CustomerAudioPlayerProps) {
  const { media, loading, error } = useMediaLoader(
    message.id,
    message,
  );

  const duration = formatDuration(
    message.message?.audioMessage?.seconds,
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#ff3d00]" />

          <p className="mt-4 text-sm font-semibold text-black/70">
            Carregando áudio...
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/55 transition hover:bg-black/[0.03]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (error || !media?.base64 || !media.mimetype) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <span className="text-4xl">🎤</span>

          <h2 className="mt-4 text-lg font-bold">
            Áudio indisponível
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/45">
            Não foi possível recuperar este áudio pela
            Evolution API.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 h-11 w-full rounded-xl bg-[#ff3d00] text-sm font-semibold text-white transition hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const audioSource =
    `data:${media.mimetype};base64,${media.base64}`;

  const downloadFileName =
    media.fileName || `audio-${message.id}.ogg`;

  function handleDownload() {
    const link = document.createElement("a");

    link.href = audioSource;
    link.download = downloadFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
              Áudio da conversa
            </p>

            <h2 className="mt-1 text-lg font-bold">
              Reprodução de áudio
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar player"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-xl text-black/45 transition hover:bg-black/[0.03]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 rounded-xl bg-black/[0.035] p-4">
          <audio
            controls
            autoPlay
            preload="metadata"
            src={audioSource}
            className="w-full"
          >
            Seu navegador não suporta reprodução de áudio.
          </audio>

          {duration && (
            <p className="mt-2 text-right text-xs text-black/40">
              Duração: {duration}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="h-11 flex-1 rounded-xl border border-black/10 text-sm font-semibold text-black/65 transition hover:bg-black/[0.03]"
          >
            Baixar áudio
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl bg-[#ff3d00] text-sm font-semibold text-white transition hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
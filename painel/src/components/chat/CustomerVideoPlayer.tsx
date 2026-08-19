"use client";

import useMediaLoader from "@/hooks/useMediaLoader";
import type { ChatMessage } from "./MessageRenderer";

type CustomerVideoPlayerProps = {
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

function getVideoCaption(message: ChatMessage) {
  return (
    message.message?.videoMessage?.caption?.trim() ||
    "Vídeo da conversa"
  );
}

export default function CustomerVideoPlayer({
  message,
  onClose,
}: CustomerVideoPlayerProps) {
  const { media, loading, error } = useMediaLoader(
    message.id,
    message,
  );

  const duration = formatDuration(
    message.message?.videoMessage?.seconds,
  );

  const caption =
    media?.caption || getVideoCaption(message);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#0A9090]" />

          <p className="mt-4 text-sm font-semibold text-black/70">
            Carregando vídeo...
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
          <span className="text-4xl">🎥</span>

          <h2 className="mt-4 text-lg font-bold">
            Vídeo indisponível
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/45">
            Não foi possível recuperar este vídeo pela
            Evolution API.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 h-11 w-full rounded-xl bg-[#0A9090] text-sm font-semibold text-white transition hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const videoSource =
    `data:${media.mimetype};base64,${media.base64}`;

  const downloadFileName =
    media.fileName || `video-${message.id}.mp4`;

  function handleDownload() {
    const link = document.createElement("a");

    link.href = videoSource;
    link.download = downloadFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
              Vídeo da conversa
            </p>

            <h2
              title={caption}
              className="mt-1 truncate text-lg font-bold"
            >
              {caption}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar vídeo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-xl text-black/45 transition hover:bg-black/[0.03]"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
          <video
            controls
            autoPlay
            playsInline
            preload="metadata"
            src={videoSource}
            className="max-h-[68vh] max-w-full rounded-xl object-contain"
          >
            Seu navegador não suporta reprodução de vídeo.
          </video>
        </div>

        <footer className="shrink-0 border-t border-black/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-black/45">
              {duration && (
                <span>Duração: {duration}</span>
              )}

              {media.size ? (
                <span>
                  {duration ? " • " : ""}
                  {(media.size / 1024 / 1024)
                    .toFixed(1)
                    .replace(".", ",")}{" "}
                  MB
                </span>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="h-11 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/65 transition hover:bg-black/[0.03]"
              >
                Baixar vídeo
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl bg-[#0A9090] px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
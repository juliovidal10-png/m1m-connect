"use client";

import useMediaLoader from "@/hooks/useMediaLoader";
import ImageViewer from "./ImageViewer";
import type { ChatMessage } from "./MessageRenderer";

type CustomerImageViewerProps = {
  message: ChatMessage;
  onClose: () => void;
};

function getImageCaption(message: ChatMessage) {
  return (
    message.message?.imageMessage?.caption?.trim() ||
    "Imagem da conversa"
  );
}

export default function CustomerImageViewer({
  message,
  onClose,
}: CustomerImageViewerProps) {
  const {
    media,
    loading,
    error,
  } = useMediaLoader(message.id, message);

  const caption =
    media?.caption || getImageCaption(message);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-6">
        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#0A9090]" />

          <p className="mt-4 text-sm font-semibold text-black/70">
            Carregando imagem...
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-black/55 transition hover:bg-black/[0.03]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (
    error ||
    !media?.base64 ||
    !media.mimetype
  ) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <span className="text-4xl">
            📷
          </span>

          <h2 className="mt-4 text-lg font-bold">
            Imagem indisponível
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/45">
            Não foi possível recuperar esta imagem
            pela Evolution API.
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

  const imageSource =
    `data:${media.mimetype};base64,${media.base64}`;

  return (
    <ImageViewer
      isOpen
      imageSource={imageSource}
      altText={caption}
      fileName={
        media.fileName ||
        `imagem-${message.id}.jpg`
      }
      onClose={onClose}
    />
  );
}
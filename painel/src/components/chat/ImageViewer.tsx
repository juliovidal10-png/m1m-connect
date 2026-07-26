"use client";

import { useEffect } from "react";

type ImageViewerProps = {
  isOpen: boolean;
  imageSource: string;
  altText: string;
  fileName?: string | null;
  onClose: () => void;
};

export default function ImageViewer({
  isOpen,
  imageSource,
  altText,
  fileName,
  onClose,
}: ImageViewerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleDownload() {
    const link = document.createElement("a");

    link.href = imageSource;
    link.download = fileName || "imagem-whatsapp";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleOpenNewTab() {
    const newWindow = window.open();

    if (!newWindow) {
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>${fileName || "Imagem"}</title>
          <style>
            html,
            body {
              margin: 0;
              min-height: 100%;
              background: #111;
            }

            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            img {
              display: block;
              max-width: 100vw;
              max-height: 100vh;
              object-fit: contain;
            }
          </style>
        </head>

        <body>
          <img
            src="${imageSource}"
            alt="${altText.replaceAll('"', "&quot;")}"
          />
        </body>
      </html>
    `);

    newWindow.document.close();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagem"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-medium">
          {fileName || altText || "Imagem"}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            Baixar
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            Nova aba
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar visualizador"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none transition hover:bg-white/20"
          >
            ×
          </button>
        </div>
      </div>

      <div
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4"
      >
        <img
          src={imageSource}
          alt={altText}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>

      <p className="shrink-0 px-4 pb-3 text-center text-xs text-white/55">
        Clique fora da imagem ou pressione Esc para fechar.
      </p>
    </div>
  );
}
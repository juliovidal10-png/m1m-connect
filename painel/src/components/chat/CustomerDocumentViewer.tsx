"use client";

import useMediaLoader from "@/hooks/useMediaLoader";
import type { ChatMessage } from "./MessageRenderer";

type CustomerDocumentViewerProps = {
  message: ChatMessage;
  onClose: () => void;
};

function getDocumentName(message: ChatMessage) {
  return (
    message.message?.documentMessage?.fileName?.trim() ||
    message.message?.documentMessage?.title?.trim() ||
    "Documento"
  );
}

function formatFileSize(bytes?: number | null) {
  if (
    typeof bytes !== "number" ||
    Number.isNaN(bytes) ||
    bytes <= 0
  ) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(0)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${megabytes.toFixed(1).replace(".", ",")} MB`;
}

function getDocumentExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim();

  return extension ? extension.toUpperCase() : "ARQUIVO";
}

function createObjectUrl(
  base64: string,
  mimetype: string,
) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (
    let index = 0;
    index < byteCharacters.length;
    index += 1
  ) {
    byteNumbers[index] =
      byteCharacters.charCodeAt(index);
  }

  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], {
    type: mimetype,
  });

  return URL.createObjectURL(blob);
}

export default function CustomerDocumentViewer({
  message,
  onClose,
}: CustomerDocumentViewerProps) {
  const { media, loading, error } = useMediaLoader(
    message.id,
    message,
  );

  const documentName =
    media?.fileName || getDocumentName(message);

  const originalSize =
    message.message?.documentMessage?.fileLength?.low;

  const fileSize = formatFileSize(
    media?.size || originalSize,
  );

  const extension =
    getDocumentExtension(documentName);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#ff3d00]" />

          <p className="mt-4 text-sm font-semibold text-black/70">
            Preparando documento...
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

  if (
    error ||
    !media?.base64 ||
    !media.mimetype
  ) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <span className="text-4xl">📄</span>

          <h2 className="mt-4 text-lg font-bold">
            Documento indisponível
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/45">
            Não foi possível recuperar este arquivo
            pela Evolution API.
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

  const mediaBase64 = media.base64;
  const mediaMimetype = media.mimetype;

  const documentSource =
    `data:${mediaMimetype};base64,${mediaBase64}`;

  const isPdf =
    mediaMimetype === "application/pdf";

  function handleDownload() {
    const link = document.createElement("a");

    link.href = documentSource;
    link.download = documentName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleOpenPdf() {
    const objectUrl = createObjectUrl(
      mediaBase64,
      mediaMimetype,
    );

    window.open(
      objectUrl,
      "_blank",
      "noopener,noreferrer",
    );

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60_000);
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
              Documento da conversa
            </p>

            <h2
              title={documentName}
              className="mt-1 truncate text-lg font-bold"
            >
              {documentName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar documento"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-xl text-black/45 transition hover:bg-black/[0.03]"
          >
            ×
          </button>
        </header>

        <div className="p-6">
          <div className="flex items-start gap-4 rounded-xl bg-black/[0.03] p-4">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-xl bg-red-50 text-3xl">
              📄
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold leading-5">
                {documentName}
              </p>

              <p className="mt-2 text-xs text-black/45">
                {extension}
                {fileSize ? ` • ${fileSize}` : ""}
              </p>

              <p className="mt-2 text-xs text-black/35">
                {mediaMimetype}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isPdf && (
              <button
                type="button"
                onClick={handleOpenPdf}
                className="h-12 w-full rounded-xl border border-black/10 text-sm font-semibold text-black/65 transition hover:bg-black/[0.03]"
              >
                Visualizar PDF
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="h-12 w-full rounded-xl bg-[#ff3d00] text-sm font-semibold text-white transition hover:opacity-90"
            >
              Baixar documento
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border border-black/10 text-sm font-semibold text-black/55 transition hover:bg-black/[0.03]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
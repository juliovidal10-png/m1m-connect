"use client";

import { useState } from "react";

import useMediaLoader from "@/hooks/useMediaLoader";
import ImageViewer from "./ImageViewer";

export type ChatMessage = {
  id: string;
  key: {
    fromMe: boolean;
    remoteJid: string;
    participant?: string;
    remoteJidAlt?: string;
  };
  pushName?: string | null;
  messageType?: string;
  messageTimestamp: number;
  message?: {
    conversation?: string;

    imageMessage?: {
      caption?: string;
      url?: string;
      mimetype?: string;
      width?: number;
      height?: number;
    };

    audioMessage?: {
      ptt?: boolean;
      url?: string;
      seconds?: number;
      mimetype?: string;
      waveform?: string;
    };

    videoMessage?: {
      caption?: string;
      url?: string;
      seconds?: number;
      mimetype?: string;
      width?: number;
      height?: number;
      jpegThumbnail?: string;
    };

    documentMessage?: {
      title?: string;
      fileName?: string;
      caption?: string;
      url?: string;
      mimetype?: string;
      fileLength?: {
        low?: number;
        high?: number;
        unsigned?: boolean;
      };
    };
  };
};

type MessageRendererProps = {
  message: ChatMessage;
};

const LINK_PATTERN =
  /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com\.br|net\.br|org\.br|com|net|org|io|me|app|dev|co)(?:\/[^\s]*)?)/gi;

function getTextMessage(message: ChatMessage) {
  return message.message?.conversation?.trim() || "";
}

function getImageCaption(message: ChatMessage) {
  return message.message?.imageMessage?.caption?.trim() || "";
}

function getVideoCaption(message: ChatMessage) {
  return message.message?.videoMessage?.caption?.trim() || "";
}

function getDocumentName(message: ChatMessage) {
  const document = message.message?.documentMessage;

  return (
    document?.fileName?.trim() ||
    document?.title?.trim() ||
    "Documento"
  );
}

function formatMediaDuration(seconds?: number) {
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

function getClickableUrl(value: string) {
  if (
    value.toLowerCase().startsWith("http://") ||
    value.toLowerCase().startsWith("https://")
  ) {
    return value;
  }

  return `https://${value}`;
}

function splitTrailingPunctuation(value: string) {
  const match = value.match(/^(.*?)([),.!?;:]+)?$/);

  return {
    linkText: match?.[1] || value,
    punctuation: match?.[2] || "",
  };
}

function LinkifiedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(LINK_PATTERN);

  return (
    <p
      className={`whitespace-pre-wrap break-words text-sm leading-6 ${className}`}
    >
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        const isLink = new RegExp(
          `^${LINK_PATTERN.source}$`,
          "i",
        ).test(part);

        if (!isLink) {
          return (
            <span key={`${part}-${index}`}>
              {part}
            </span>
          );
        }

        const {
          linkText,
          punctuation,
        } = splitTrailingPunctuation(part);

        return (
          <span key={`${part}-${index}`}>
            <a
              href={getClickableUrl(linkText)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline decoration-current/50 underline-offset-2 transition hover:opacity-75"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {linkText}
            </a>

            {punctuation}
          </span>
        );
      })}
    </p>
  );
}

function UnsupportedMessage() {
  return (
    <p className="text-sm leading-6">
      Mensagem ainda não suportada.
    </p>
  );
}

function TextMessage({
  message,
}: MessageRendererProps) {
  const text = getTextMessage(message);

  if (!text) {
    return <UnsupportedMessage />;
  }

  return <LinkifiedText text={text} />;
}

function ImageMessage({
  message,
}: MessageRendererProps) {
  const [isViewerOpen, setIsViewerOpen] =
    useState(false);

  const {
    media,
    loading,
    error,
  } = useMediaLoader(message.id, message);

  const caption =
    media?.caption ||
    getImageCaption(message);

  const imageWidth =
    message.message?.imageMessage?.width ?? 0;

  const imageHeight =
    message.message?.imageMessage?.height ?? 0;

  const isVertical =
    imageHeight > imageWidth &&
    imageHeight > 0;

  if (loading) {
    return (
      <div className="flex min-h-40 w-72 animate-pulse items-center justify-center rounded-xl bg-black/5 px-4 text-center text-xs text-black/45">
        Carregando imagem...
      </div>
    );
  }

  if (error || !media?.base64) {
    return (
      <div className="flex min-h-32 w-72 flex-col items-center justify-center rounded-xl bg-black/5 px-4 text-center">
        <span className="text-2xl">
          📷
        </span>

        <p className="mt-2 text-xs text-black/45">
          Não foi possível carregar esta imagem.
        </p>

        {caption && (
          <LinkifiedText
            text={caption}
            className="mt-3"
          />
        )}
      </div>
    );
  }

  const imageSource =
    `data:${media.mimetype};base64,${media.base64}`;

  const altText =
    caption || "Imagem enviada na conversa";

  return (
    <>
      <div
        className={
          isVertical
            ? "w-80 max-w-[70vw]"
            : "max-w-sm"
        }
      >
        <button
          type="button"
          onClick={() =>
            setIsViewerOpen(true)
          }
          title="Clique para ampliar"
          className="group block w-full cursor-zoom-in overflow-hidden rounded-xl text-left"
        >
          <img
            src={imageSource}
            alt={altText}
            width={
              imageWidth || undefined
            }
            height={
              imageHeight || undefined
            }
            className={`w-full bg-black/5 object-contain transition duration-200 group-hover:brightness-95 ${
              isVertical
                ? "max-h-[560px]"
                : "max-h-[420px]"
            }`}
          />
        </button>

        {caption && (
          <LinkifiedText
            text={caption}
            className="mt-3"
          />
        )}

        <button
          type="button"
          onClick={() =>
            setIsViewerOpen(true)
          }
          className="mt-2 text-xs font-semibold opacity-60 transition hover:opacity-100"
        >
          🔍 Ampliar imagem
        </button>
      </div>

      <ImageViewer
        isOpen={isViewerOpen}
        imageSource={imageSource}
        altText={altText}
        fileName={
          media.fileName ||
          `imagem-${message.id}.jpg`
        }
        onClose={() =>
          setIsViewerOpen(false)
        }
      />
    </>
  );
}

function AudioMessage({
  message,
}: MessageRendererProps) {
  const {
    media,
    loading,
    error,
  } = useMediaLoader(message.id, message);

  const duration = formatMediaDuration(
    message.message?.audioMessage?.seconds,
  );

  if (loading) {
    return (
      <div className="flex min-h-16 w-72 animate-pulse items-center gap-3 rounded-xl bg-black/5 px-4">
        <div className="h-9 w-9 shrink-0 rounded-full bg-black/10" />

        <div className="flex-1">
          <div className="h-2 rounded-full bg-black/10" />

          <p className="mt-2 text-xs text-black/35">
            Carregando áudio...
          </p>
        </div>
      </div>
    );
  }

  if (error || !media?.base64) {
    return (
      <div className="flex min-h-16 w-72 items-center gap-3 rounded-xl bg-black/5 px-4">
        <span className="text-2xl">
          🎤
        </span>

        <div>
          <p className="text-sm font-medium">
            Áudio indisponível
          </p>

          <p className="mt-1 text-xs text-black/45">
            Não foi possível carregar este áudio.
          </p>
        </div>
      </div>
    );
  }

  const audioSource =
    `data:${media.mimetype};base64,${media.base64}`;

  return (
    <div className="w-72 max-w-full">
      <audio
        controls
        preload="metadata"
        src={audioSource}
        className="h-10 w-full"
      >
        Seu navegador não suporta reprodução de áudio.
      </audio>

      {duration && (
        <p className="mt-1 text-right text-[10px] opacity-60">
          Duração: {duration}
        </p>
      )}
    </div>
  );
}

function VideoPlayer({
  message,
}: MessageRendererProps) {
  const {
    media,
    loading,
    error,
  } = useMediaLoader(message.id, message);

  const caption =
    media?.caption ||
    getVideoCaption(message);

  const duration = formatMediaDuration(
    message.message?.videoMessage?.seconds,
  );

  if (loading) {
    return (
      <div className="flex min-h-52 w-72 animate-pulse flex-col items-center justify-center rounded-xl bg-black/5 px-4 text-center">
        <span className="text-3xl opacity-40">
          ▶
        </span>

        <p className="mt-3 text-xs text-black/45">
          Carregando vídeo...
        </p>
      </div>
    );
  }

  if (error || !media?.base64) {
    return (
      <div className="flex min-h-40 w-72 flex-col items-center justify-center rounded-xl bg-black/5 px-4 text-center">
        <span className="text-3xl">
          🎥
        </span>

        <p className="mt-2 text-sm font-medium">
          Vídeo indisponível
        </p>

        <p className="mt-1 text-xs text-black/45">
          Não foi possível carregar este vídeo.
        </p>

        {caption && (
          <LinkifiedText
            text={caption}
            className="mt-3"
          />
        )}
      </div>
    );
  }

  const videoSource =
    `data:${media.mimetype};base64,${media.base64}`;

  return (
    <div className="w-72 max-w-full">
      <video
        controls
        preload="metadata"
        playsInline
        src={videoSource}
        width={
          message.message?.videoMessage?.width
        }
        height={
          message.message?.videoMessage?.height
        }
        className="max-h-[460px] w-full rounded-xl bg-black object-contain"
      >
        Seu navegador não suporta reprodução de vídeo.
      </video>

      <div className="mt-2 flex items-start justify-between gap-3">
        {caption ? (
          <LinkifiedText
            text={caption}
            className="min-w-0 flex-1"
          />
        ) : (
          <span />
        )}

        {duration && (
          <span className="shrink-0 text-[10px] opacity-60">
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}

function VideoMessage({
  message,
}: MessageRendererProps) {
  const [
    shouldLoadVideo,
    setShouldLoadVideo,
  ] = useState(false);

  if (shouldLoadVideo) {
    return (
      <VideoPlayer message={message} />
    );
  }

  const video =
    message.message?.videoMessage;

  const caption =
    getVideoCaption(message);

  const duration =
    formatMediaDuration(
      video?.seconds,
    );

  const thumbnailSource =
    video?.jpegThumbnail
      ? `data:image/jpeg;base64,${video.jpegThumbnail}`
      : null;

  return (
    <div className="w-72 max-w-full">
      <button
        type="button"
        onClick={() =>
          setShouldLoadVideo(true)
        }
        className="group relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-black text-white"
        aria-label="Carregar vídeo"
      >
        {thumbnailSource ? (
          <img
            src={thumbnailSource}
            alt="Miniatura do vídeo"
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-65"
          />
        ) : (
          <div className="absolute inset-0 bg-black/80" />
        )}

        <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/90 pl-1 text-2xl text-black shadow-lg transition group-hover:scale-105">
          ▶
        </span>

        <span className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/65 px-3 py-1.5 text-xs font-semibold">
          Carregar vídeo
        </span>

        {duration && (
          <span className="absolute bottom-3 right-3 z-10 rounded-md bg-black/65 px-2 py-1 text-xs">
            {duration}
          </span>
        )}
      </button>

      {caption && (
        <LinkifiedText
          text={caption}
          className="mt-3"
        />
      )}
    </div>
  );
}

function DocumentPlayer({
  message,
}: MessageRendererProps) {
  const {
    media,
    loading,
    error,
  } = useMediaLoader(message.id, message);

  const documentName =
    media?.fileName ||
    getDocumentName(message);

  if (loading) {
    return (
      <div className="flex min-h-24 w-80 animate-pulse items-center gap-4 rounded-xl bg-black/5 px-4">
        <div className="h-12 w-10 shrink-0 rounded-lg bg-black/10" />

        <div className="min-w-0 flex-1">
          <div className="h-3 w-4/5 rounded-full bg-black/10" />

          <div className="mt-3 h-2 w-2/5 rounded-full bg-black/10" />

          <p className="mt-3 text-xs text-black/35">
            Preparando documento...
          </p>
        </div>
      </div>
    );
  }

  if (error || !media?.base64) {
    return (
      <div className="flex min-h-24 w-80 items-center gap-4 rounded-xl bg-black/5 px-4">
        <span className="text-3xl">
          📄
        </span>

        <div>
          <p className="text-sm font-semibold">
            Documento indisponível
          </p>

          <p className="mt-1 text-xs text-black/45">
            Não foi possível recuperar este arquivo.
          </p>
        </div>
      </div>
    );
  }

  const documentSource =
    `data:${media.mimetype};base64,${media.base64}`;

  function handleDownload() {
    const link =
      document.createElement("a");

    link.href =
      documentSource;

    link.download =
      documentName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleOpen() {
    const byteCharacters =
      atob(media.base64);

    const byteNumbers =
      new Array(
        byteCharacters.length,
      );

    for (
      let index = 0;
      index < byteCharacters.length;
      index += 1
    ) {
      byteNumbers[index] =
        byteCharacters.charCodeAt(
          index,
        );
    }

    const byteArray =
      new Uint8Array(
        byteNumbers,
      );

    const blob =
      new Blob(
        [byteArray],
        {
          type: media.mimetype,
        },
      );

    const objectUrl =
      URL.createObjectURL(blob);

    window.open(
      objectUrl,
      "_blank",
      "noopener,noreferrer",
    );

    window.setTimeout(() => {
      URL.revokeObjectURL(
        objectUrl,
      );
    }, 60_000);
  }

  const canOpenInBrowser =
    media.mimetype ===
    "application/pdf";

  return (
    <div className="w-80 max-w-full rounded-xl border border-black/10 bg-black/[0.03] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-3xl">
          📄
        </div>

        <div className="min-w-0 flex-1">
          <p
            title={documentName}
            className="break-words text-sm font-semibold leading-5"
          >
            {documentName}
          </p>

          <p className="mt-1 text-xs opacity-55">
            {getDocumentExtension(
              documentName,
            )}

            {media.size
              ? ` • ${formatFileSize(
                  media.size,
                )}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canOpenInBrowser && (
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/[0.03]"
          >
            Visualizar PDF
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg bg-[#ff3d00] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Baixar documento
        </button>
      </div>
    </div>
  );
}

function DocumentMessage({
  message,
}: MessageRendererProps) {
  const [
    shouldLoadDocument,
    setShouldLoadDocument,
  ] = useState(false);

  if (shouldLoadDocument) {
    return (
      <DocumentPlayer
        message={message}
      />
    );
  }

  const document =
    message.message?.documentMessage;

  const documentName =
    getDocumentName(message);

  const documentSize =
    formatFileSize(
      document?.fileLength?.low,
    );

  const extension =
    getDocumentExtension(
      documentName,
    );

  return (
    <div className="w-80 max-w-full rounded-xl border border-black/10 bg-black/[0.03] p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-3xl">
          📄
        </div>

        <div className="min-w-0 flex-1">
          <p
            title={documentName}
            className="break-words text-sm font-semibold leading-5"
          >
            {documentName}
          </p>

          <p className="mt-1 text-xs opacity-55">
            {extension}

            {documentSize
              ? ` • ${documentSize}`
              : ""}
          </p>

          <p className="mt-2 text-xs opacity-45">
            O arquivo só será carregado quando solicitado.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          setShouldLoadDocument(
            true,
          )
        }
        className="mt-4 w-full rounded-lg border border-current/20 px-3 py-2.5 text-sm font-semibold transition hover:bg-black/5"
      >
        Carregar documento
      </button>
    </div>
  );
}

export default function MessageRenderer({
  message,
}: MessageRendererProps) {
  if (
    message.messageType ===
      "imageMessage" &&
    message.message?.imageMessage
  ) {
    return (
      <ImageMessage
        message={message}
      />
    );
  }

  if (
    message.messageType ===
      "audioMessage" &&
    message.message?.audioMessage
  ) {
    return (
      <AudioMessage
        message={message}
      />
    );
  }

  if (
    message.messageType ===
      "videoMessage" &&
    message.message?.videoMessage
  ) {
    return (
      <VideoMessage
        message={message}
      />
    );
  }

  if (
    message.messageType ===
      "documentMessage" &&
    message.message?.documentMessage
  ) {
    return (
      <DocumentMessage
        message={message}
      />
    );
  }

  if (
    message.messageType ===
      "conversation" ||
    message.message?.conversation
  ) {
    return (
      <TextMessage
        message={message}
      />
    );
  }

  if (
    message.messageType ===
    "reactionMessage"
  ) {
    return (
      <p className="text-sm leading-6">
        ❤️ Reação
      </p>
    );
  }

  return <UnsupportedMessage />;
}
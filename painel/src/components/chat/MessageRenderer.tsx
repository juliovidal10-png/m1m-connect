"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import useMediaLoader from "@/hooks/useMediaLoader";
import ImageViewer from "./ImageViewer";
import ConversationMediaViewer from "./ConversationMediaViewer";

type ChatMessageQuotedMessage = {
  conversation?: string;
  extendedTextMessage?: {
    text?: string;
  };
  imageMessage?: {
    caption?: string;
  };
  audioMessage?: {
    ptt?: boolean;
  };
  videoMessage?: {
    caption?: string;
  };
  documentMessage?: {
    title?: string;
    fileName?: string;
    caption?: string;
  };
};

type ChatMessageContextInfo = {
  stanzaId?: string;
  remoteJid?: string;
  participant?: string;
  quotedMessage?: ChatMessageQuotedMessage;
};

export type ChatMessage = {
  id: string;
  key: {
    id?: string;
    fromMe: boolean;
    remoteJid: string;
    participant?: string;
    remoteJidAlt?: string;
  };
  pushName?: string | null;
  m1mAuthor?: {
    type?:
      | "CUSTOMER"
      | "HUMAN"
      | "AI"
      | null;
    id?: string | null;
    name?: string | null;
  } | null;
  messageType?: string;
  messageTimestamp: number;
  contextInfo?: ChatMessageContextInfo;
  message?: {
    conversation?: string;

    extendedTextMessage?: {
      text?: string;
      matchedText?: string;
      canonicalUrl?: string;
      title?: string;
      description?: string;
      jpegThumbnail?:
        | string
        | number[]
        | {
            type?: string;
            data?: number[];
          };
      contextInfo?: ChatMessageContextInfo;
    };

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

    reactionMessage?: {
      text?: string;
      key?: {
        id?: string;
        remoteJid?: string;
        fromMe?: boolean;
        participant?: string;
      };
      senderTimestampMs?: {
        low?: number;
        high?: number;
        unsigned?: boolean;
      } | number | string;
    };
  };
};

type MessageRendererProps = {
  message: ChatMessage;
  galleryMessages?: ChatMessage[];
  onForward?: (
    message: ChatMessage,
  ) => void;
  onQuotedMessageClick?: (
    messageId: string,
  ) => void;
};

function useNearViewport(
  rootMargin = "600px 0px",
) {
  const elementRef =
    useRef<HTMLDivElement | null>(null);

  const [
    shouldLoad,
    setShouldLoad,
  ] = useState(false);

  useEffect(() => {
    const element =
      elementRef.current;

    if (!element || shouldLoad) {
      return;
    }

    if (
      typeof IntersectionObserver ===
      "undefined"
    ) {
      setShouldLoad(true);
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (
            entry?.isIntersecting
          ) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        {
          root: null,
          rootMargin,
          threshold: 0.01,
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    rootMargin,
    shouldLoad,
  ]);

  return {
    elementRef,
    shouldLoad,
  };
}

const LINK_PATTERN =
  /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com\.br|net\.br|org\.br|com|net|org|io|me|app|dev|co)(?:\/[^\s]*)?)/gi;

function getTextMessage(message: ChatMessage) {
  return (
    message.message?.conversation?.trim() ||
    message.message?.extendedTextMessage?.text?.trim() ||
    ""
  );
}

function getQuotedPreview(
  message: ChatMessage,
) {
  const quoted =
    message.contextInfo?.quotedMessage ??
    message.message?.extendedTextMessage
      ?.contextInfo?.quotedMessage;

  if (!quoted) {
    return null;
  }

  const text =
    quoted.conversation?.trim() ||
    quoted.extendedTextMessage?.text?.trim() ||
    quoted.imageMessage?.caption?.trim() ||
    quoted.videoMessage?.caption?.trim() ||
    quoted.documentMessage?.caption?.trim();

  if (text) {
    return text;
  }

  if (quoted.imageMessage) {
    return "📷 Imagem";
  }

  if (quoted.audioMessage) {
    return "🎤 Áudio";
  }

  if (quoted.videoMessage) {
    return "🎥 Vídeo";
  }

  if (quoted.documentMessage) {
    return `📄 ${
      quoted.documentMessage.fileName?.trim() ||
      quoted.documentMessage.title?.trim() ||
      "Documento"
    }`;
  }

  return "Mensagem";
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

function getDocumentCaption(
  message: ChatMessage,
) {
  return (
    message.message?.documentMessage?.caption?.trim() ||
    ""
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

function getFirstLink(text: string) {
  const match =
    text.match(
      /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com\.br|net\.br|org\.br|com|net|org|io|me|app|dev|co)(?:\/[^\s]*)?)/i,
    );

  if (!match?.[1]) {
    return null;
  }

  const {
    linkText,
  } = splitTrailingPunctuation(
    match[1],
  );

  const href =
    getClickableUrl(linkText);

  try {
    const url = new URL(href);

    return {
      href,
      hostname:
        url.hostname.replace(
          /^www\./i,
          "",
        ),
      path:
        url.pathname !== "/"
          ? url.pathname
          : "",
    };
  } catch {
    return null;
  }
}

type LinkPreviewApiResponse = {
  ok?: boolean;
  url?: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
};

function getWhatsAppThumbnailSource(
  value:
    | string
    | number[]
    | {
        type?: string;
        data?: number[];
      }
    | undefined,
) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim();

    if (!normalized) {
      return null;
    }

    if (
      normalized.startsWith("data:") ||
      normalized.startsWith("http://") ||
      normalized.startsWith("https://") ||
      normalized.startsWith("blob:")
    ) {
      return normalized;
    }

    return `data:image/jpeg;base64,${normalized}`;
  }

  const bytes =
    Array.isArray(value)
      ? value
      : Array.isArray(value.data)
        ? value.data
        : null;

  if (!bytes?.length) {
    return null;
  }

  try {
    const binary =
      bytes
        .map((byte) =>
          String.fromCharCode(byte),
        )
        .join("");

    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value?: string | null) {
  const text = value?.trim() || "";

  if (!text || !text.includes("&")) {
    return text;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  return text.replace(
    /&#(?:x([0-9a-f]+)|([0-9]+));/gi,
    (match, hex, decimal) => {
      const codePoint = Number.parseInt(
        hex || decimal,
        hex ? 16 : 10,
      );

      if (
        !Number.isFinite(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff
      ) {
        return match;
      }

      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    },
  );
}
function LinkPreviewCard({
  text,
  message,
}: {
  text: string;
  message: ChatMessage;
}) {
  const basicPreview =
    getFirstLink(text);

  const extended =
    message.message
      ?.extendedTextMessage;

  const whatsappUrl =
    extended?.canonicalUrl?.trim() ||
    extended?.matchedText?.trim() ||
    basicPreview?.href ||
    "";

  const href =
    whatsappUrl
      ? getClickableUrl(
          whatsappUrl,
        )
      : basicPreview?.href || "";

  const whatsappThumbnail =
    getWhatsAppThumbnailSource(
      extended?.jpegThumbnail,
    );

  const whatsappTitle =
    decodeHtmlEntities(extended?.title);

  const whatsappDescription =
    decodeHtmlEntities(
      extended?.description,
    );

  const [
    remotePreview,
    setRemotePreview,
  ] =
    useState<LinkPreviewApiResponse | null>(
      null,
    );

  const [
    previewLoading,
    setPreviewLoading,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    if (
      !href ||
      whatsappThumbnail ||
      (whatsappTitle &&
        whatsappDescription)
    ) {
      setRemotePreview(null);
      setPreviewLoading(false);

      return () => {
        active = false;
      };
    }

    const controller =
      new AbortController();

    async function loadPreview() {
      setPreviewLoading(true);

      try {
        const response =
          await fetch(
            `/api/link-preview?url=${encodeURIComponent(
              href,
            )}`,
            {
              method: "GET",
              cache: "force-cache",
              signal:
                controller.signal,
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as LinkPreviewApiResponse;

        if (
          active &&
          data?.ok
        ) {
          setRemotePreview(
            data,
          );
        }
      } catch (error) {
        if (
          !(
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) &&
          process.env.NODE_ENV ===
            "development"
        ) {
          console.warn(
            "[M1M Link Preview] preview indisponível:",
            href,
          );
        }
      } finally {
        if (active) {
          setPreviewLoading(
            false,
          );
        }
      }
    }

    void loadPreview();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    href,
    whatsappThumbnail,
    whatsappTitle,
    whatsappDescription,
  ]);

  if (!basicPreview || !href) {
    return null;
  }

  const image =
    whatsappThumbnail ||
    remotePreview?.image ||
    null;

  const title =
    whatsappTitle ||
    decodeHtmlEntities(remotePreview?.title) ||
    basicPreview.hostname;

  const description =
    whatsappDescription ||
    decodeHtmlEntities(remotePreview?.description) ||
    "";

  const siteName =
    decodeHtmlEntities(remotePreview?.siteName) ||
    basicPreview.hostname;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) =>
        event.stopPropagation()
      }
      className="mt-1.5 block overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.05)] bg-[#fafafa] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,42,0.09)] hover:bg-white hover:shadow-[0_2px_6px_rgba(15,23,42,0.06)]"
    >
      {image ? (
        <div className="relative aspect-[16/8.2] w-full overflow-hidden bg-[#eef0f2]">
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : previewLoading ? (
        <div className="aspect-[16/5.4] w-full animate-pulse bg-[#eef0f2]" />
      ) : null}

      <div className="flex items-start gap-3 p-3">
        {!image && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f3f5] text-black/40">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3c-2.3 2.5-3.5 5.5-3.5 9s1.2 6.5 3.5 9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-bold leading-5 text-[#171717]">
            {title}
          </p>

          {description && (
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-black/50">
              {description}
            </p>
          )}

          <p className="mt-1.5 truncate text-[11px] font-medium text-black/35">
            {siteName}
          </p>
        </div>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-black/25"
        >
          <path
            d="M8 16 16 8M10 8h6v6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </a>
  );
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
      className={`whitespace-pre-wrap break-words text-[14px] leading-6 text-[#202020] ${className}`}
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
              className="font-semibold text-[#087B7B] underline decoration-black/20 underline-offset-2 transition hover:text-[#0A9090]"
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
  onQuotedMessageClick,
}: MessageRendererProps) {
  const text = getTextMessage(message);
  const quotedPreview =
    getQuotedPreview(message);
  const quotedMessageId =
    message.contextInfo?.stanzaId ??
    message.message?.extendedTextMessage
      ?.contextInfo?.stanzaId;

  if (!text) {
    return <UnsupportedMessage />;
  }

  const hasLink =
    Boolean(getFirstLink(text));

  return (
    <div className="min-w-0">
      {quotedPreview && (
        <div
          className={`mb-2 overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.035] ${
            quotedMessageId && onQuotedMessageClick
              ? "cursor-pointer transition hover:bg-black/[0.055]"
              : ""
          }`}
          role={
            quotedMessageId && onQuotedMessageClick
              ? "button"
              : undefined
          }
          tabIndex={
            quotedMessageId && onQuotedMessageClick
              ? 0
              : undefined
          }
          onClick={() => {
            if (
              quotedMessageId &&
              onQuotedMessageClick
            ) {
              onQuotedMessageClick(
                quotedMessageId,
              );
            }
          }}
          onKeyDown={(event) => {
            if (
              quotedMessageId &&
              onQuotedMessageClick &&
              (event.key === "Enter" ||
                event.key === " ")
            ) {
              event.preventDefault();
              onQuotedMessageClick(
                quotedMessageId,
              );
            }
          }}
        >
          <div className="flex">
            <div className="w-1 shrink-0 bg-[#0A9090]" />

            <div className="min-w-0 flex-1 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#087B7B]">
                Resposta
              </p>

              <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/50">
                {quotedPreview}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasLink && (
        <LinkPreviewCard
          text={text}
          message={message}
        />
      )}

      <div className={hasLink ? "mt-2.5" : ""}>
        <LinkifiedText text={text} />
      </div>
    </div>
  );
}

function LoadedImageMessage({
  message,
  galleryMessages = [],
  onForward,
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
      <div className="flex min-h-40 w-72 animate-pulse items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm px-4 text-center text-xs text-black/45">
        Carregando imagem...
      </div>
    );
  }

  if (error || !media?.base64) {
    return (
      <div className="flex min-h-32 w-72 flex-col items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm px-4 text-center">
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
            ? "w-[22rem] max-w-[72vw]"
            : "w-[26rem] max-w-[72vw]"
        }
      >
        <button
          type="button"
          onClick={() =>
            setIsViewerOpen(true)
          }
          title="Clique para ampliar"
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[18px] border border-black/5 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
            className={`w-full bg-black/[0.035] object-contain transition duration-300 group-hover:scale-[1.01] group-hover:brightness-[0.98] ${
              isVertical
                ? "max-h-[590px]"
                : "max-h-[460px]"
            }`}
          />
        </button>

        {caption && (
          <LinkifiedText
            text={caption}
            className="mt-3"
          />
        )}

      </div>

      <ConversationMediaViewer
        isOpen={isViewerOpen}
        currentMessage={message}
        galleryMessages={
          galleryMessages
        }
        onClose={() =>
          setIsViewerOpen(false)
        }
        onForward={onForward}
      />
    </>
  );
}


function ImageMessage({
  message,
  galleryMessages = [],
  onForward,
}: MessageRendererProps) {
  const {
    elementRef,
    shouldLoad,
  } = useNearViewport();

  if (!shouldLoad) {
    return (
      <div
        ref={elementRef}
        className="flex min-h-40 w-72 items-center justify-center rounded-2xl border border-black/5 bg-white shadow-sm px-4 text-center text-xs text-black/45"
      >
        A imagem será carregada ao aparecer na tela.
      </div>
    );
  }

  return (
    <LoadedImageMessage
      message={message}
      galleryMessages={
        galleryMessages
      }
      onForward={onForward}
    />
  );
}

function LoadedAudioMessage({
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
      <div className="flex min-h-16 w-72 animate-pulse items-center gap-3 rounded-2xl border border-black/5 bg-white shadow-sm px-4">
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
      <div className="flex min-h-16 w-72 items-center gap-3 rounded-2xl border border-black/5 bg-white shadow-sm px-4">
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
    <div className="w-[21rem] max-w-full rounded-2xl border border-black/5 bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-black/35">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ECF8F8] text-[#087B7B]">
          🎤
        </span>
        Áudio
      </div>

      <audio
        controls
        preload="metadata"
        src={audioSource}
        className="h-10 w-full"
      >
        Seu navegador não suporta reprodução de áudio.
      </audio>

      {duration && (
        <p className="mt-2 text-right text-[10px] font-medium text-black/35">
          Duração: {duration}
        </p>
      )}
    </div>
  );
}


function AudioMessage({
  message,
}: MessageRendererProps) {
  const {
    elementRef,
    shouldLoad,
  } = useNearViewport(
    "400px 0px",
  );

  if (!shouldLoad) {
    return (
      <div
        ref={elementRef}
        className="flex min-h-16 w-72 items-center gap-3 rounded-2xl border border-black/5 bg-white shadow-sm px-4"
      >
        <span className="text-2xl">
          🎤
        </span>

        <p className="text-xs text-black/45">
          O áudio será carregado ao aparecer na tela.
        </p>
      </div>
    );
  }

  return (
    <LoadedAudioMessage
      message={message}
    />
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

  const videoWidth =
    message.message?.videoMessage?.width || 0;
  const videoHeight =
    message.message?.videoMessage?.height || 0;
  const isPortraitVideo =
    videoWidth > 0 &&
    videoHeight > 0 &&
    videoHeight > videoWidth;

  return (
    <div
      className={
        isPortraitVideo
          ? "w-[16rem] max-w-full"
          : "w-[24rem] max-w-full"
      }
    >
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
        className="block max-h-[500px] h-auto w-auto max-w-full rounded-[18px] border border-black/5 bg-black object-contain shadow-sm"
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
    <div className="w-[24rem] max-w-full">
      <button
        type="button"
        onClick={() =>
          setShouldLoadVideo(true)
        }
        className="group relative flex min-h-52 w-full items-center justify-center overflow-hidden rounded-[18px] border border-black/5 bg-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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

  const documentCaption =
    media?.caption?.trim() ||
    getDocumentCaption(message);

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

  const mediaBase64 = media.base64;
  const mediaMimetype = media.mimetype;

  const documentSource =
    `data:${mediaMimetype};base64,${mediaBase64}`;

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
      atob(mediaBase64);

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
          type: mediaMimetype,
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
    mediaMimetype ===
    "application/pdf";

  return (
    <div className="w-[24rem] max-w-full overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.05)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {canOpenInBrowser && (
        <button
          type="button"
          onClick={handleOpen}
          title="Abrir PDF"
          className="relative block h-40 w-full overflow-hidden bg-[#f1f3f5] text-left"
        >
          <iframe
            src={`${documentSource}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
            title={`Prévia de ${documentName}`}
            className="pointer-events-none h-[240px] w-full -translate-y-0 border-0 bg-white"
          />

          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.03]" />
        </button>
      )}

      <div className="flex items-center gap-3 bg-[#f7f8f9] px-3 py-3">
        <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e31b23] text-white shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path
              d="M7 3h7l4 4v14H7V3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M14 3v5h5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={
            canOpenInBrowser
              ? handleOpen
              : handleDownload
          }
          className="min-w-0 flex-1 text-left"
        >
          <p
            title={documentName}
            className="truncate text-sm font-semibold text-[#171717]"
          >
            {documentName}
          </p>

          <p className="mt-0.5 text-xs text-black/45">
            {getDocumentExtension(
              documentName,
            )}
            {media.size
              ? ` • ${formatFileSize(
                  media.size,
                )}`
              : ""}
          </p>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          title="Baixar documento"
          aria-label="Baixar documento"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/45 transition hover:bg-black/[0.05] hover:text-black/70"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-4.5 w-4.5"
          >
            <path
              d="M12 4v10M8 10l4 4 4-4M5 19h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {documentCaption && (
        <div className="border-t border-black/[0.04] px-3 py-3">
          <LinkifiedText
            text={documentCaption}
          />
        </div>
      )}
    </div>
  );
}

function DocumentMessage({
  message,
}: MessageRendererProps) {
  const document =
    message.message?.documentMessage;

  const documentName =
    getDocumentName(message);

  const documentCaption =
    getDocumentCaption(message);

  const documentSize =
    formatFileSize(
      document?.fileLength?.low,
    );

  const extension =
    getDocumentExtension(
      documentName,
    );

  const isPdf =
    document?.mimetype ===
      "application/pdf" ||
    extension === "PDF";

  const [
    shouldLoadDocument,
    setShouldLoadDocument,
  ] = useState(isPdf);

  if (shouldLoadDocument) {
    return (
      <DocumentPlayer
        message={message}
      />
    );
  }

  return (
    <div className="w-[22rem] max-w-full rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-3xl shadow-inner">
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
        className="mt-4 w-full rounded-xl border border-black/[0.07] bg-[#f7f8f9] px-3 py-2.5 text-sm font-bold text-black/60 transition-all duration-200 hover:bg-white hover:shadow-sm"
      >
        Abrir documento
      </button>

      {documentCaption && (
        <div className="mt-3 border-t border-black/[0.05] pt-3">
          <LinkifiedText
            text={documentCaption}
          />
        </div>
      )}
    </div>
  );
}

export default function MessageRenderer({
  message,
  galleryMessages = [],
  onForward,
  onQuotedMessageClick,
}: MessageRendererProps) {
  if (
    message.messageType ===
      "imageMessage" &&
    message.message?.imageMessage
  ) {
    return (
      <ImageMessage
        message={message}
        galleryMessages={
          galleryMessages
        }
        onForward={onForward}
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
    message.messageType ===
      "extendedTextMessage" ||
    message.message?.conversation ||
    message.message?.extendedTextMessage
  ) {
    return (
      <TextMessage
        message={message}
        onQuotedMessageClick={
          onQuotedMessageClick
        }
      />
    );
  }

  if (
    message.messageType ===
    "reactionMessage"
  ) {
    return null;
  }

  return <UnsupportedMessage />;
}

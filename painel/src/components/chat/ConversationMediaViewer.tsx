"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useMediaLoader from "@/hooks/useMediaLoader";
import useNearViewport from "@/hooks/useNearViewport";
import type { ChatMessage } from "./MessageRenderer";

type ConversationMediaViewerProps = {
  isOpen: boolean;
  currentMessage: ChatMessage;
  galleryMessages: ChatMessage[];
  onClose: () => void;
  onForward?: (
    message: ChatMessage,
  ) => void;
};

function MediaContent({
  message,
  mediaCacheKey,
  zoom,
  offsetY,
  isDragging,
  onImageLoad,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: {
  message: ChatMessage;
  mediaCacheKey: string;
  zoom: number;
  offsetY: number;
  isDragging: boolean;
  onImageLoad: () => void;
  onPointerDown: (
    event: React.PointerEvent<HTMLImageElement>,
  ) => void;
  onPointerMove: (
    event: React.PointerEvent<HTMLImageElement>,
  ) => void;
  onPointerUp: (
    event: React.PointerEvent<HTMLImageElement>,
  ) => void;
  onDoubleClick: () => void;
}) {
  const {
    media,
    loading,
    error,
  } = useMediaLoader(
    mediaCacheKey,
    message,
  );

  if (loading) {
    return (
      <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70">
        {"Carregando m\u00eddia..."}
      </div>
    );
  }

  if (
    error ||
    !media?.base64 ||
    !media.mimetype
  ) {
    return (
      <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm text-white/70">
        {"N\u00e3o foi poss\u00edvel carregar esta m\u00eddia."}
      </div>
    );
  }

  const source =
    `data:${media.mimetype};base64,${media.base64}`;

  if (
    message.messageType ===
    "videoMessage"
  ) {
    return (
      <video
        key={message.id}
        controls
        autoPlay
        playsInline
        preload="metadata"
        src={source}
        onClick={(event) =>
          event.stopPropagation()
        }
        className="max-h-[calc(100vh-12rem)] max-w-[min(74vw,1120px)] object-contain shadow-2xl"
      >
        {"Seu navegador n\u00e3o suporta reprodu\u00e7\u00e3o de v\u00eddeo."}
      </video>
    );
  }

  return (
    <img
      key={message.id}
      src={source}
      alt={
        media.caption ||
        "Imagem enviada na conversa"
      }
      draggable={false}
      onLoad={onImageLoad}
      onClick={(event) =>
        event.stopPropagation()
      }
      onDoubleClick={
        onDoubleClick
      }
      onPointerDown={
        onPointerDown
      }
      onPointerMove={
        onPointerMove
      }
      onPointerUp={
        onPointerUp
      }
      onPointerCancel={
        onPointerUp
      }
      className={`max-h-[calc(100vh-12rem)] max-w-[min(74vw,1120px)] select-none object-contain shadow-2xl ${
        zoom > 1
          ? isDragging
            ? "cursor-grabbing"
            : "cursor-grab"
          : "cursor-zoom-in"
      }`}
      style={{
        transform: `translate3d(0, ${offsetY}px, 0) scale(${zoom})`,
        transformOrigin:
          "center center",
        touchAction: "none",
      }}
    />
  );
}

function GalleryThumbnail({
  message,
  index,
  isActive,
  activeRef,
  onSelect,
}: {
  message: ChatMessage;
  index: number;
  isActive: boolean;
  activeRef?: React.Ref<HTMLButtonElement>;
  onSelect: (index: number) => void;
}) {
  const { elementRef, shouldLoad } = useNearViewport("0px");
  const loadImage = message.messageType === "imageMessage" && shouldLoad;
  const { media, loading, error } = useMediaLoader(
    loadImage ? `${message.id}:${index}` : undefined,
    loadImage ? message : null,
  );

  const videoThumbnail =
    message.message
      ?.videoMessage
      ?.jpegThumbnail
      ? `data:image/jpeg;base64,${message.message.videoMessage.jpegThumbnail}`
      : null;

  const source =
    media?.base64 &&
    media.mimetype
      ? `data:${media.mimetype};base64,${media.base64}`
      : null;

  return (
    <div ref={elementRef} className="shrink-0">
      <button
        ref={activeRef}
        aria-current={isActive ? "true" : undefined}
        type="button"
        onClick={() =>
          onSelect(index)
        }
        aria-label={`Abrir m\u00eddia ${index + 1}`}
        title={`M\u00eddia ${index + 1}`}
        className={`relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black/30 transition ${
          isActive
            ? "border-[#0A9090] ring-2 ring-[#0A9090]/25"
            : "border-white/15 hover:border-white/40"
        }`}
      >
        {message.messageType ===
        "videoMessage" ? (
          videoThumbnail ? (
            <img
              src={
                videoThumbnail
              }
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/70">              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M8 5v14l11-7z"
                  fill="currentColor"
                />
              </svg>            </div>
          )
        ) : !shouldLoad || loading ? (
          <div className="h-full w-full animate-pulse bg-white/10" />
        ) : error || !source ? (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
            {"m\u00eddia"}
          </div>
        ) : (
          <img
            src={source}
            alt=""
            className="h-full w-full object-cover"
          />
        )}

        {message.messageType ===
          "videoMessage" && (
          <span className="absolute inset-0 flex items-center justify-center">            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path
                  d="M8 5v14l11-7z"
                  fill="currentColor"
                />
              </svg>
            </span>          </span>
        )}
      </button>
    </div>
  );
}

export default function ConversationMediaViewer({
  isOpen,
  currentMessage,
  galleryMessages,
  onClose,
  onForward,
}: ConversationMediaViewerProps) {
  const gallery = useMemo(
    () =>
      galleryMessages.filter(
        (item) =>
          item.messageType ===
            "imageMessage" ||
          item.messageType ===
            "videoMessage",
      ),
    [galleryMessages],
  );

  const initialIndex =
    Math.max(
      0,
      gallery.findIndex(
        (item) =>
          item.id ===
          currentMessage.id,
      ),
    );

  const [activeGalleryIndex, setActiveGalleryIndex] =
    useState(initialIndex);

  const activeMessageRef =
    useRef<ChatMessage>(
      gallery[initialIndex] ??
        currentMessage,
    );

  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const activeIndex = activeGalleryIndex < gallery.length
    ? activeGalleryIndex
    : -1;

  const [zoom, setZoom] =
    useState(1);

  const [offsetY, setOffsetY] = useState(0);

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const dragStartRef =
    useRef({
      pointerY: 0,
      imageY: 0,
    });

  const activeMessage =
    activeIndex >= 0
      ? gallery[activeIndex]
      : activeMessageRef.current;

  useEffect(() => {
    if (activeIndex >= 0) {
      activeMessageRef.current =
        gallery[activeIndex];
    }
  }, [
    activeIndex,
    gallery,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const strip = thumbnailStripRef.current;
      const thumbnail = activeThumbnailRef.current;
      if (!strip || !thumbnail) {
        return;
      }

      const stripBounds = strip.getBoundingClientRect();
      const thumbnailBounds = thumbnail.getBoundingClientRect();
      strip.scrollLeft +=
        thumbnailBounds.left + thumbnailBounds.width / 2 -
        (stripBounds.left + strip.clientWidth / 2);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, activeIndex, gallery.length]);

  const isImage =
    activeMessage.messageType ===
    "imageMessage";

  function resetView() {
    setZoom(1);
    setOffsetY(0);
    setIsDragging(false);
  }

  function goPrevious() {
    goToMedia(activeIndex - 1);
  }

  function goNext() {
    goToMedia(activeIndex + 1);
  }

  function goToMedia(
    index: number,
  ) {
    if (
      index < 0 ||
      index >= gallery.length ||
      index === activeIndex
    ) {
      return;
    }

    const selected =
      gallery[index];

    if (!selected) {
      return;
    }

    resetView();
    activeMessageRef.current =
      selected;
    setActiveGalleryIndex(index);
  }

  useEffect(() => {
    if (!isOpen) {
      resetView();
      return;
    }

    const openedIndex = gallery.findIndex(
      (item) => item.id === currentMessage.id,
    );
    const openedMessage = openedIndex >= 0
      ? gallery[openedIndex]
      : currentMessage;

    activeMessageRef.current = openedMessage;
    setActiveGalleryIndex(openedIndex >= 0 ? openedIndex : 0);

    resetView();
  }, [
    isOpen,
    currentMessage.id,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          event.preventDefault();
          goPrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          goNext();
          break;
        case "Home":
          event.preventDefault();
          goToMedia(0);
          break;
        case "End":
          event.preventDefault();
          goToMedia(gallery.length - 1);
          break;
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style
        .overflow =
        previousOverflow;
    };
  }, [
    isOpen,
    activeIndex,
    gallery.length,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  function zoomOut() {
    if (!isImage) {
      return;
    }

    setZoom(
      (current) => {
        const next =
          Math.max(
            1,
            Number(
              (
                current -
                0.25
              ).toFixed(2),
            ),
          );

        if (next <= 1) {
          setOffsetY(0);
        }

        return next;
      },
    );
  }

  function zoomIn() {
    if (!isImage) {
      return;
    }

    setZoom(
      (current) =>
        Math.min(
          3,
          Number(
            (
              current +
              0.25
            ).toFixed(2),
          ),
        ),
    );
  }

  function handleDoubleClick() {
    if (!isImage) {
      return;
    }

    if (zoom > 1) {
      setZoom(1);
      setOffsetY(0);
      return;
    }

    setZoom(2);
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLImageElement>,
  ) {
    if (
      !isImage ||
      zoom <= 1
    ) {
      return;
    }

    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    dragStartRef.current = {
      pointerY: event.clientY,
      imageY: offsetY,
    };

    setIsDragging(true);
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLImageElement>,
  ) {
    if (
      !isDragging ||
      zoom <= 1
    ) {
      return;
    }

    const { pointerY, imageY } = dragStartRef.current;
    setOffsetY(imageY + event.clientY - pointerY);
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLImageElement>,
  ) {
    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    }

    setIsDragging(false);
  }

  const hasPrevious =
    activeIndex > 0;

  const hasNext =
    activeIndex <
    gallery.length - 1;

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-[#111315]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 sm:px-6">
        <span className="text-xs font-semibold text-white/55">
          {activeIndex + 1} de{" "}
          {gallery.length}
        </span>

        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 1}
                aria-label="Diminuir zoom"
                title="Diminuir zoom"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                  <path d="M8 11h6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 3}
                aria-label="Aumentar zoom"
                title="Aumentar zoom"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                  <path d="M8 11h6" />
                  <path d="M11 8v6" />
                </svg>
              </button>
            </>
          )}

          {onForward && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onForward(
                  activeMessage,
                );
              }}
              aria-label="Encaminhar mídia"
              title="Encaminhar"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 8l5 4-5 4" />
                <path d="M20 12H9a5 5 0 0 0-5 5v1" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5 pb-3 sm:p-8 sm:pb-4"
          onClick={onClose}
        >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrevious();
          }}
          disabled={!hasPrevious}
          aria-label={"M\u00eddia anterior"}
          title={"M\u00eddia anterior"}
          className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl text-white/90 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:left-5"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          disabled={!hasNext}
          aria-label={"Pr\u00f3xima m\u00eddia"}
          title={"Pr\u00f3xima m\u00eddia"}
          className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl text-white/90 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:right-5"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

          <MediaContent
            key={activeMessage.id}
            message={activeMessage}
            mediaCacheKey={`${activeMessage.id}:${activeIndex}`}
            zoom={zoom}
            offsetY={offsetY}
            isDragging={
              isDragging
            }
            onImageLoad={() => {}}
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              handlePointerUp
            }
            onDoubleClick={
              handleDoubleClick
            }
          />
        </div>

        {gallery.length > 1 && (
          <div className="shrink-0 border-t border-white/[0.06] bg-[#111315] px-3 py-3 sm:px-5">
            <div
              ref={thumbnailStripRef}
              className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain p-1"
            >
              {gallery.map((item, index) => (
                <GalleryThumbnail
                  key={`${item.id}:${index}`}
                  message={item}
                  index={index}
                  isActive={index === activeIndex}
                  activeRef={index === activeIndex ? activeThumbnailRef : undefined}
                  onSelect={goToMedia}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

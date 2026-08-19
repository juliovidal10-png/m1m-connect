"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useMediaLoader from "@/hooks/useMediaLoader";
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
  zoom,
  position,
  isDragging,
  onImageLoad,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: {
  message: ChatMessage;
  zoom: number;
  position: { x: number; y: number };
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
    message.id,
    message,
  );

  if (loading) {
    return (
      <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70">
        Carregando mídia...
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
        Não foi possível carregar esta mídia.
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
        Seu navegador não suporta reprodução de vídeo.
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
        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom})`,
        transformOrigin:
          "center center",
        touchAction: "none",
      }}
    />
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

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(initialIndex);

  const [zoom, setZoom] =
    useState(1);

  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const dragStartRef =
    useRef({
      pointerX: 0,
      pointerY: 0,
      imageX: 0,
      imageY: 0,
    });

  const activeMessage =
    gallery[activeIndex] ||
    currentMessage;

  const isImage =
    activeMessage.messageType ===
    "imageMessage";

  function resetView() {
    setZoom(1);
    setPosition({
      x: 0,
      y: 0,
    });
    setIsDragging(false);
  }

  function goPrevious() {
    if (activeIndex <= 0) {
      return;
    }

    resetView();
    setActiveIndex(
      (current) =>
        current - 1,
    );
  }

  function goNext() {
    if (
      activeIndex >=
      gallery.length - 1
    ) {
      return;
    }

    resetView();
    setActiveIndex(
      (current) =>
        current + 1,
    );
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

    resetView();
    setActiveIndex(index);
  }

  useEffect(() => {
    if (!isOpen) {
      resetView();
      return;
    }

    const nextIndex =
      Math.max(
        0,
        gallery.findIndex(
          (item) =>
            item.id ===
            currentMessage.id,
        ),
      );

    setActiveIndex(nextIndex);
    resetView();
  }, [
    isOpen,
    currentMessage.id,
    gallery,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        goPrevious();
        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        goNext();
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
          setPosition({
            x: 0,
            y: 0,
          });
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
      setPosition({
        x: 0,
        y: 0,
      });
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
      pointerX:
        event.clientX,
      pointerY:
        event.clientY,
      imageX:
        position.x,
      imageY:
        position.y,
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

    setPosition({
      x:
        dragStartRef.current
          .imageX +
        event.clientX -
        dragStartRef.current
          .pointerX,
      y:
        dragStartRef.current
          .imageY +
        event.clientY -
        dragStartRef.current
          .pointerY,
    });
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

  function GalleryThumbnail({
    message,
    index,
  }: {
    message: ChatMessage;
    index: number;
  }) {
    const {
      media,
      loading,
      error,
    } = useMediaLoader(
      message.id,
      message,
    );

    const isActive =
      index === activeIndex;

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
      <button
        type="button"
        onClick={() =>
          goToMedia(index)
        }
        aria-label={`Abrir mídia ${index + 1}`}
        title={`Mídia ${index + 1}`}
        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black/30 transition ${
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
            <div className="flex h-full w-full items-center justify-center text-white/70">
              ▶
            </div>
          )
        ) : loading ? (
          <div className="h-full w-full animate-pulse bg-white/10" />
        ) : error || !source ? (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
            mídia
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
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[10px] text-white">
              ▶
            </span>
          </span>
        )}
      </button>
    );
  }

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
                disabled={
                  zoom <= 1
                }
                aria-label="Diminuir zoom"
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white/85 transition hover:bg-white/10 disabled:opacity-30"
              >
                −
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={
                  zoom >= 3
                }
                aria-label="Aumentar zoom"
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white/85 transition hover:bg-white/10 disabled:opacity-30"
              >
                +
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-white/85 transition hover:bg-white/10"
            >
              ↗
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white/85 transition hover:bg-white/10"
          >
            ×
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
          aria-label="Mídia anterior"
          title="Mídia anterior"
          className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl text-white/90 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:left-5"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          disabled={!hasNext}
          aria-label="Próxima mídia"
          title="Próxima mídia"
          className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-3xl text-white/90 backdrop-blur transition hover:bg-black/55 disabled:pointer-events-none disabled:opacity-0 sm:right-5"
        >
          ›
        </button>

          <MediaContent
            message={
              activeMessage
            }
            zoom={zoom}
            position={position}
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
            <div className="mx-auto flex max-w-[calc(100vw-2rem)] gap-2 overflow-x-auto pb-1">
              {gallery.map(
                (
                  item,
                  index,
                ) => (
                  <GalleryThumbnail
                    key={
                      item.id
                    }
                    message={
                      item
                    }
                    index={
                      index
                    }
                  />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
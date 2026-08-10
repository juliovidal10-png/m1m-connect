"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ImageViewerProps = {
  isOpen: boolean;
  imageSource: string;
  altText: string;
  fileName: string;
  onClose: () => void;
  onForward?: () => void;
};

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function ImageViewer({
  isOpen,
  imageSource,
  altText,
  fileName,
  onClose,
  onForward,
}: ImageViewerProps) {
  const [zoom, setZoom] =
    useState(1);

  const [position, setPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState(false);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const dragStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    imageX: 0,
    imageY: 0,
  });

  const onCloseRef =
    useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const safeFileName =
    useMemo(
      () =>
        fileName?.trim() ||
        "imagem.jpg",
      [fileName],
    );

  useEffect(() => {
    if (isOpen) {
      setIsLoaded(false);
    }
  }, [isOpen, imageSource]);

  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setPosition({
        x: 0,
        y: 0,
      });
      setIsDragging(false);
      return;
    }

    setZoom(1);
    setPosition({
      x: 0,
      y: 0,
    });
    setIsDragging(false);

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }

      if (
        event.key === "+" ||
        event.key === "="
      ) {
        setZoom((current) =>
          Math.min(
            3,
            Number(
              (
                current + 0.25
              ).toFixed(2),
            ),
          ),
        );
      }

      if (event.key === "-") {
        setZoom((current) =>
          Math.max(
            1,
            Number(
              (
                current - 0.25
              ).toFixed(2),
            ),
          ),
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function zoomOut() {
    setZoom((current) => {
      const next = Math.max(
        0.5,
        Number(
          (
            current - 0.25
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
    });
  }

  function zoomIn() {
    setZoom((current) =>
      Math.min(
        3,
        Number(
          (
            current + 0.25
          ).toFixed(2),
        ),
      ),
    );
  }

  function handleWheel(
    event: React.WheelEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    setZoom((current) => {
      const direction =
        event.deltaY < 0
          ? 0.2
          : -0.2;

      const next = Math.min(
        3,
        Math.max(
          1,
          Number(
            (
              current + direction
            ).toFixed(2),
          ),
        ),
      );

      if (next <= 1) {
        setPosition({
          x: 0,
          y: 0,
        });
      }

      return next;
    });
  }

  function handleDoubleClick() {
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
    if (zoom <= 1) {
      return;
    }

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      imageX: position.x,
      imageY: position.y,
    };

    setIsDragging(true);
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLImageElement>,
  ) {
    if (!isDragging || zoom <= 1) {
      return;
    }

    const deltaX =
      event.clientX -
      dragStartRef.current.pointerX;

    const deltaY =
      event.clientY -
      dragStartRef.current.pointerY;

    setPosition({
      x:
        dragStartRef.current.imageX +
        deltaX,
      y:
        dragStartRef.current.imageY +
        deltaY,
    });
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLImageElement>,
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    setIsDragging(false);
  }

  function downloadImage() {
    const link =
      document.createElement("a");

    link.href = imageSource;
    link.download = safeFileName;
    link.rel = "noopener";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function forwardImage() {
    if (!onForward) {
      return;
    }

    onClose();
    onForward();
  }

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-[#111315]">
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-end border-b border-white/[0.06] bg-[#111315] px-4 sm:px-6">
        <div className="flex items-center gap-1">
          <ToolbarButton
            label="Diminuir zoom"
            onClick={zoomOut}
            disabled={zoom <= 1}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8.5 11h5M16 16l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            label="Aumentar zoom"
            onClick={zoomIn}
            disabled={zoom >= 3}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8.5 11h5M11 8.5v5M16 16l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            label="Encaminhar"
            onClick={forwardImage}
            disabled={!onForward}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M14 5l6 6-6 6v-4.1C9.4 12.9 6.1 14.3 4 18c.4-6.2 3.7-9.6 10-9.9V5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            label="Baixar"
            onClick={downloadImage}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ToolbarButton>

          <div className="mx-1 h-6 w-px bg-white/10" />

          <ToolbarButton
            label="Fechar"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </ToolbarButton>
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        onClick={onClose}
        onWheel={handleWheel}
      >
        <div className="relative flex min-h-full min-w-full items-center justify-center p-5 sm:p-8">
          {!isLoaded && (
            <div className="absolute flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              Carregando
            </div>
          )}

          <img
            src={imageSource}
            alt={altText}
            draggable={false}
            ref={(element) => {
              if (
                element?.complete &&
                element.naturalWidth > 0 &&
                !isLoaded
              ) {
                queueMicrotask(() =>
                  setIsLoaded(true)
                );
              }
            }}
            onLoad={() =>
              setIsLoaded(true)
            }
            onClick={(event) =>
              event.stopPropagation()
            }
            onDoubleClick={
              handleDoubleClick
            }
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              handlePointerUp
            }
            onPointerCancel={
              handlePointerUp
            }
            className={`max-h-[calc(100vh-7rem)] max-w-[calc(100vw-3rem)] select-none object-contain shadow-2xl transition-[opacity,transform] duration-200 ease-out ${
              isLoaded
                ? "opacity-100"
                : "opacity-0"
            } ${
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
        </div>
      </div>
    </div>
  );
}

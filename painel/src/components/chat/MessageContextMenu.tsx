"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { ChatMessage } from "./MessageRenderer";

type MessageContextMenuProps = {
  message: ChatMessage;
  text: string;
  side: "left" | "right";
  onDeleted: (
    messageId: string,
  ) => void;
  onNotice: (message: string) => void;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReact: (
    message: ChatMessage,
    emoji: string,
  ) => void;
  onOpenReactionPicker: (
    message: ChatMessage,
    anchorRect: DOMRect,
  ) => void;
};

export default function MessageContextMenu({
  message,
  text,
  side,
  onDeleted,
  onNotice,
  onReply,
  onForward,
  onReact,
  onOpenReactionPicker,
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const buttonRef =
    useRef<HTMLButtonElement | null>(null);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const [
    menuPosition,
    setMenuPosition,
  ] = useState({
    left: 12,
    top: 12,
  });

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        !isOpen ||
        !rootRef.current
      ) {
        return;
      }

      const target =
        event.target as Node;

      const clickedButton =
        rootRef.current.contains(
          target,
        );

      const clickedMenu =
        menuRef.current?.contains(
          target,
        ) ?? false;

      if (
        !clickedButton &&
        !clickedMenu
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen]);

  function updateMenuPosition() {
    const button =
      buttonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    const menuWidth = 256;
    const estimatedMenuHeight =
      message.key.fromMe
        ? 408
        : 350;

    const viewportPadding = 12;
    const gap = 8;

    const preferredLeft =
      side === "right"
        ? rect.right -
          menuWidth
        : rect.left;

    const safeLeft = Math.min(
      Math.max(
        viewportPadding,
        preferredLeft,
      ),
      window.innerWidth -
        menuWidth -
        viewportPadding,
    );

    const hasSpaceBelow =
      rect.bottom +
        gap +
        estimatedMenuHeight <=
      window.innerHeight -
        viewportPadding;

    const preferredTop =
      hasSpaceBelow
        ? rect.bottom + gap
        : rect.top -
          gap -
          estimatedMenuHeight;

    const safeTop = Math.min(
      Math.max(
        viewportPadding,
        preferredTop,
      ),
      window.innerHeight -
        estimatedMenuHeight -
        viewportPadding,
    );

    setMenuPosition({
      left: safeLeft,
      top: safeTop,
    });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();

    function handleViewportChange() {
      updateMenuPosition();
    }

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );
    };
  }, [
    isOpen,
    side,
    message.key.fromMe,
  ]);

  async function handleCopy() {
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        text,
      );

      setIsOpen(false);
      onNotice("Mensagem copiada.");
    } catch (error) {
      console.error(
        "Erro ao copiar mensagem:",
        error,
      );

      onNotice(
        "Não foi possível copiar a mensagem.",
      );
    }
  }

  async function handleDelete() {
    if (
      !message.key.fromMe ||
      message.id.startsWith("local-") ||
      isDeleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Deseja apagar esta mensagem para o cliente?",
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        "/api/chat/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: message.id,
            evolutionMessageId:
              message.key.id ||
              message.id,
            remoteJid:
              message.key.remoteJid,
            fromMe:
              message.key.fromMe,
            participant:
              message.key.participant,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível apagar a mensagem.",
        );
      }

      setIsOpen(false);
      onDeleted(message.id);
      onNotice(
        "Mensagem apagada para o cliente.",
      );
    } catch (error) {
      console.error(
        "Erro ao apagar mensagem:",
        error,
      );

      onNotice(
        error instanceof Error
          ? error.message
          : "Não foi possível apagar a mensagem.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Abrir ações da mensagem"
        title="Ações da mensagem"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();

          const nextOpen =
            !isOpen;

          setIsOpen(nextOpen);

          if (nextOpen) {
            window.requestAnimationFrame(
              updateMenuPosition,
            );
          }
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition duration-150 ${
          isOpen
            ? "border-[#ff3d00]/30 bg-[#fff1ec] text-[#e93800] opacity-100"
            : "border-black/10 bg-white text-black/60 opacity-0 hover:border-black/20 hover:text-black group-hover:opacity-100 focus:opacity-100"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen &&
        typeof document !==
          "undefined" &&
        createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuPosition.left,
            top: menuPosition.top,
            zIndex: 20000,
            width: "256px",
            maxHeight:
              "calc(100vh - 24px)",
            overflowY: "auto",
          }}
          className="overflow-x-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-[0_22px_55px_rgba(0,0,0,0.20)]"
        >
          <div className="mb-2 flex items-center justify-between rounded-xl bg-[#fafafa] px-2 py-2">
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onReact(
                      message,
                      emoji,
                    );
                  }}
                  title={`Reagir com ${emoji}`}
                  aria-label={`Reagir com ${emoji}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-black/[0.05] active:scale-95"
                >
                  {emoji}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={(event) => {
                const anchorRect =
                  event.currentTarget.getBoundingClientRect();

                setIsOpen(false);

                onOpenReactionPicker(
                  message,
                  anchorRect,
                );
              }}
              title="Mais reações"
              aria-label="Abrir todos os emojis"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-black/65 transition hover:scale-105 hover:bg-black/[0.06] hover:text-[#e93800] active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onReply(message);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black/70 transition hover:bg-[#fff1ec] hover:text-[#e93800]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <path
                d="M9 7 4 12l5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 12h8a6 6 0 0 1 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <span>Responder</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!text.trim()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black/70 transition hover:bg-[#fff1ec] hover:text-[#e93800] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <rect
                x="8"
                y="8"
                width="11"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <span>Copiar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onForward(message);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black/70 transition hover:bg-[#fff1ec] hover:text-[#e93800]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <path
                d="m15 7 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 12h-8a7 7 0 0 0-7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <span>Encaminhar</span>
          </button>

                    <button
            type="button"
            onClick={() => {
              onNotice(
                "Escolha um emoji na barra superior.",
              );
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black/70 transition hover:bg-[#fff1ec] hover:text-[#e93800]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8.5 14.5c.9 1.15 2.05 1.75 3.5 1.75s2.6-.6 3.5-1.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M9 9.5h.01M15 9.5h.01"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>

            <span>Reagir</span>
          </button>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-black/35"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <path
                d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>

            <span>Favoritar</span>
          </button>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-black/35"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            >
              <path
                d="M9 3h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M10 3v5.5L7 12h10l-3-3.5V3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12v9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <span>Fixar</span>
          </button>

          {message.key.fromMe &&
            !message.id.startsWith(
              "local-",
            ) && (
              <>
                <div className="my-2 border-t border-black/10" />

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  >
                    <path
                      d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span>
                    {isDeleting
                      ? "Apagando..."
                      : "Apagar para todos"}
                  </span>
                </button>
              </>
            )}
        </div>,
        document.body,
      )}
    </div>
  );
}

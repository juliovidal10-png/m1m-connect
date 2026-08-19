"use client";

import { useEffect, useState } from "react";

type Chat = {
  id: string | null;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  updatedAt: string;
  unreadCount: number | null;
  lastMessage?: {
    messageType?: string;
    message?: {
      conversation?: string;
      imageMessage?: {
        caption?: string;
      };
    };
  };
};

function getLastMessage(chat: Chat) {
  const message = chat.lastMessage?.message;

  if (message?.conversation) {
    return message.conversation;
  }

  if (message?.imageMessage?.caption) {
    return message.imageMessage.caption;
  }

  if (chat.lastMessage?.messageType === "imageMessage") {
    return "Imagem";
  }

  if (chat.lastMessage?.messageType === "reactionMessage") {
    return "Reação";
  }

  return "Mensagem";
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ConversationList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChats() {
      try {
        const response = await fetch("/api/chat/list", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Não foi possível carregar as conversas.");
        }

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.value)
            ? data.value
            : [];

        setChats(items);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao carregar as conversas.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadChats();
  }, []);

  return (
    <aside className="w-full overflow-y-auto border-r border-black/5 bg-white md:w-80">
      <div className="border-b border-black/5 p-4">
        <h2 className="text-lg font-bold">Conversas</h2>

        <input
          type="text"
          placeholder="Buscar conversa..."
          className="mt-4 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#0A9090] focus:ring-4 focus:ring-[#0A9090]/10"
        />
      </div>

      {isLoading && (
        <p className="p-4 text-sm text-black/45">Carregando conversas...</p>
      )}

      {errorMessage && (
        <p className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {!isLoading &&
        !errorMessage &&
        chats.map((chat) => (
          <button
            key={chat.id || chat.remoteJid}
            type="button"
            className="flex w-full items-start gap-3 border-b border-black/5 p-4 text-left transition hover:bg-black/[0.02]"
          >
            {chat.profilePicUrl ? (
              <img
                src={chat.profilePicUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECF8F8] font-bold text-[#087B7B]">
                {(chat.pushName || "?").charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">
                  {chat.pushName || chat.remoteJid}
                </p>

                <span className="shrink-0 text-xs text-black/35">
                  {formatTime(chat.updatedAt)}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm text-black/45">
                  {getLastMessage(chat)}
                </p>

                {(chat.unreadCount || 0) > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A9090] px-1.5 text-[10px] font-bold text-white">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
    </aside>
  );
}
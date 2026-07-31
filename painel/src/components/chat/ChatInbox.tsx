"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useAutoRefresh from "@/hooks/useAutoRefresh";
import CustomerPanel from "./CustomerPanel";
import MessageRenderer, {
  type ChatMessage,
} from "./MessageRenderer";

type Chat = {
  id: string | null;
  remoteJid: string;
  canonicalJid?: string;
  pushName: string | null;
  profilePicUrl: string | null;
  updatedAt: string;
  unreadCount: number | null;

  crmCustomerId?: string | null;
  crmName?: string | null;
  crmPhone?: string | null;
  crmCompany?: string | null;
  crmCity?: string | null;
  crmResponsible?: string | null;
  crmResponsibleId?: string | null;
  crmObservations?: string | null;
  crmStatus?: string | null;
  crmAssignedAt?: string | null;
  crmReleasedAt?: string | null;
  crmUpdatedAt?: string | null;

  lastMessage?: {
    pushName?: string | null;
    messageType?: string;
    key?: {
      remoteJid?: string;
      remoteJidAlt?: string;
    };
    message?: {
      conversation?: string;
      imageMessage?: {
        caption?: string;
      };
    };
  };
};

type Contact = {
  id: string | null;
  remoteJid: string;
  pushName: string | null;
  profilePicUrl: string | null;
  isGroup: boolean;
  isSaved: boolean;
  type: string | null;
};

type Message = ChatMessage;

type MediaType =
  | "image"
  | "document"
  | "video"
  | "audio";

function getMediaType(file: File): MediaType {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "document";
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isGroupChat(chat: Chat) {
  return chat.remoteJid.endsWith("@g.us");
}

function getLastMessagePreview(chat: Chat) {
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

  if (chat.lastMessage?.messageType === "audioMessage") {
    return "Áudio";
  }

  if (chat.lastMessage?.messageType === "videoMessage") {
    return "Vídeo";
  }

  if (chat.lastMessage?.messageType === "documentMessage") {
    return "Documento";
  }

  if (chat.lastMessage?.messageType === "reactionMessage") {
    return "Reação";
  }

  return "Mensagem";
}

function getChatPreview(chat: Chat) {
  const preview = getLastMessagePreview(chat);

  if (!isGroupChat(chat)) {
    return preview;
  }

  const participantName =
    chat.lastMessage?.pushName?.trim();

  if (!participantName) {
    return preview;
  }

  return `${participantName}: ${preview}`;
}

function getMessageText(message: Message) {
  if (message.message?.conversation) {
    return message.message.conversation;
  }

  if (message.message?.imageMessage?.caption) {
    return message.message.imageMessage.caption;
  }

  if (message.messageType === "imageMessage") {
    return "📷 Imagem";
  }

  if (message.messageType === "audioMessage") {
    return "🎤 Áudio";
  }

  if (message.messageType === "videoMessage") {
    return "🎥 Vídeo";
  }

  if (message.messageType === "documentMessage") {
    return "📄 Documento";
  }

  if (message.messageType === "reactionMessage") {
    return "👍 Reação";
  }

  return "Mensagem não suportada";
}

function getMessageSignature(message?: Message) {
  if (!message) {
    return null;
  }

  return [
    message.messageTimestamp,
    message.key.fromMe ? "1" : "0",
    getMessageText(message),
  ].join("|");
}

function cleanJid(jid: string) {
  return jid
    .replace("@s.whatsapp.net", "")
    .replace("@lid", "")
    .replace("@g.us", "");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isValidName(name?: string | null) {
  const normalizedName = name?.trim();

  return Boolean(
    normalizedName &&
      normalizedName.toLowerCase() !== "você",
  );
}

function getNameCandidate(chat: Chat) {
  const crmName = chat.crmName?.trim();
  const chatName = chat.pushName?.trim();
  const messageName =
    chat.lastMessage?.pushName?.trim();

  if (isValidName(crmName)) {
    return crmName || null;
  }

  if (isValidName(chatName)) {
    return chatName || null;
  }

  if (isValidName(messageName)) {
    return messageName || null;
  }

  return null;
}

function getCanonicalJid(chat: Chat) {
  if (chat.lastMessage?.key?.remoteJidAlt) {
    return chat.lastMessage.key.remoteJidAlt;
  }

  return chat.remoteJid;
}

function getUpdatedTime(chat: Chat) {
  const time = new Date(chat.updatedAt).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function mergeDuplicateChats(items: Chat[]) {
  const chatsMap = new Map<string, Chat>();

  for (const chat of items) {
    const canonicalJid = getCanonicalJid(chat);
    const current = chatsMap.get(canonicalJid);

    if (!current) {
      chatsMap.set(canonicalJid, {
        ...chat,
        canonicalJid,
        pushName: getNameCandidate(chat),
      });

      continue;
    }

    const chatIsNewer =
      getUpdatedTime(chat) >
      getUpdatedTime(current);

    const lidRemoteJid =
      chat.remoteJid.endsWith("@lid")
        ? chat.remoteJid
        : current.remoteJid.endsWith("@lid")
          ? current.remoteJid
          : chatIsNewer
            ? chat.remoteJid
            : current.remoteJid;

    chatsMap.set(canonicalJid, {
      ...current,
      ...chat,
      id: chatIsNewer
        ? chat.id
        : current.id,
      remoteJid: lidRemoteJid,
      canonicalJid,
      pushName:
        getNameCandidate(chat) ||
        getNameCandidate(current),
      profilePicUrl:
        chat.profilePicUrl ||
        current.profilePicUrl,
      updatedAt: chatIsNewer
        ? chat.updatedAt
        : current.updatedAt,
      unreadCount: Math.max(
        chat.unreadCount || 0,
        current.unreadCount || 0,
      ),
      lastMessage: chatIsNewer
        ? chat.lastMessage
        : current.lastMessage,
    });
  }

  return Array.from(chatsMap.values()).sort(
    (firstChat, secondChat) =>
      getUpdatedTime(secondChat) -
      getUpdatedTime(firstChat),
  );
}

function buildContactsMap(contacts: Contact[]) {
  const contactsMap = new Map<string, Contact>();

  for (const contact of contacts) {
    if (!contact.remoteJid) {
      continue;
    }

    contactsMap.set(
      contact.remoteJid,
      contact,
    );

    contactsMap.set(
      cleanJid(contact.remoteJid),
      contact,
    );
  }

  return contactsMap;
}

function findContact(
  chat: Chat,
  contactsMap: Map<string, Contact>,
) {
  const possibleJids = [
    chat.canonicalJid,
    chat.remoteJid,
    chat.lastMessage?.key?.remoteJid,
    chat.lastMessage?.key?.remoteJidAlt,
  ].filter(
    (jid): jid is string =>
      typeof jid === "string" &&
      jid.length > 0,
  );

  for (const jid of possibleJids) {
    const exactContact =
      contactsMap.get(jid);

    if (exactContact) {
      return exactContact;
    }

    const cleanContact =
      contactsMap.get(cleanJid(jid));

    if (cleanContact) {
      return cleanContact;
    }
  }

  return null;
}

function getChatName(
  chat: Chat,
  contactsMap: Map<string, Contact>,
) {
  if (isGroupChat(chat)) {
    const groupName = chat.pushName?.trim();

    return (
      groupName ||
      cleanJid(chat.remoteJid)
    );
  }

  const crmName = chat.crmName?.trim();

  if (isValidName(crmName)) {
    return crmName as string;
  }

  const contact = findContact(
    chat,
    contactsMap,
  );

  const contactName =
    contact?.pushName?.trim();

  if (isValidName(contactName)) {
    return contactName as string;
  }

  return (
    getNameCandidate(chat) ||
    cleanJid(
      chat.canonicalJid ||
        chat.remoteJid,
    )
  );
}

function getChatProfilePicture(
  chat: Chat,
  contactsMap: Map<string, Contact>,
) {
  const contact = findContact(
    chat,
    contactsMap,
  );

  return (
    contact?.profilePicUrl ||
    chat.profilePicUrl ||
    null
  );
}

function getRecipient(chat: Chat) {
  return (
    chat.canonicalJid ||
    getCanonicalJid(chat)
  );
}

function getCustomerPhone(chat: Chat) {
  return cleanJid(
    chat.canonicalJid ||
      getCanonicalJid(chat),
  );
}

function formatTime(
  timestamp: string | number,
) {
  const date =
    typeof timestamp === "number"
      ? new Date(timestamp * 1000)
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatDateTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Informação indisponível";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

export default function ChatInbox() {
  const [chats, setChats] =
    useState<Chat[]>([]);

  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [
    selectedChat,
    setSelectedChat,
  ] = useState<Chat | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    isCustomerPanelOpen,
    setIsCustomerPanelOpen,
  ] = useState(false);

  const [
    isLoadingChats,
    setIsLoadingChats,
  ] = useState(true);

  const [
    isLoadingMessages,
    setIsLoadingMessages,
  ] = useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [
    isSendingMedia,
    setIsSendingMedia,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const previousChatJidRef =
    useRef<string | null>(null);

  const previousLastMessageSignatureRef =
    useRef<string | null>(null);

  const contactsMap = useMemo(
    () => buildContactsMap(contacts),
    [contacts],
  );

  const filteredChats = useMemo(() => {
    const normalizedQuery =
      normalizeSearchText(searchQuery);

    if (!normalizedQuery) {
      return chats;
    }

    return chats.filter((chat) => {
      const name = normalizeSearchText(
        getChatName(
          chat,
          contactsMap,
        ),
      );

      const phone =
        normalizeSearchText(
          getCustomerPhone(chat),
        );

      const preview =
        normalizeSearchText(
          getChatPreview(chat),
        );

      return (
        name.includes(
          normalizedQuery,
        ) ||
        phone.includes(
          normalizedQuery,
        ) ||
        preview.includes(
          normalizedQuery,
        )
      );
    });
  }, [
    chats,
    contactsMap,
    searchQuery,
  ]);

  const lastMessageSignature =
    useMemo(
      () =>
        getMessageSignature(
          messages[
            messages.length - 1
          ],
        ),
      [messages],
    );

  const loadContacts =
    useCallback(async () => {
      try {
        const response = await fetch(
          "/api/chat/contacts",
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Erro ao carregar contatos.",
          );
        }

        const receivedContacts: Contact[] =
          Array.isArray(data)
            ? data
            : [];

        setContacts(
          receivedContacts,
        );
      } catch (error) {
        console.error(
          "Erro ao carregar contatos:",
          error,
        );
      }
    }, []);

  const loadChats = useCallback(
    async (
      showLoading = false,
    ) => {
      if (showLoading) {
        setIsLoadingChats(true);
      }

      try {
        const response = await fetch(
          "/api/chat/list",
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Erro ao carregar conversas.",
          );
        }

        const receivedItems: Chat[] =
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data?.value,
                )
              ? data.value
              : [];

        const items =
          mergeDuplicateChats(
            receivedItems,
          );

        setChats(items);

        setSelectedChat(
          (currentChat) => {
            if (!currentChat) {
              return (
                items[0] ?? null
              );
            }

            const currentIdentity =
              currentChat.canonicalJid ||
              getCanonicalJid(
                currentChat,
              );

            const updatedChat =
              items.find(
                (chat) =>
                  (chat.canonicalJid ||
                    getCanonicalJid(
                      chat,
                    )) ===
                  currentIdentity,
              );

            return (
              updatedChat ??
              currentChat
            );
          },
        );
      } catch (error) {
        if (showLoading) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Erro ao carregar conversas.",
          );
        }
      } finally {
        if (showLoading) {
          setIsLoadingChats(false);
        }
      }
    },
    [],
  );

  const loadMessages = useCallback(
    async (
      chat: Chat,
      showLoading = false,
    ) => {
      if (showLoading) {
        setIsLoadingMessages(true);
        setErrorMessage("");
      }

      try {
        const response = await fetch(
          `/api/chat/messages?remoteJid=${encodeURIComponent(
            chat.remoteJid,
          )}`,
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Erro ao carregar mensagens.",
          );
        }

        const records: Message[] =
          Array.isArray(data)
            ? data
            : [];

        const orderedMessages = [
          ...records,
        ].reverse();

        setMessages(
          (currentMessages) => {
            const localMessages =
              currentMessages.filter(
                (message) =>
                  message.id.startsWith(
                    "local-",
                  ),
              );

            const confirmedTexts =
              new Set(
                orderedMessages
                  .filter(
                    (message) =>
                      message.key
                        .fromMe,
                  )
                  .map((message) =>
                    getMessageText(
                      message,
                    ).trim(),
                  ),
              );

            const pendingLocalMessages =
              localMessages.filter(
                (message) =>
                  !confirmedTexts.has(
                    getMessageText(
                      message,
                    ).trim(),
                  ),
              );

            return [
              ...orderedMessages,
              ...pendingLocalMessages,
            ];
          },
        );
      } catch (error) {
        if (showLoading) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Erro ao carregar mensagens.",
          );
        }
      } finally {
        if (showLoading) {
          setIsLoadingMessages(
            false,
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadContacts();
    loadChats(true);
  }, [
    loadContacts,
    loadChats,
  ]);

  useEffect(() => {
    setIsCustomerPanelOpen(false);
    setSelectedFile(null);
    setText("");

    if (selectedChat) {
      loadMessages(
        selectedChat,
        true,
      );
    }
  }, [
    selectedChat?.remoteJid,
    loadMessages,
  ]);

  useEffect(() => {
    function handleOpenChat(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          remoteJid?: string;
        }>;

      const requestedRemoteJid =
        customEvent.detail
          ?.remoteJid;

      if (!requestedRemoteJid) {
        return;
      }

      const normalizedRequestedJid =
        cleanJid(
          requestedRemoteJid,
        );

      const matchingChat =
        chats.find((chat) => {
          const possibleJids = [
            chat.remoteJid,
            chat.canonicalJid,
            chat.lastMessage?.key
              ?.remoteJid,
            chat.lastMessage?.key
              ?.remoteJidAlt,
          ].filter(
            (jid): jid is string =>
              typeof jid ===
                "string" &&
              jid.length > 0,
          );

          return possibleJids.some(
            (jid) =>
              jid ===
                requestedRemoteJid ||
              cleanJid(jid) ===
                normalizedRequestedJid,
          );
        });

      if (!matchingChat) {
        setErrorMessage(
          "Não foi possível localizar a conversa deste cliente.",
        );

        return;
      }

      setSelectedChat(
        matchingChat,
      );
    }

    window.addEventListener(
      "m1m:open-chat",
      handleOpenChat,
    );

    return () => {
      window.removeEventListener(
        "m1m:open-chat",
        handleOpenChat,
      );
    };
  }, [chats]);

  const refreshChat =
    useCallback(async () => {
      await loadChats(false);

      if (selectedChat) {
        await loadMessages(
          selectedChat,
          false,
        );
      }
    }, [
      loadChats,
      loadMessages,
      selectedChat,
    ]);

  useAutoRefresh({
    callback: refreshChat,
    interval: 2000,
    enabled: true,
  });

  useEffect(() => {
    const currentChatJid =
      selectedChat?.remoteJid ??
      null;

    const chatChanged =
      previousChatJidRef.current !==
      currentChatJid;

    const newMessageArrived =
      previousLastMessageSignatureRef.current !==
      lastMessageSignature;

    if (
      lastMessageSignature &&
      (chatChanged ||
        newMessageArrived)
    ) {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior: chatChanged
            ? "auto"
            : "smooth",
          block: "end",
        },
      );
    }

    previousChatJidRef.current =
      currentChatJid;

    previousLastMessageSignatureRef.current =
      lastMessageSignature;
  }, [
    selectedChat?.remoteJid,
    lastMessageSignature,
  ]);

  function clearSelectedFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setErrorMessage("");
    setSelectedFile(file);
  }

  async function handleSendMedia() {
    if (
      !selectedChat ||
      !selectedFile ||
      isSending ||
      isSendingMedia
    ) {
      return;
    }

    setIsSendingMedia(true);
    setErrorMessage("");

    try {
      const formData = new FormData();

      formData.append(
        "remoteJid",
        getRecipient(selectedChat),
      );

      formData.append(
        "mediatype",
        getMediaType(selectedFile),
      );

      formData.append(
        "file",
        selectedFile,
        selectedFile.name,
      );

      const caption = text.trim();

      if (caption) {
        formData.append("caption", caption);
      }

      const response = await fetch(
        "/api/chat/send-media",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível enviar o arquivo.",
        );
      }

      clearSelectedFile();
      setText("");

      await loadMessages(
        selectedChat,
        false,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar o arquivo.",
      );
    } finally {
      setIsSendingMedia(false);
    }
  }

  async function handleSend() {
    if (selectedFile) {
      await handleSendMedia();
      return;
    }

    const messageText =
      text.trim();

    if (
      !selectedChat ||
      !messageText ||
      isSending ||
      isSendingMedia
    ) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "/api/chat/send",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            remoteJid:
              getRecipient(
                selectedChat,
              ),
            text: messageText,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível enviar a mensagem.",
        );
      }

      const sentMessage: Message = {
        id: `local-${Date.now()}`,
        key: {
          fromMe: true,
          remoteJid:
            selectedChat.remoteJid,
        },
        pushName: "Você",
        messageType:
          "conversation",
        messageTimestamp:
          Math.floor(
            Date.now() / 1000,
          ),
        message: {
          conversation:
            messageText,
        },
      };

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          sentMessage,
        ],
      );

      setText("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar a mensagem.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="h-full w-80 shrink-0 overflow-y-auto border-r border-black/5 bg-white">
        <div className="sticky top-0 z-10 border-b border-black/5 bg-white p-4">
          <h2 className="text-lg font-bold">
            Conversas
          </h2>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Buscar conversa..."
            aria-label="Buscar conversa por nome, número ou mensagem"
            className="mt-4 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10"
          />
        </div>

        {isLoadingChats && (
          <p className="p-4 text-sm text-black/45">
            Carregando conversas...
          </p>
        )}

        {!isLoadingChats &&
          searchQuery.trim() &&
          filteredChats.length ===
            0 && (
            <p className="p-4 text-sm text-black/45">
              Nenhuma conversa
              encontrada.
            </p>
          )}

        {filteredChats.map(
          (chat) => {
            const isSelected =
              (selectedChat?.canonicalJid ||
                selectedChat?.remoteJid) ===
              (chat.canonicalJid ||
                chat.remoteJid);

            const chatName =
              getChatName(
                chat,
                contactsMap,
              );

            const profilePicUrl =
              getChatProfilePicture(
                chat,
                contactsMap,
              );

            return (
              <button
                key={
                  chat.canonicalJid ||
                  chat.remoteJid
                }
                type="button"
                onClick={() =>
                  setSelectedChat(chat)
                }
                className={`flex w-full items-start gap-3 border-b border-black/5 p-4 text-left transition ${
                  isSelected
                    ? "bg-[#fff1ec]"
                    : "hover:bg-black/[0.02]"
                }`}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1ec] font-bold text-[#e93800]">
                    {chatName.charAt(
                      0,
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      {chatName}
                    </p>

                    <span className="shrink-0 text-xs text-black/35">
                      {formatTime(
                        chat.updatedAt,
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-black/45">
                      {getChatPreview(
                        chat,
                      )}
                    </p>

                    {(chat.unreadCount ||
                      0) > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3d00] px-1.5 text-[10px] font-bold text-white">
                        {
                          chat.unreadCount
                        }
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          },
        )}
      </aside>

      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f7f8]">
        {selectedChat ? (
          <>
            <header className="flex h-20 shrink-0 items-center justify-between border-b border-black/5 bg-white px-6">
              <div>
                <h2 className="font-bold">
                  {getChatName(
                    selectedChat,
                    contactsMap,
                  )}
                </h2>

                <p className="mt-1 text-xs text-green-600">
                  Atualização automática
                  ativa
                </p>
              </div>
              {!isGroupChat(selectedChat) && (
                <button
                  type="button"
                  onClick={() =>
                    setIsCustomerPanelOpen(
                      true,
                    )
                  }
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-black/[0.03]"
                >
                  Dados do cliente
                </button>
              )}
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {isLoadingMessages ? (
                <p className="text-sm text-black/45">
                  Carregando mensagens...
                </p>
              ) : messages.length ===
                0 ? (
                <p className="text-sm text-black/45">
                  Nenhuma mensagem
                  encontrada.
                </p>
              ) : (
                messages.map(
                  (message) => {
                    const isFromMe =
                      message.key
                        .fromMe;

                    return (
                      <div
                        key={
                          message.id
                        }
                        className={`flex ${
                          isFromMe
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                            isFromMe
                              ? "rounded-br-md bg-[#ff3d00] text-white"
                              : "rounded-bl-md bg-white text-[#191919]"
                          }`}
                        >
                          {!isFromMe &&
                            message.pushName && (
                              <p className="mb-1 text-xs font-semibold text-[#e93800]">
                                {
                                  message.pushName
                                }
                              </p>
                            )}

                          <MessageRenderer
                            message={
                              message
                            }
                          />

                          <p
                            className={`mt-1 text-right text-[10px] ${
                              isFromMe
                                ? "text-white/70"
                                : "text-black/35"
                            }`}
                          >
                            {formatTime(
                              message.messageTimestamp,
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )
              )}

              <div
                ref={messagesEndRef}
              />
            </div>

            <footer className="shrink-0 border-t border-black/5 bg-white p-4">
              {selectedFile && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#ff3d00]/20 bg-[#fff1ec] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#191919]">
                      {selectedFile.name}
                    </p>

                    <p className="mt-1 text-xs text-black/45">
                      {formatFileSize(
                        selectedFile.size,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    disabled={isSendingMedia}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#e93800] transition hover:bg-[#ff3d00]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    isSending ||
                    isSendingMedia
                  }
                  aria-label="Selecionar arquivo"
                  title="Anexar arquivo"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-xl transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  📎
                </button>

                <textarea
                  rows={1}
                  value={text}
                  onChange={(event) =>
                    setText(
                      event.target.value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={
                    isSending ||
                    isSendingMedia
                  }
                  placeholder={
                    selectedFile
                      ? "Adicione uma legenda (opcional)..."
                      : "Digite sua mensagem..."
                  }
                  className="min-h-12 flex-1 resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={
                    (!selectedFile &&
                      !text.trim()) ||
                    isSending ||
                    isSendingMedia
                  }
                  className="h-12 rounded-xl bg-[#ff3d00] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSending ||
                  isSendingMedia
                    ? "Enviando..."
                    : "Enviar"}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-black/45">
            Selecione uma conversa.
          </div>
        )}

        {errorMessage && (
          <div className="absolute bottom-20 right-4 z-20 m-4 max-w-md rounded-xl bg-red-50 p-3 text-sm text-red-700 shadow-lg">
            {errorMessage}
          </div>
        )}
      </section>

      {selectedChat && !isGroupChat(selectedChat) && (
        <CustomerPanel
          isOpen={
            isCustomerPanelOpen
          }
          onClose={() =>
            setIsCustomerPanelOpen(
              false,
            )
          }
          name={getChatName(
            selectedChat,
            contactsMap,
          )}
          phone={getCustomerPhone(
            selectedChat,
          )}
                    remoteJid={selectedChat.remoteJid}
profilePicUrl={getChatProfilePicture(
            selectedChat,
            contactsMap,
          )}
          lastInteraction={formatDateTime(
            selectedChat.updatedAt,
          )}
          messages={messages}
        />
      )}
    </div>
  );
}


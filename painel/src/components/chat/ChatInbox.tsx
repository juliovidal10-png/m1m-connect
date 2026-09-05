"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createPortal } from "react-dom";

import useAutoRefresh from "@/hooks/useAutoRefresh";
import MessageRenderer, {
  type ChatMessage,
} from "./MessageRenderer";
import MessageContextMenu from "./MessageContextMenu";
import ChatConversationSidebar, {
  type ChatConversationSidebarItem,
} from "./ChatConversationSidebar";
import ChatConversationHeader from "./ChatConversationHeader";
import ChatCustomerQuickPanel from "./ChatCustomerQuickPanel";

type Chat = {
  id: string | null;
  remoteJid: string;
  canonicalJid?: string;
  pushName: string | null;
  profilePicUrl: string | null;
  updatedAt: string;
  unreadCount: number | null;

  attendanceId?: string | null;
  attendanceState?: "IA" | "HUMANO" | "FINALIZADO" | null;
  attendanceSectorId?: string | null;
  attendanceSectorName?: string | null;
  attendanceResponsibleId?: string | null;

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

const EMOJI_GROUPS = [
  {
    id: "recent",
    label: "Mais usados",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍",
      "🥰", "😘", "😉", "😎", "🤔", "😢",
      "😭", "😡", "👍", "👎", "👏", "🙏",
      "❤️", "🔥", "🎉", "✅", "⚽", "🚀",
    ],
  },
  {
    id: "faces",
    label: "Carinhas",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅",
      "😂", "🤣", "😊", "😇", "🙂", "🙃",
      "😉", "😌", "😍", "🥰", "😘", "😗",
      "😙", "😚", "😋", "😛", "😝", "😜",
      "🤪", "🤨", "🧐", "🤓", "😎", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕",
      "🙁", "☹️", "😣", "😖", "😫", "😩",
      "🥺", "😢", "😭", "😤", "😠", "😡",
    ],
  },
  {
    id: "gestures",
    label: "Gestos",
    emojis: [
      "👍", "👎", "👌", "🤌", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆",
      "👇", "☝️", "✋", "🤚", "🖐️", "🖖",
      "👋", "👏", "🙌", "👐", "🤲", "🙏",
      "✍️", "💪", "🫶", "🤝",
    ],
  },
  {
    id: "symbols",
    label: "Símbolos",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜",
      "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝",
      "💟", "✅", "❌", "⚠️", "❗", "❓",
      "💯", "🔥", "✨", "⭐", "🌟", "💥",
    ],
  },
  {
    id: "objects",
    label: "Objetos e atividades",
    emojis: [
      "🎉", "🎊", "🎁", "🏆", "🥇", "⚽",
      "🏀", "🏐", "🎯", "🚀", "🚗", "✈️",
      "📞", "📱", "💻", "⌚", "📷", "🎥",
      "🎤", "📎", "📄", "📌", "💡", "🔔",
      "💰", "💳", "🧾", "🛒", "📦", "🔧",
    ],
  },
] as const;

const ALL_EMOJIS = EMOJI_GROUPS.flatMap(
  (group) => group.emojis,
);

const MAX_ATTACHMENTS = 20;

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

function getReactionTargetMessageId(
  message: Message,
) {
  return (
    message.message
      ?.reactionMessage
      ?.key
      ?.id
      ?.trim() || ""
  );
}

function getReactionEmoji(
  message: Message,
) {
  return (
    message.message
      ?.reactionMessage
      ?.text
      ?.trim() || ""
  );
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
  const normalizedName =
    name?.trim();

  if (
    !normalizedName ||
    normalizedName.toLowerCase() ===
      "você"
  ) {
    return false;
  }

  if (
    normalizedName.includes(
      "@s.whatsapp.net",
    ) ||
    normalizedName.includes(
      "@lid",
    )
  ) {
    return false;
  }

  const digits =
    normalizedName.replace(
      /\D/g,
      "",
    );

  const letters =
    normalizedName.replace(
      /[^A-Za-zÀ-ÿ]/g,
      "",
    );

  return !(
    digits.length >= 8 &&
    letters.length === 0
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
  if (chat.canonicalJid) {
    return chat.canonicalJid;
  }

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
    const chatIdentity =
      !isGroupChat(chat) && chat.crmCustomerId
        ? `crm:${chat.crmCustomerId}`
        : `jid:${canonicalJid}`;
    const current = chatsMap.get(chatIdentity);

    if (!current) {
      chatsMap.set(chatIdentity, {
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

    chatsMap.set(chatIdentity, {
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

function findChatByRequestedJid(
  items: Chat[],
  requestedRemoteJid: string,
) {
  const normalizedRequestedJid =
    cleanJid(requestedRemoteJid);

  return (
    items.find((chat) => {
      const possibleJids = [
        chat.remoteJid,
        chat.canonicalJid,
        chat.lastMessage?.key
          ?.remoteJid,
        chat.lastMessage?.key
          ?.remoteJidAlt,
      ].filter(
        (jid): jid is string =>
          typeof jid === "string" &&
          jid.length > 0,
      );

      return possibleJids.some(
        (jid) =>
          jid === requestedRemoteJid ||
          cleanJid(jid) ===
            normalizedRequestedJid,
      );
    }) ?? null
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

  const contact = findContact(
    chat,
    contactsMap,
  );

  const contactName =
    contact?.pushName?.trim();

  if (
    contact?.isSaved &&
    isValidName(contactName)
  ) {
    return contactName as string;
  }

  const crmName =
    chat.crmName?.trim();

  if (isValidName(crmName)) {
    return crmName as string;
  }

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

function getMessageDate(
  timestamp: string | number,
) {
  return typeof timestamp === "number"
    ? new Date(timestamp * 1000)
    : new Date(timestamp);
}

function formatConversationDay(
  timestamp: string | number,
) {
  const date = getMessageDate(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const messageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const differenceInDays = Math.round(
    (today.getTime() -
      messageDay.getTime()) /
      86_400_000,
  );

  if (differenceInDays === 0) {
    return "Hoje";
  }

  if (differenceInDays === 1) {
    return "Ontem";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
    },
  ).format(date);
}

function isSameConversationDay(
  first: string | number,
  second: string | number,
) {
  const firstDate = getMessageDate(first);
  const secondDate = getMessageDate(second);

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

export default function ChatInbox() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

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

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [
    isRecordingAudio,
    setIsRecordingAudio,
  ] = useState(false);

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);

  const [
    mediaSendProgress,
    setMediaSendProgress,
  ] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Chat[]>([]);

  const [hasMoreChats, setHasMoreChats] =
    useState(true);

  const [isLoadingMoreChats, setIsLoadingMoreChats] =
    useState(false);

  const [
    isConversationSearchOpen,
    setIsConversationSearchOpen,
  ] = useState(false);

  const [
    isCustomerQuickPanelOpen,
    setIsCustomerQuickPanelOpen,
  ] = useState(false);

  const [
    conversationSearchQuery,
    setConversationSearchQuery,
  ] = useState("");

  const [
    activeConversationMatchIndex,
    setActiveConversationMatchIndex,
  ] = useState(0);

  const [
    isEmojiPickerOpen,
    setIsEmojiPickerOpen,
  ] = useState(false);

  const [emojiSearch, setEmojiSearch] =
    useState("");

  const [
    reactionPickerMessage,
    setReactionPickerMessage,
  ] = useState<Message | null>(null);

  const [
    reactionPickerAnchor,
    setReactionPickerAnchor,
  ] = useState<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null>(null);

  const [
    emojiPickerPosition,
    setEmojiPickerPosition,
  ] = useState({
    left: 0,
    bottom: 0,
  });

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
    isDraggingFiles,
    setIsDraggingFiles,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    actionNotice,
    setActionNotice,
  ] = useState("");

  const [
    replyMessage,
    setReplyMessage,
  ] = useState<Message | null>(null);

  const [
    forwardMessage,
    setForwardMessage,
  ] = useState<Message | null>(null);

  const [
    forwardSearch,
    setForwardSearch,
  ] = useState("");

  const [
    isForwarding,
    setIsForwarding,
  ] = useState(false);

  const [
    showScrollToBottomButton,
    setShowScrollToBottomButton,
  ] = useState(false);
  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const conversationSearchInputRef =
    useRef<HTMLInputElement | null>(null);

  const messageElementRefs =
    useRef<
      Map<
        string,
        HTMLDivElement
      >
    >(new Map());

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const messageInputRef =
    useRef<HTMLTextAreaElement | null>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const recordingStreamRef =
    useRef<MediaStream | null>(null);

  const recordingChunksRef =
    useRef<Blob[]>([]);

  const recordingTimerRef =
    useRef<number | null>(null);

  const cancelRecordingRef =
    useRef(false);

  const emojiPickerRef =
    useRef<HTMLDivElement | null>(null);

  const emojiButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const dragDepthRef =
    useRef(0);

  const previousChatJidRef =
    useRef<string | null>(null);

  const previousLastMessageSignatureRef =
    useRef<string | null>(null);

  const handledNavigationRef =
    useRef<string | null>(null);

  const activeChatJidRef =
    useRef<string | null>(null);

  const messagesRequestIdRef =
    useRef(0);

  const contactsMap = useMemo(
    () => buildContactsMap(contacts),
    [contacts],
  );

  const filteredChats = useMemo(() => {
    const normalizedQuery =
      normalizeSearchText(
        searchQuery,
      );

    if (!normalizedQuery) {
      return chats;
    }

    /*
     * Busca hibrida:
     * - resultado LOCAL aparece imediatamente entre os chats ja carregados;
     * - resultado GLOBAL continua chegando pela API e e mesclado depois.
     *
     * Assim, nomes que ja estao visiveis nao precisam esperar a Evolution,
     * sem perder a busca independente da base carregada.
     */
    const localMatches =
      chats.filter((chat) => {
        const haystack =
          normalizeSearchText(
            [
              getChatName(
                chat,
                contactsMap,
              ),
              chat.pushName,
              chat.crmName,
              chat.crmPhone,
              chat.remoteJid,
              chat.canonicalJid,
            ].join(" "),
          );

        return haystack.includes(
          normalizedQuery,
        );
      });

    return mergeDuplicateChats([
      ...localMatches,
      ...searchResults,
    ]);
  }, [
    chats,
    contactsMap,
    searchQuery,
    searchResults,
  ]);

  const conversationSidebarItems =
    useMemo<ChatConversationSidebarItem[]>(
      () =>
        filteredChats.map((chat) => ({
          key:
            chat.canonicalJid ||
            chat.remoteJid,
          name: getChatName(
            chat,
            contactsMap,
          ),
          profilePicUrl:
            getChatProfilePicture(
              chat,
              contactsMap,
            ),
          preview:
            getChatPreview(chat),
          updatedAt: formatTime(
            chat.updatedAt,
          ),
          unreadCount:
            chat.unreadCount || 0,
          isSelected:
            (selectedChat?.canonicalJid ||
              selectedChat?.remoteJid) ===
            (chat.canonicalJid ||
              chat.remoteJid),
          onSelect: () => {
            activeChatJidRef.current =
              chat.remoteJid;
            messagesRequestIdRef.current += 1;
            setMessages([]);
            setSelectedChat(chat);
          },
        })),
      [
        contactsMap,
        filteredChats,
        selectedChat?.canonicalJid,
        selectedChat?.remoteJid,
      ],
    );

  const forwardChats =
    useMemo(() => {
      const normalizedQuery =
        normalizeSearchText(
          forwardSearch,
        );

      if (!normalizedQuery) {
        return chats;
      }

      return chats.filter(
        (chat) => {
          const name =
            normalizeSearchText(
              getChatName(
                chat,
                contactsMap,
              ),
            );

          const phone =
            normalizeSearchText(
              getCustomerPhone(
                chat,
              ),
            );

          return (
            name.includes(
              normalizedQuery,
            ) ||
            phone.includes(
              normalizedQuery,
            )
          );
        },
      );
    }, [
      chats,
      contactsMap,
      forwardSearch,
    ]);

  const filteredEmojiGroups =
    useMemo(() => {
      const query =
        emojiSearch.trim();

      if (!query) {
        return EMOJI_GROUPS;
      }

      const normalizedQuery =
        query.toLocaleLowerCase(
          "pt-BR",
        );

      const aliases: Record<
        string,
        string[]
      > = {
        feliz: ["😀", "😃", "😄", "😁", "😊", "🥳"],
        rir: ["😂", "🤣", "😆"],
        amor: ["😍", "🥰", "😘", "❤️", "💕", "💖"],
        triste: ["😞", "😔", "😢", "😭"],
        bravo: ["😠", "😡", "😤"],
        ok: ["👍", "👌", "✅"],
        obrigado: ["🙏", "🫶", "❤️"],
        parabens: ["🎉", "🎊", "👏", "🏆"],
        dinheiro: ["💰", "💳", "🧾"],
        futebol: ["⚽", "🏆"],
        fogo: ["🔥"],
        estrela: ["⭐", "🌟"],
      };

      const matched =
        aliases[normalizedQuery] ??
        ALL_EMOJIS.filter(
          (emoji) =>
            emoji.includes(query),
        );

      return [
        {
          id: "search",
          label: "Resultados",
          emojis: matched,
        },
      ];
    }, [emojiSearch]);

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


  const selectedChatListSignature =
    useMemo(
      () => {
        if (!selectedChat) {
          return "";
        }

        return [
          selectedChat.updatedAt,
          selectedChat.lastMessage?.messageType ?? "",
          selectedChat.lastMessage?.key?.remoteJid ?? "",
          selectedChat.lastMessage?.key?.remoteJidAlt ?? "",
          selectedChat.lastMessage?.message?.conversation ?? "",
          selectedChat.lastMessage?.message?.imageMessage?.caption ?? "",
        ].join("|");
      },
      [selectedChat],
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

  const reactionData =
    useMemo(() => {
      const reactionsByMessageId =
        new Map<
          string,
          string[]
        >();

      const visibleMessages: Message[] =
        [];

      for (const message of messages) {
        if (
          message.messageType !==
          "reactionMessage"
        ) {
          visibleMessages.push(
            message,
          );
          continue;
        }

        const targetMessageId =
          getReactionTargetMessageId(
            message,
          );

        const emoji =
          getReactionEmoji(
            message,
          );

        if (
          !targetMessageId ||
          !emoji
        ) {
          continue;
        }

        const current =
          reactionsByMessageId.get(
            targetMessageId,
          ) || [];

        reactionsByMessageId.set(
          targetMessageId,
          [
            ...current,
            emoji,
          ],
        );
      }

      return {
        visibleMessages,
        reactionsByMessageId,
      };
    }, [messages]);

  const conversationSearchMatches =
    useMemo(() => {
      const normalizedQuery =
        normalizeSearchText(
          conversationSearchQuery,
        );

      if (!normalizedQuery) {
        return [];
      }

      return reactionData
        .visibleMessages
        .filter((message) =>
          normalizeSearchText(
            getMessageText(
              message,
            ),
          ).includes(
            normalizedQuery,
          ),
        )
        .map(
          (message) =>
            message.key.id ||
            message.id,
        );
    }, [
      conversationSearchQuery,
      reactionData.visibleMessages,
    ]);

  const activeConversationMatchId =
    conversationSearchMatches[
      activeConversationMatchIndex
    ] ?? null;

  const loadChatsInFlightRef = useRef(false);
  const chatsRef = useRef<Chat[]>([]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const loadChats = useCallback(
    async (
      showLoading = false,
      mode: "replace" | "append" | "refresh" = "replace",
    ) => {
      if (loadChatsInFlightRef.current) {
        return;
      }

      loadChatsInFlightRef.current = true;

      if (showLoading) setIsLoadingChats(true);
      if (mode === "append") setIsLoadingMoreChats(true);

      try {
        const offset = mode === "append" ? chatsRef.current.length : 0;
        const response = await fetch(
          `/api/chat/list?limit=30&offset=${offset}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar conversas.");
        }

        const receivedItems: Chat[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.value)
              ? data.value
              : [];
        const items = mergeDuplicateChats(receivedItems);
        setHasMoreChats(Boolean(data?.hasMore));

        let nextItems = items;
        if (mode === "append") {
          nextItems = mergeDuplicateChats([...chatsRef.current, ...items]);
        } else if (mode === "refresh") {
          nextItems = mergeDuplicateChats([...items, ...chatsRef.current]);
        }

        chatsRef.current = nextItems;
        setChats(nextItems);

        setSelectedChat((currentChat) => {
          if (!currentChat) return nextItems[0] ?? null;
          const currentIdentity = currentChat.canonicalJid || getCanonicalJid(currentChat);
          return nextItems.find((chat) =>
            (chat.canonicalJid || getCanonicalJid(chat)) === currentIdentity,
          ) ?? currentChat;
        });
      } catch (error) {
        if (showLoading) {
          setErrorMessage(
            error instanceof Error ? error.message : "Erro ao carregar conversas.",
          );
        }
      } finally {
        loadChatsInFlightRef.current = false;
        if (showLoading) setIsLoadingChats(false);
        if (mode === "append") setIsLoadingMoreChats(false);
      }
    },
    [],
  );

  const loadMoreChats = useCallback(async () => {
    if (!hasMoreChats || searchQuery.trim()) return;
    await loadChats(false, "append");
  }, [hasMoreChats, loadChats, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/chat/list?search=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) return;
        const items: Chat[] = Array.isArray(data?.items) ? data.items : [];
        setSearchResults(mergeDuplicateChats(items));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Erro ao buscar conversas:", error);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const loadMessages = useCallback(
    async (
      chat: Chat,
      showLoading = false,
    ) => {
      const requestId =
        ++messagesRequestIdRef.current;
      const requestedChatJid =
        chat.remoteJid;

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

        if (
          requestId !==
            messagesRequestIdRef.current
        ) {
          return;
        }

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
        ].sort(
          (firstMessage, secondMessage) =>
            Number(
              firstMessage.messageTimestamp,
            ) -
            Number(
              secondMessage.messageTimestamp,
            ),
        );

        setMessages(
          (currentMessages) => {
            const localMessages =
              currentMessages.filter(
                (message) =>
                  (message.id || message.key?.id || "").startsWith(
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
        if (showLoading) {
          /*
           * Na troca de conversa, aguarda o React renderizar
           * o novo historico antes de posicionar no fim.
           */
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({
                behavior: "auto",
                block: "end",
              });

              setShowScrollToBottomButton(false);
            });
          });
        }
      } catch (error) {
        if (
          requestId !==
            messagesRequestIdRef.current
        ) {
          return;
        }

        if (showLoading) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Erro ao carregar mensagens.",
          );
        }
      } finally {
        if (
          showLoading &&
          requestId ===
            messagesRequestIdRef.current
        ) {
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
    activeChatJidRef.current =
      selectedChat?.remoteJid ?? null;
  }, [selectedChat?.remoteJid]);

  useEffect(() => {
    setSelectedFiles([]);
    setMediaSendProgress(null);
    setIsDraggingFiles(false);
    dragDepthRef.current = 0;
    setIsEmojiPickerOpen(false);
    setEmojiSearch("");
    setReplyMessage(null);
    setForwardMessage(null);
    setForwardSearch("");
    setText("");
    setIsConversationSearchOpen(
      false,
    );
    setConversationSearchQuery("");
    setActiveConversationMatchIndex(
      0,
    );

    if (selectedChat) {
      loadMessages(
        selectedChat,
        true,
      );
    }
  }, [
    selectedChat?.remoteJid,
    selectedChat?.canonicalJid,
    loadMessages,
  ]);

  const resolveChatByRemoteJid = useCallback(
    async (requestedRemoteJid: string) => {
      const localMatch =
        findChatByRequestedJid(
          chatsRef.current,
          requestedRemoteJid,
        );

      if (localMatch) {
        return localMatch;
      }

      const response = await fetch(
        `/api/chat/list?search=${encodeURIComponent(
          requestedRemoteJid,
        )}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Erro ao localizar conversa.",
        );
      }

      const receivedItems: Chat[] =
        Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.value)
              ? data.value
              : [];

      const resolvedItems =
        mergeDuplicateChats(receivedItems);

      const remoteMatch =
        findChatByRequestedJid(
          resolvedItems,
          requestedRemoteJid,
        );

      if (!remoteMatch) {
        return null;
      }

      const nextItems =
        mergeDuplicateChats([
          ...chatsRef.current,
          ...resolvedItems,
        ]);

      chatsRef.current = nextItems;
      setChats(nextItems);

      return (
        findChatByRequestedJid(
          nextItems,
          requestedRemoteJid,
        ) ?? remoteMatch
      );
    },
    [],
  );

  useEffect(() => {
    const requestedRemoteJid =
      searchParams.get(
        "remoteJid",
      );

    if (!requestedRemoteJid) {
      return;
    }

    const navigationKey =
      requestedRemoteJid;

    if (
      handledNavigationRef.current ===
      navigationKey
    ) {
      return;
    }

    handledNavigationRef.current =
      navigationKey;

    let cancelled = false;

    void (async () => {
      try {
        const matchingChat =
          await resolveChatByRemoteJid(
            requestedRemoteJid,
          );

        if (cancelled) {
          return;
        }

        if (!matchingChat) {
          setErrorMessage(
            "Não foi possível localizar a conversa deste cliente.",
          );

          router.replace("/");
          return;
        }

        setSelectedChat(
          matchingChat,
        );

        router.replace("/");
      } catch (error) {
        if (cancelled) {
          return;
        }

        handledNavigationRef.current =
          null;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao localizar conversa.",
        );

        router.replace("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    resolveChatByRemoteJid,
    router,
    searchParams,
  ]);
  useEffect(() => {
    async function handleOpenChat(
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

      try {
        const matchingChat =
          await resolveChatByRemoteJid(
            requestedRemoteJid,
          );

        if (!matchingChat) {
          setErrorMessage(
            "Não foi possível localizar a conversa deste cliente.",
          );

          return;
        }

        setSelectedChat(
          matchingChat,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao localizar conversa.",
        );
      }
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
  }, [resolveChatByRemoteJid]);

  useEffect(() => {
    setActiveConversationMatchIndex(
      0,
    );
  }, [conversationSearchQuery]);

  useEffect(() => {
    if (
      conversationSearchMatches.length ===
      0
    ) {
      setActiveConversationMatchIndex(
        0,
      );
      return;
    }

    if (
      activeConversationMatchIndex >=
      conversationSearchMatches.length
    ) {
      setActiveConversationMatchIndex(
        conversationSearchMatches.length -
          1,
      );
    }
  }, [
    activeConversationMatchIndex,
    conversationSearchMatches.length,
  ]);

  useEffect(() => {
    if (
      !activeConversationMatchId
    ) {
      return;
    }

    const element =
      messageElementRefs.current.get(
        activeConversationMatchId,
      );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeConversationMatchId]);

  useEffect(() => {
    if (!isConversationSearchOpen) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        conversationSearchInputRef.current?.focus();
      },
    );
  }, [isConversationSearchOpen]);

  function handleQuotedMessageClick(
    stanzaId: string,
  ) {
    const targetId = stanzaId?.trim();

    if (!targetId) {
      return;
    }

    const element =
      messageElementRefs.current.get(
        targetId,
      );

    if (!element) {
      showActionNotice(
        "A mensagem original não está carregada nesta conversa.",
      );
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
  function openConversationSearch() {
    setIsConversationSearchOpen(true);

    window.requestAnimationFrame(
      () => {
        conversationSearchInputRef.current?.focus();
      },
    );
  }

  function closeConversationSearch() {
    setIsConversationSearchOpen(false);
    setConversationSearchQuery("");
    setActiveConversationMatchIndex(
      0,
    );
  }

  function goToPreviousConversationMatch() {
    if (
      conversationSearchMatches.length ===
      0
    ) {
      return;
    }

    setActiveConversationMatchIndex(
      (currentIndex) =>
        currentIndex === 0
          ? conversationSearchMatches.length -
            1
          : currentIndex - 1,
    );
  }

  function goToNextConversationMatch() {
    if (
      conversationSearchMatches.length ===
      0
    ) {
      return;
    }

    setActiveConversationMatchIndex(
      (currentIndex) =>
        currentIndex ===
        conversationSearchMatches.length -
          1
          ? 0
          : currentIndex + 1,
    );
  }

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return;
    }

    updateEmojiPickerPosition();

    function handleViewportChange() {
      updateEmojiPickerPosition();
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
    isEmojiPickerOpen,
    reactionPickerAnchor,
  ]);

  useEffect(() => {
    return () => {
      cancelRecordingRef.current =
        true;

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        recorder.stop();
      }

      stopRecordingTimer();
      releaseRecordingStream();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        !isEmojiPickerOpen ||
        !emojiPickerRef.current
      ) {
        return;
      }

      if (
        !emojiPickerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsEmojiPickerOpen(false);
        setEmojiSearch("");
        setReactionPickerMessage(
          null,
        );
        setReactionPickerAnchor(
          null,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
    };
  }, [isEmojiPickerOpen]);
  const selectedChatRemoteJid =
    selectedChat?.remoteJid ?? null;

  const refreshOpenChatMessages =
    useCallback(async () => {
      if (!selectedChatRemoteJid) {
        return;
      }

      try {
        const response = await fetch(
          `/api/chat/recent-messages?remoteJid=${encodeURIComponent(
            selectedChatRemoteJid,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!Array.isArray(data)) {
          return;
        }

        if (data.length === 0) {
          return;
        }

        const recentMessages =
          (data as Message[]).sort(
            (
              firstMessage,
              secondMessage,
            ) =>
              Number(
                firstMessage.messageTimestamp,
              ) -
              Number(
                secondMessage.messageTimestamp,
              ),
          );

        setMessages(
          (currentMessages) => {
            const localMessages =
              currentMessages.filter(
                (message) =>
                  (message.id || message.key?.id || "").startsWith(
                    "local-",
                  ),
              );

            const confirmedTexts =
              new Set(
                recentMessages
                  .filter(
                    (message) =>
                      message.key.fromMe,
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
              ...recentMessages,
              ...pendingLocalMessages,
            ];
          },
        );
      } catch {
        /*
         * Refresh leve e nao bloqueante.
         * A sincronizacao completa continua
         * na abertura da conversa.
         */
      }
    }, [selectedChatRemoteJid]);

  useAutoRefresh({
    callback:
      refreshOpenChatMessages,
    interval: 2000,
    enabled: Boolean(selectedChatRemoteJid),
  });

  const refreshChat =
    useCallback(async () => {
      /*
       * O refresh frequente atualiza apenas a lista.
       * O historico da conversa deixa de ser
       * resincronizado inteiro a cada 2 segundos.
       */
      await loadChats(false, "refresh");
    }, [loadChats]);

  useAutoRefresh({
    callback: refreshChat,
    interval: 2000,
    enabled: true,
  });

  const refreshContacts =
    useCallback(async () => {
      /*
       * Contatos mudam com menos frequencia que chats,
       * mas precisam ser renovados para nomes e fotos
       * acompanharem o WhatsApp sem recarregar a tela.
       *
       * Uma falha temporaria de rede/recompilacao nao
       * deve derrubar a interface nem apagar o estado
       * que ja esta carregado. O ciclo seguinte tenta
       * novamente normalmente.
       */
      try {
        await loadContacts();
      } catch (error) {
        console.warn(
          "[M1M CONTATOS] Refresh temporariamente indisponivel; mantendo dados atuais.",
          error,
        );
      }
    }, [loadContacts]);

  useAutoRefresh({
    callback: refreshContacts,
    interval: 30000,
    enabled: true,
  });

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
      setShowScrollToBottomButton(false);
    },
    [],
  );

  useEffect(() => {
    const element =
      messagesEndRef.current;

    if (
      !element ||
      typeof IntersectionObserver ===
        "undefined"
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          setShowScrollToBottomButton(
            !entry.isIntersecting,
          );
        },
        {
          threshold: 0.01,
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    selectedChat?.remoteJid,
    selectedChatListSignature,
  ]);
  useEffect(() => {
    const currentChatJid =
      selectedChat?.remoteJid ??
      null;

    const chatChanged =
      previousChatJidRef.current !==
      currentChatJid;

    const newMessageArrived =
      previousLastMessageSignatureRef.current !==
      selectedChatListSignature;

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

    /*
     * A lista de conversas continua sendo consultada
     * a cada 2 segundos. O historico so e atualizado
     * quando a assinatura da ultima mensagem muda.
     *
     * Na troca de conversa, o carregamento inicial
     * continua sendo feito pelo efeito dedicado.
     */
    if (
      newMessageArrived &&
      !chatChanged &&
      selectedChat
    ) {
      void loadMessages(
        selectedChat,
        false,
      );
    }

    previousChatJidRef.current =
      currentChatJid;

    previousLastMessageSignatureRef.current =
      selectedChatListSignature;
  }, [
    selectedChat,
    selectedChat?.remoteJid,
    lastMessageSignature,
    selectedChatListSignature,
    loadMessages,
  ]);

  function calculateEmojiPickerPosition(
    rect: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    },
    alignToRight: boolean,
  ) {
    const pickerWidth = 360;
    const pickerHeight = 430;
    const viewportPadding = 12;
    const gap = 10;

    const preferredLeft =
      alignToRight
        ? rect.right -
          pickerWidth
        : rect.left;

    const safeLeft = Math.min(
      Math.max(
        viewportPadding,
        preferredLeft,
      ),
      window.innerWidth -
        pickerWidth -
        viewportPadding,
    );

    const availableAbove =
      rect.top -
      viewportPadding;

    const availableBelow =
      window.innerHeight -
      rect.bottom -
      viewportPadding;

    const openAbove =
      availableAbove >=
        pickerHeight ||
      availableAbove >
        availableBelow;

    const bottom = openAbove
      ? window.innerHeight -
        rect.top +
        gap
      : Math.max(
          viewportPadding,
          window.innerHeight -
            rect.bottom -
            pickerHeight -
            gap,
        );

    return {
      left: safeLeft,
      bottom,
    };
  }

  function updateEmojiPickerPosition() {
    const button =
      emojiButtonRef.current;

    const rect =
      reactionPickerAnchor ??
      button?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setEmojiPickerPosition(
      calculateEmojiPickerPosition(
        rect,
        Boolean(
          reactionPickerAnchor,
        ),
      ),
    );
  }

  function openReactionEmojiPicker(
    message: Message,
    anchorRect: DOMRect,
  ) {
    const anchor = {
      left: anchorRect.left,
      top: anchorRect.top,
      right: anchorRect.right,
      bottom: anchorRect.bottom,
    };

    setEmojiPickerPosition(
      calculateEmojiPickerPosition(
        anchor,
        true,
      ),
    );

    setReactionPickerMessage(
      message,
    );

    setReactionPickerAnchor(
      anchor,
    );

    setEmojiSearch("");
    setIsEmojiPickerOpen(true);
  }

  async function selectEmoji(
    emoji: string,
  ) {
    if (reactionPickerMessage) {
      const targetMessage =
        reactionPickerMessage;

      setIsEmojiPickerOpen(false);
      setEmojiSearch("");
      setReactionPickerMessage(
        null,
      );
      setReactionPickerAnchor(
        null,
      );

      await handleReactMessage(
        targetMessage,
        emoji,
      );

      return;
    }

    insertEmoji(emoji);
  }

  function insertEmoji(
    emoji: string,
  ) {
    const textarea =
      messageInputRef.current;

    if (!textarea) {
      setText(
        (currentText) =>
          `${currentText}${emoji}`,
      );
      return;
    }

    const start =
      textarea.selectionStart ??
      text.length;

    const end =
      textarea.selectionEnd ??
      start;

    const nextText =
      `${text.slice(0, start)}${emoji}${text.slice(end)}`;

    setText(nextText);

    window.requestAnimationFrame(
      () => {
        textarea.focus();

        const nextCursor =
          start + emoji.length;

        textarea.setSelectionRange(
          nextCursor,
          nextCursor,
        );
      },
    );
  }

  async function handleReactMessage(
    message: Message,
    emoji: string,
  ) {
    const evolutionMessageId =
      message.key.id?.trim();

    if (!evolutionMessageId) {
      showActionNotice(
        "Não foi possível identificar a mensagem para reagir.",
      );
      return;
    }

    try {
      setErrorMessage("");

      const response = await fetch(
        "/api/chat/react",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            remoteJid:
              message.key.remoteJid,
            messageId:
              evolutionMessageId,
            fromMe:
              message.key.fromMe,
            participant:
              message.key.participant,
            emoji,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível enviar a reação.",
        );
      }

      showActionNotice(
        `Reação ${emoji} enviada.`,
      );

      if (selectedChat) {
        await loadMessages(
          selectedChat,
          false,
        );
      }

      await loadChats(false, "refresh");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao reagir à mensagem.",
      );
    }
  }

  function handleForwardMessage(
    message: Message,
  ) {
    setForwardMessage(message);
    setForwardSearch("");
  }

  function cancelForwardMessage() {
    if (isForwarding) {
      return;
    }

    setForwardMessage(null);
    setForwardSearch("");
  }

  async function forwardMessageToChat(
    destinationChat: Chat,
  ) {
    if (
      !forwardMessage ||
      isForwarding
    ) {
      return;
    }

    const destinationRemoteJid =
      getRecipient(
        destinationChat,
      );

    const messageText =
      getMessageText(
        forwardMessage,
      ).trim();

    const messageType =
      forwardMessage.messageType;

    const mediaTypeMap: Record<
      string,
      "image" |
      "video" |
      "audio" |
      "document"
    > = {
      imageMessage: "image",
      videoMessage: "video",
      audioMessage: "audio",
      documentMessage:
        "document",
    };

    const mediaType =
      messageType
        ? mediaTypeMap[
            messageType
          ]
        : undefined;

    const isTextMessage =
      messageType ===
        "conversation" ||
      messageType ===
        "extendedTextMessage";

    if (
      !isTextMessage &&
      !mediaType
    ) {
      showActionNotice(
        "Este tipo de mensagem ainda não pode ser encaminhado.",
      );
      return;
    }

    setIsForwarding(true);
    setErrorMessage("");

    try {
      if (isTextMessage) {
        const response =
          await fetch(
            "/api/chat/send",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  remoteJid:
                    destinationRemoteJid,
                  text:
                    messageText,
                }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível encaminhar a mensagem.",
          );
        }
      } else if (mediaType) {
        const mediaResponse =
          await fetch(
            "/api/chat/media",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  message:
                    forwardMessage,
                }),
              cache: "no-store",
            },
          );

        const mediaData =
          await mediaResponse.json();

        if (
          !mediaResponse.ok ||
          !mediaData.base64
        ) {
          throw new Error(
            mediaData.error ||
              "Não foi possível recuperar a mídia original.",
          );
        }

        const binaryString =
          window.atob(
            mediaData.base64,
          );

        const bytes =
          new Uint8Array(
            binaryString.length,
          );

        for (
          let index = 0;
          index <
          binaryString.length;
          index += 1
        ) {
          bytes[index] =
            binaryString.charCodeAt(
              index,
            );
        }

        const mimeType =
          mediaData.mimetype ||
          "application/octet-stream";

        const fallbackExtension =
          mediaType === "image"
            ? "jpg"
            : mediaType ===
                "video"
              ? "mp4"
              : mediaType ===
                  "audio"
                ? "ogg"
                : "bin";

        const fileName =
          mediaData.fileName ||
          `encaminhado-${Date.now()}.${fallbackExtension}`;

        const file =
          new File(
            [bytes],
            fileName,
            {
              type: mimeType,
            },
          );

        const formData =
          new FormData();

        formData.append(
          "remoteJid",
          destinationRemoteJid,
        );

        formData.append(
          "mediatype",
          mediaType,
        );

        formData.append(
          "caption",
          mediaData.caption ||
            "",
        );

        formData.append(
          "file",
          file,
          fileName,
        );

        const response =
          await fetch(
            "/api/chat/send-media",
            {
              method: "POST",
              body: formData,
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível encaminhar a mídia.",
          );
        }
      }

      setForwardMessage(null);
      setForwardSearch("");

      showActionNotice(
        `Mensagem encaminhada para ${getChatName(
          destinationChat,
          contactsMap,
        )}.`,
      );

      await loadChats(false, "refresh");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao encaminhar a mensagem.",
      );
    } finally {
      setIsForwarding(false);
    }
  }

  function handleReplyMessage(
    message: Message,
  ) {
    setReplyMessage(message);

    window.requestAnimationFrame(
      () => {
        messageInputRef.current?.focus();
      },
    );
  }

  function cancelReplyMessage() {
    setReplyMessage(null);
    messageInputRef.current?.focus();
  }

  function showActionNotice(
    message: string,
  ) {
    setActionNotice(message);

    window.setTimeout(() => {
      setActionNotice("");
    }, 2200);
  }

  function handleMessageEdited(
    messageId: string,
    newText: string,
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const currentMessage =
          message.message || {};

        if (
          currentMessage.extendedTextMessage
        ) {
          return {
            ...message,
            message: {
              ...currentMessage,
              extendedTextMessage: {
                ...currentMessage.extendedTextMessage,
                text: newText,
              },
            },
          };
        }

        return {
          ...message,
          message: {
            ...currentMessage,
            conversation: newText,
          },
        };
      }),
    );
  }
  function handleMessageDeleted(
    messageId: string,
  ) {
    setMessages(
      (currentMessages) =>
        currentMessages.filter(
          (message) =>
            message.id !== messageId,
        ),
    );
  }

  function formatRecordingTime(
    totalSeconds: number,
  ) {
    const minutes =
      Math.floor(
        totalSeconds / 60,
      );

    const seconds =
      totalSeconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function stopRecordingTimer() {
    if (
      recordingTimerRef.current !==
      null
    ) {
      window.clearInterval(
        recordingTimerRef.current,
      );

      recordingTimerRef.current =
        null;
    }
  }

  function releaseRecordingStream() {
    recordingStreamRef.current
      ?.getTracks()
      .forEach(
        (track) =>
          track.stop(),
      );

    recordingStreamRef.current =
      null;
  }

  async function startAudioRecording() {
    if (
      isRecordingAudio ||
      isSending ||
      isSendingMedia ||
      isRecordingAudio
    ) {
      return;
    }

    if (
      !navigator.mediaDevices
        ?.getUserMedia ||
      typeof MediaRecorder ===
        "undefined"
    ) {
      setErrorMessage(
        "Este navegador não oferece suporte à gravação de áudio.",
      );
      return;
    }

    try {
      setErrorMessage("");
      setIsEmojiPickerOpen(false);
      clearSelectedFiles();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation:
              true,
            noiseSuppression:
              true,
            autoGainControl:
              true,
          },
        });

      const preferredMimeTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];

      const supportedMimeType =
        preferredMimeTypes.find(
          (mimeType) =>
            MediaRecorder.isTypeSupported(
              mimeType,
            ),
        );

      const recorder =
        supportedMimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  supportedMimeType,
              },
            )
          : new MediaRecorder(
              stream,
            );

      recordingStreamRef.current =
        stream;

      mediaRecorderRef.current =
        recorder;

      recordingChunksRef.current =
        [];

      cancelRecordingRef.current =
        false;

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size > 0
          ) {
            recordingChunksRef.current.push(
              event.data,
            );
          }
        };

      recorder.onstop = () => {
        stopRecordingTimer();
        releaseRecordingStream();

        setIsRecordingAudio(
          false,
        );

        const wasCancelled =
          cancelRecordingRef.current;

        cancelRecordingRef.current =
          false;

        if (wasCancelled) {
          recordingChunksRef.current =
            [];

          setRecordingSeconds(0);
          return;
        }

        const mimeType =
          recorder.mimeType ||
          supportedMimeType ||
          "audio/webm";

        const blob =
          new Blob(
            recordingChunksRef.current,
            {
              type: mimeType,
            },
          );

        recordingChunksRef.current =
          [];

        if (blob.size === 0) {
          setRecordingSeconds(0);

          setErrorMessage(
            "A gravação ficou vazia. Tente novamente.",
          );
          return;
        }

        const extension =
          mimeType.includes("ogg")
            ? "ogg"
            : "webm";

        const file =
          new File(
            [blob],
            `audio-gravado-${Date.now()}.${extension}`,
            {
              type: mimeType,
              lastModified:
                Date.now(),
            },
          );

        addSelectedFiles([
          file,
        ]);

        setRecordingSeconds(0);

        showActionNotice(
          "Áudio gravado. Revise e clique em Enviar.",
        );
      };

      recorder.onerror = () => {
        stopRecordingTimer();
        releaseRecordingStream();

        setIsRecordingAudio(
          false,
        );

        setRecordingSeconds(0);

        setErrorMessage(
          "Ocorreu um erro durante a gravação do áudio.",
        );
      };

      recorder.start(250);

      setRecordingSeconds(0);
      setIsRecordingAudio(true);

      recordingTimerRef.current =
        window.setInterval(
          () => {
            setRecordingSeconds(
              (current) =>
                current + 1,
            );
          },
          1000,
        );
    } catch (error) {
      stopRecordingTimer();
      releaseRecordingStream();

      setIsRecordingAudio(false);
      setRecordingSeconds(0);

      const isDenied =
        error instanceof DOMException &&
        (
          error.name ===
            "NotAllowedError" ||
          error.name ===
            "PermissionDeniedError"
        );

      setErrorMessage(
        isDenied
          ? "Permita o uso do microfone no navegador para gravar mensagens."
          : "Não foi possível acessar o microfone.",
      );
    }
  }

  function finishAudioRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (
      !recorder ||
      recorder.state ===
        "inactive"
    ) {
      return;
    }

    recorder.stop();
    mediaRecorderRef.current =
      null;
  }

  function cancelAudioRecording() {
    cancelRecordingRef.current =
      true;

    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !==
        "inactive"
    ) {
      recorder.stop();
    } else {
      stopRecordingTimer();
      releaseRecordingStream();

      setIsRecordingAudio(false);
      setRecordingSeconds(0);
    }

    mediaRecorderRef.current =
      null;
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setMediaSendProgress(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeSelectedFile(
    fileIndex: number,
  ) {
    setSelectedFiles(
      (currentFiles) =>
        currentFiles.filter(
          (_file, index) =>
            index !== fileIndex,
        ),
    );
  }

  function addSelectedFiles(
    incomingFiles: File[],
  ) {
    if (
      incomingFiles.length === 0
    ) {
      return;
    }

    setErrorMessage("");

    setSelectedFiles(
      (currentFiles) => {
        const existingKeys =
          new Set(
            currentFiles.map(
              (file) =>
                `${file.name}|${file.size}|${file.lastModified}`,
            ),
          );

        const uniqueIncomingFiles =
          incomingFiles.filter(
            (file) => {
              const key =
                `${file.name}|${file.size}|${file.lastModified}`;

              if (existingKeys.has(key)) {
                return false;
              }

              existingKeys.add(key);
              return true;
            },
          );

        const combinedFiles = [
          ...currentFiles,
          ...uniqueIncomingFiles,
        ];

        if (
          combinedFiles.length >
          MAX_ATTACHMENTS
        ) {
          setErrorMessage(
            `Você pode enviar até ${MAX_ATTACHMENTS} arquivos por vez.`,
          );
        }

        return combinedFiles.slice(
          0,
          MAX_ATTACHMENTS,
        );
      },
    );
  }

  function handlePaste(
    event: ClipboardEvent<HTMLTextAreaElement>,
  ) {
    const clipboardItems =
      Array.from(
        event.clipboardData.items,
      );

    const pastedFiles =
      clipboardItems
        .filter(
          (item) =>
            item.kind === "file",
        )
        .map((item) =>
          item.getAsFile(),
        )
        .filter(
          (file): file is File =>
            file instanceof File,
        );

    if (
      pastedFiles.length === 0
    ) {
      return;
    }

    event.preventDefault();

    const normalizedFiles =
      pastedFiles.map(
        (file, index) => {
          if (
            file.name &&
            file.name !== "image.png"
          ) {
            return file;
          }

          const extension =
            file.type === "image/jpeg"
              ? "jpg"
              : file.type === "image/webp"
                ? "webp"
                : "png";

          return new File(
            [file],
            `imagem-colada-${Date.now()}-${index + 1}.${extension}`,
            {
              type:
                file.type ||
                "image/png",
              lastModified:
                Date.now(),
            },
          );
        },
      );

    addSelectedFiles(
      normalizedFiles,
    );
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addSelectedFiles(
      Array.from(
        event.target.files ?? [],
      ),
    );

    event.target.value = "";
  }

  function hasDraggedFiles(
    event: DragEvent<HTMLElement>,
  ) {
    return Array.from(
      event.dataTransfer.types,
    ).includes("Files");
  }

  function handleDragEnter(
    event: DragEvent<HTMLElement>,
  ) {
    if (
      !selectedChat ||
      !hasDraggedFiles(event)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(
    event: DragEvent<HTMLElement>,
  ) {
    if (
      !selectedChat ||
      !hasDraggedFiles(event)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect =
      "copy";
  }

  function handleDragLeave(
    event: DragEvent<HTMLElement>,
  ) {
    if (
      !selectedChat ||
      !hasDraggedFiles(event)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current =
      Math.max(
        0,
        dragDepthRef.current - 1,
      );

    if (
      dragDepthRef.current === 0
    ) {
      setIsDraggingFiles(false);
    }
  }

  function handleDrop(
    event: DragEvent<HTMLElement>,
  ) {
    if (!selectedChat) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDraggingFiles(false);

    addSelectedFiles(
      Array.from(
        event.dataTransfer.files,
      ),
    );
  }

  async function handleSendMedia() {
    if (
      !selectedChat ||
      selectedFiles.length === 0 ||
      isSending ||
      isSendingMedia
    ) {
      return;
    }

    const filesToSend = [
      ...selectedFiles,
    ];

    const failedFiles: File[] = [];
    const caption = text.trim();
    const selectedReply =
      replyMessage;
    let captionSent = false;

    setIsSendingMedia(true);
    setMediaSendProgress({
      current: 1,
      total: filesToSend.length,
    });
    setErrorMessage("");

    try {
      for (
        let index = 0;
        index < filesToSend.length;
        index += 1
      ) {
        const file =
          filesToSend[index];

        setMediaSendProgress({
          current: index + 1,
          total: filesToSend.length,
        });

        try {
          const formData =
            new FormData();

          formData.append(
            "remoteJid",
            getRecipient(
              selectedChat,
            ),
          );

          formData.append(
            "mediatype",
            getMediaType(file),
          );

          formData.append(
            "file",
            file,
            file.name,
          );

          if (
            getMediaType(file) ===
              "audio" &&
            file.name.startsWith(
              "audio-gravado-",
            )
          ) {
            formData.append(
              "ptt",
              "true",
            );
          }

          if (
            caption &&
            !captionSent
          ) {
            formData.append(
              "caption",
              caption,
            );
          }

          if (selectedReply) {
            const quotedId =
              selectedReply.key.id ||
              selectedReply.id;

            if (quotedId) {
              formData.append(
                "quotedKey",
                JSON.stringify({
                  id: quotedId,
                  remoteJid:
                    selectedReply.key.remoteJid,
                  remoteJidAlt:
                    selectedReply.key.remoteJidAlt,
                  fromMe:
                    selectedReply.key.fromMe,
                  participant:
                    selectedReply.key.participant,
                }),
              );

              formData.append(
                "quotedMessage",
                JSON.stringify(
                  selectedReply.message,
                ),
              );
            }
          }

          const response =
            await fetch(
              "/api/chat/send-media",
              {
                method: "POST",
                body: formData,
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                `Não foi possível enviar ${file.name}.`,
            );
          }

          if (
            caption &&
            !captionSent
          ) {
            captionSent = true;
          }
        } catch (fileError) {
          console.error(
            `Erro ao enviar ${file.name}:`,
            fileError,
          );

          failedFiles.push(file);
        }
      }

      setSelectedFiles(
        failedFiles,
      );

      if (failedFiles.length === 0) {
        setText("");
        setReplyMessage(null);
      }

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      await loadMessages(
        selectedChat,
        false,
      );

      if (
        failedFiles.length > 0
      ) {
        setErrorMessage(
          `${failedFiles.length} arquivo(s) não foram enviados e permaneceram selecionados para nova tentativa.`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar os arquivos.",
      );
    } finally {
      setMediaSendProgress(null);
      setIsSendingMedia(false);
    }
  }

  async function handleSend() {
    if (selectedFiles.length > 0) {
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

    const selectedReply =
      replyMessage;

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
            ...(replyMessage
              ? {
                  quotedKey: {
                    id:
                      replyMessage.key.id ||
                      replyMessage.id,
                    remoteJid:
                      replyMessage.key
                        .remoteJid,
                    remoteJidAlt:
                      replyMessage.key
                        .remoteJidAlt,
                    fromMe:
                      replyMessage.key
                        .fromMe,
                    participant:
                      replyMessage.key
                        .participant,
                  },
                  quotedMessage:
                    replyMessage.message,
                }
              : {}),
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
        m1mAuthor: {
          type: "HUMAN",
          id: null,
          name: "Você",
        },
        messageType:
          "conversation",
        messageTimestamp:
          Math.floor(
            Date.now() / 1000,
          ),
        message: {
          conversation:
            messageText,
          ...(selectedReply
            ? {
                extendedTextMessage: {
                  text:
                    messageText,
                  contextInfo: {
                    stanzaId:
                      selectedReply.id,
                    remoteJid:
                      selectedReply.key
                        .remoteJid,
                    participant:
                      selectedReply.key
                        .participant,
                    quotedMessage:
                      selectedReply.message,
                  },
                },
              }
            : {}),
        },
      };

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          sentMessage,
        ],
      );

      setText("");
      setReplyMessage(null);
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
      <style jsx global>{`
        @keyframes m1mMessageEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .m1m-message-enter {
          animation: m1mMessageEnter 180ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .m1m-message-enter {
            animation: none;
          }
        }
      `}</style>
      <div className="w-[380px] shrink-0">
        <ChatConversationSidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoadingChats}
        isLoadingMore={isLoadingMoreChats}
        hasMore={hasMoreChats}
        onLoadMore={loadMoreChats}
        items={conversationSidebarItems}
        />
      </div>

      <section
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f7f8]"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedChat ? (
          <>
            <ChatConversationHeader
              customerName={getChatName(
                selectedChat,
                contactsMap,
              )}
              phone={getCustomerPhone(
                selectedChat,
              )}
              company={
                selectedChat.crmCompany ||
                null
              }
              responsible={
                selectedChat.crmResponsible ||
                null
              }
              attendanceStatus={
                selectedChat.attendanceState ||
                selectedChat.crmStatus ||
                null
              }
              attendanceId={
                selectedChat.attendanceId ||
                null
              }
              attendanceState={
                selectedChat.attendanceState ||
                null
              }
              attendanceSectorId={
                selectedChat.attendanceSectorId ||
                null
              }
              attendanceSectorName={
                selectedChat.attendanceSectorName ||
                null
              }
              customerId={
                selectedChat.crmCustomerId ||
                null
              }
              responsibleId={
                selectedChat.attendanceResponsibleId ||
                null
              }
              onAttendanceChanged={async () => {
                await loadChats(false, "refresh");
              }}
              lastInteraction={
                selectedChat.updatedAt ||
                null
              }
              isSearchOpen={
                isConversationSearchOpen
              }
              searchQuery={
                conversationSearchQuery
              }
              searchInputRef={
                conversationSearchInputRef
              }
              matchCount={
                conversationSearchMatches.length
              }
              activeMatchIndex={
                activeConversationMatchIndex
              }
              onSearchQueryChange={
                setConversationSearchQuery
              }
              onSearchKeyDown={(event) => {
                if (
                  event.key === "Escape"
                ) {
                  closeConversationSearch();
                }

                if (
                  event.key === "Enter"
                ) {
                  if (event.shiftKey) {
                    goToPreviousConversationMatch();
                  } else {
                    goToNextConversationMatch();
                  }
                }
              }}
              onOpenSearch={
                openConversationSearch
              }
              onCloseSearch={
                closeConversationSearch
              }
              onPreviousMatch={
                goToPreviousConversationMatch
              }
              onNextMatch={
                goToNextConversationMatch
              }
              isCustomerPanelOpen={
                isCustomerQuickPanelOpen
              }
              onToggleCustomerPanel={() =>
                setIsCustomerQuickPanelOpen(
                  (current) => !current,
                )
              }
            />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 lg:px-5">
              {isLoadingMessages ? (
                <p className="text-sm text-black/45">
                  Carregando mensagens...
                </p>
              ) : reactionData
                  .visibleMessages
                  .length === 0 ? (
                <p className="text-sm text-black/45">
                  Nenhuma mensagem
                  encontrada.
                </p>
              ) : (
                reactionData
                  .visibleMessages
                  .map(
                  (message, messageIndex) => {
                    const isFromMe =
                      message.key
                        .fromMe;

                    const messageId =
                      message.key.id ||
                      message.id;

                    const isConversationMatch =
                      conversationSearchMatches.includes(
                        messageId,
                      );

                    const isActiveConversationMatch =
                      activeConversationMatchId ===
                      messageId;

                    const previousMessage =
                      messageIndex > 0
                        ? reactionData
                            .visibleMessages[
                            messageIndex - 1
                          ]
                        : null;

                    const previousDate =
                      previousMessage
                        ? getMessageDate(
                            previousMessage
                              .messageTimestamp,
                          )
                        : null;

                    const currentDate =
                      getMessageDate(
                        message.messageTimestamp,
                      );

                    const isGroupedWithPrevious =
                      Boolean(
                        previousMessage &&
                          previousMessage.key
                            .fromMe ===
                            message.key.fromMe &&
                          isSameConversationDay(
                            previousMessage
                              .messageTimestamp,
                            message
                              .messageTimestamp,
                          ) &&
                          previousDate &&
                          !Number.isNaN(
                            previousDate.getTime(),
                          ) &&
                          !Number.isNaN(
                            currentDate.getTime(),
                          ) &&
                          currentDate.getTime() -
                            previousDate.getTime() <=
                            5 * 60 * 1000,
                      );

                    const shouldShowDaySeparator =
                      !previousMessage ||
                      !isSameConversationDay(
                        previousMessage
                          .messageTimestamp,
                        message.messageTimestamp,
                      );

                    const messageText =
                      getMessageText(message);

                    const isPlainTextMessage =
                      message.messageType ===
                        "conversation" ||
                      message.messageType ===
                        "extendedTextMessage" ||
                      Boolean(
                        message.message
                          ?.conversation,
                      );

                    const isMediaMessage =
                      message.messageType ===
                        "imageMessage" ||
                      message.messageType ===
                        "videoMessage" ||
                      message.messageType ===
                        "audioMessage" ||
                      message.messageType ===
                        "documentMessage";

                    const smartWidthClass =
                      isPlainTextMessage &&
                      messageText.length >= 80
                        ? "w-[70%] max-w-[760px]"
                        : isPlainTextMessage &&
                            messageText.length >=
                              28
                          ? "min-w-[280px] max-w-[70%]"
                          : "max-w-[88%]";

                    const messageReactions =
                      reactionData
                        .reactionsByMessageId
                        .get(
                          messageId,
                        ) || [];

                    const reactionCounts =
                      Array.from(
                        messageReactions.reduce(
                          (
                            counts,
                            emoji,
                          ) => {
                            counts.set(
                              emoji,
                              (counts.get(
                                emoji,
                              ) || 0) + 1,
                            );

                            return counts;
                          },
                          new Map<
                            string,
                            number
                          >(),
                        ),
                      );

                    const messageAuthorLabel =
                      isFromMe
                        ? message.m1mAuthor
                            ?.type === "AI"
                          ? "IA"
                          : message
                                .m1mAuthor
                                ?.type ===
                              "HUMAN"
                            ? message
                                .m1mAuthor
                                ?.name ||
                              "Atendente"
                            : null
                        : null;

                    return (
                      <div
                        key={message.id}
                        className={
                          isGroupedWithPrevious
                            ? "-mt-2"
                            : ""
                        }
                      >
                        {shouldShowDaySeparator && (
                          <div className="my-5 flex items-center gap-3">
                            <div className="h-px flex-1 bg-black/[0.06]" />

                            <span className="rounded-full border border-black/[0.07] bg-white px-3 py-1 text-[10px] font-bold text-black/40 shadow-sm">
                              {formatConversationDay(
                                message.messageTimestamp,
                              )}
                            </span>

                            <div className="h-px flex-1 bg-black/[0.06]" />
                          </div>
                        )}

                        <div
                          ref={(element) => {
                          if (element) {
                            messageElementRefs.current.set(
                              messageId,
                              element,
                            );
                          } else {
                            messageElementRefs.current.delete(
                              messageId,
                            );
                          }
                        }}
                        className={`m1m-message-enter group flex items-start gap-2 rounded-2xl transition ${
                          isActiveConversationMatch
                            ? "bg-amber-200/55 ring-4 ring-amber-200/35"
                            : isConversationMatch
                              ? "bg-amber-100/35"
                              : ""
                        } ${
                          isFromMe
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {!isFromMe && (
                          <div className="mt-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                            <MessageContextMenu
                              message={message}
                              text={getMessageText(
                                message,
                              )}
                              side="left"
                              onDeleted={
                                handleMessageDeleted
                              }
                              onEdited={
                                handleMessageEdited
                              }
                              onNotice={
                                showActionNotice
                              }
                              onReply={
                                handleReplyMessage
                              }
                              onForward={
                                handleForwardMessage
                              }
                              onReact={
                                handleReactMessage
                              }
                              onOpenReactionPicker={
                                openReactionEmojiPicker
                              }
                            />
                          </div>
                        )}

                        <div
                          className={`relative ${smartWidthClass} rounded-[18px] border border-[rgba(15,23,42,0.05)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ${
                            isMediaMessage
                              ? "p-1.5"
                              : "px-3.5 py-2.5"
                          } ${
                            reactionCounts.length >
                            0
                              ? "mb-4"
                              : ""
                          } ${
                            isFromMe
                              ? "rounded-br-md bg-[#f5f6f7] text-[#191919]"
                              : "rounded-bl-md bg-white text-[#191919]"
                          }`}
                        >
                          {isFromMe &&
                            messageAuthorLabel && (
                              <p className="mb-1 text-right text-[10px] font-semibold text-black/45">
                                {
                                  messageAuthorLabel
                                }
                              </p>
                            )}

                          {!isFromMe &&
                            !isGroupedWithPrevious &&
                            message.pushName && (
                              <p className="mb-1 text-xs font-semibold text-[#087B7B]">
                                {
                                  message.pushName
                                }
                              </p>
                            )}

                          <MessageRenderer
                            message={
                              message
                            }
                            galleryMessages={
                              reactionData.visibleMessages.filter(
                                (item) =>
                                  item.messageType ===
                                    "imageMessage" ||
                                  item.messageType ===
                                    "videoMessage",
                              )
                            }
                            onForward={
                              handleForwardMessage
                            }
                            onQuotedMessageClick={
                              handleQuotedMessageClick
                            }
                          />

                          <p
                            className={`mt-1 text-right text-[10px] ${
                              isFromMe
                                ? "text-black/30"
                                : "text-black/35"
                            }`}
                          >
                            {formatTime(
                              message.messageTimestamp,
                            )}
                          </p>

                          {reactionCounts.length >
                            0 && (
                            <div
                              className={`absolute -bottom-4 flex max-w-[calc(100%-12px)] flex-wrap items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 shadow-sm ${
                                isFromMe
                                  ? "right-2"
                                  : "left-2"
                              }`}
                              title="Reações da mensagem"
                            >
                              {reactionCounts.map(
                                ([
                                  emoji,
                                  count,
                                ]) => (
                                  <span
                                    key={
                                      emoji
                                    }
                                    className="inline-flex items-center gap-0.5 text-sm leading-none"
                                  >
                                    <span>
                                      {
                                        emoji
                                      }
                                    </span>

                                    {count >
                                      1 && (
                                      <span className="text-[10px] font-semibold text-black/45">
                                        {
                                          count
                                        }
                                      </span>
                                    )}
                                  </span>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        {isFromMe && (
                          <div className="mt-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                            <MessageContextMenu
                              message={message}
                              text={getMessageText(
                                message,
                              )}
                              side="right"
                              onDeleted={
                                handleMessageDeleted
                              }
                              onEdited={
                                handleMessageEdited
                              }
                              onNotice={
                                showActionNotice
                              }
                              onReply={
                                handleReplyMessage
                              }
                              onForward={
                                handleForwardMessage
                              }
                              onReact={
                                handleReactMessage
                              }
                              onOpenReactionPicker={
                                openReactionEmojiPicker
                              }
                            />
                          </div>
                        )}
                        </div>
                      </div>
                    );
                  },
                )
              )}

              <div
                ref={messagesEndRef}
              />
              {showScrollToBottomButton && (
                <button
                  type="button"
                  onClick={() =>
                    scrollToBottom("smooth")
                  }
                  aria-label="Ir para a mensagem mais recente"
                  title="Ir para a mensagem mais recente"
                  className="fixed bottom-24 right-8 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/65 shadow-lg transition hover:bg-[#F7F7F7] hover:text-black"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>

            <footer className="shrink-0 border-t border-black/5 bg-white p-4">
              {replyMessage && (
                <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[#0A9090]/20 bg-[#F6FBFB] px-4 py-3">
                  <div className="mt-0.5 h-full min-h-12 w-1 shrink-0 rounded-full bg-[#0A9090]" />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#087B7B]">
                      Respondendo a{" "}
                      {replyMessage.key.fromMe
                        ? "Você"
                        : replyMessage.pushName?.trim() ||
                          getChatName(
                            selectedChat,
                            contactsMap,
                          )}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-black/55">
                      {getMessageText(
                        replyMessage,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cancelReplyMessage}
                    aria-label="Cancelar resposta"
                    title="Cancelar resposta"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-black/40 transition hover:bg-black/[0.05] hover:text-black"
                  >
                    ×
                  </button>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="mb-3 rounded-2xl border border-[#0A9090]/20 bg-[#F6FBFB] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#191919]">
                        📎 {selectedFiles.length}{" "}
                        {selectedFiles.length === 1
                          ? "arquivo selecionado"
                          : "arquivos selecionados"}
                      </p>

                      <p className="mt-1 text-xs text-black/45">
                        Limite de {MAX_ATTACHMENTS} arquivos por envio
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={
                        isSending ||
                        isSendingMedia ||
                        selectedFiles.length >=
                          MAX_ATTACHMENTS
                      }
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#0A9090]/25 bg-[#ECF8F8] px-3 text-xs font-bold text-[#087B7B] transition hover:border-[#0A9090]/40 hover:bg-[#D9F1F1] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-base leading-none">
                        +
                      </span>
                      Adicionar mais
                    </button>
                  </div>

                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {selectedFiles.map(
                      (file, fileIndex) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}-${fileIndex}`}
                          className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3 py-2.5"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECF8F8] text-base">
                            {getMediaType(file) ===
                            "image"
                              ? "🖼️"
                              : getMediaType(file) ===
                                  "video"
                                ? "🎥"
                                : getMediaType(file) ===
                                    "audio"
                                  ? "🎵"
                                  : "📄"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#191919]">
                              {file.name}
                            </p>

                            <p className="mt-0.5 text-xs text-black/40">
                              {formatFileSize(
                                file.size,
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelectedFile(
                                fileIndex,
                              )
                            }
                            disabled={isSendingMedia}
                            aria-label={`Remover ${file.name}`}
                            title="Remover arquivo"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-[#087B7B] transition hover:bg-[#0A9090]/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>

                  {mediaSendProgress && (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#087B7B]">
                      Enviando{" "}
                      {mediaSendProgress.current} de{" "}
                      {mediaSendProgress.total}...
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={clearSelectedFiles}
                    disabled={isSendingMedia}
                    className="mt-3 text-xs font-semibold text-black/45 transition hover:text-[#087B7B] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remover todos
                  </button>
                </div>
              )}

              <div className="flex min-h-14 items-center gap-1 rounded-full border border-black/10 bg-white px-2 shadow-sm">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="order-2 shrink-0">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={() => {
                      const nextOpen =
                        !isEmojiPickerOpen;

                      setIsEmojiPickerOpen(
                        nextOpen,
                      );

                      setEmojiSearch("");
                      setReactionPickerMessage(
                        null,
                      );
                      setReactionPickerAnchor(
                        null,
                      );

                      if (nextOpen) {
                        window.requestAnimationFrame(
                          updateEmojiPickerPosition,
                        );
                      }
                    }}
                    disabled={
                      isSending ||
                      isSendingMedia
                    }
                    aria-label="Abrir seletor de emojis"
                    title="Emojis"
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-black/65 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isEmojiPickerOpen
                        ? "bg-black/[0.06] text-[#087B7B]"
                        : "hover:bg-black/[0.05] hover:text-[#087B7B]"
                    }`}
                  >
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
                  </button>
                </div>

                {isEmojiPickerOpen &&
                  typeof document !==
                    "undefined" &&
                  createPortal(
                    <div
                      ref={emojiPickerRef}
                      style={{
                        position: "fixed",
                        left:
                          emojiPickerPosition.left,
                        bottom:
                          emojiPickerPosition.bottom,
                        zIndex: 10000,
                        width: "360px",
                        maxHeight: "430px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        borderRadius: "18px",
                        border:
                          "1px solid rgba(0,0,0,0.10)",
                        background: "#ffffff",
                        boxShadow:
                          "0 24px 60px rgba(0,0,0,0.20)",
                      }}
                    >
                      <div
                        style={{
                          flex: "0 0 auto",
                          padding: "12px",
                          borderBottom:
                            "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <input
                          type="search"
                          autoFocus
                          value={emojiSearch}
                          onChange={(event) =>
                            setEmojiSearch(
                              event.target.value,
                            )
                          }
                          placeholder={
                            reactionPickerMessage
                              ? "Pesquisar reação"
                              : "Pesquisar emoji"
                          }
                          style={{
                            width: "100%",
                            height: "40px",
                            boxSizing:
                              "border-box",
                            borderRadius:
                              "12px",
                            border:
                              "1px solid rgba(0,0,0,0.10)",
                            background:
                              "#fafafa",
                            padding:
                              "0 12px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          minHeight: 0,
                          flex: "1 1 auto",
                          overflowY: "auto",
                          padding: "12px",
                        }}
                      >
                        {filteredEmojiGroups.map(
                          (group) => (
                            <section
                              key={group.id}
                              style={{
                                marginBottom:
                                  "16px",
                              }}
                            >
                              <p
                                style={{
                                  margin:
                                    "0 0 8px",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    700,
                                  letterSpacing:
                                    "0.12em",
                                  textTransform:
                                    "uppercase",
                                  color:
                                    "rgba(0,0,0,0.38)",
                                }}
                              >
                                {group.label}
                              </p>

                              {group.emojis.length >
                              0 ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(8, 36px)",
                                    gap: "4px",
                                    justifyContent:
                                      "space-between",
                                  }}
                                >
                                  {group.emojis.map(
                                    (
                                      emoji,
                                      index,
                                    ) => (
                                      <button
                                        key={`${group.id}-${emoji}-${index}`}
                                        type="button"
                                        onClick={() => {
                                          void selectEmoji(
                                            emoji,
                                          );
                                        }}
                                        style={{
                                          width:
                                            "36px",
                                          height:
                                            "36px",
                                          display:
                                            "flex",
                                          alignItems:
                                            "center",
                                          justifyContent:
                                            "center",
                                          padding: 0,
                                          border: 0,
                                          borderRadius:
                                            "9px",
                                          background:
                                            "transparent",
                                          fontSize:
                                            "21px",
                                          lineHeight:
                                            1,
                                          cursor:
                                            "pointer",
                                        }}
                                        onMouseEnter={(
                                          event,
                                        ) => {
                                          event.currentTarget.style.background =
                                            "rgba(0,0,0,0.05)";
                                        }}
                                        onMouseLeave={(
                                          event,
                                        ) => {
                                          event.currentTarget.style.background =
                                            "transparent";
                                        }}
                                        title={emoji}
                                      >
                                        {emoji}
                                      </button>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p
                                  style={{
                                    margin: 0,
                                    borderRadius:
                                      "12px",
                                    background:
                                      "rgba(0,0,0,0.025)",
                                    padding:
                                      "16px 12px",
                                    textAlign:
                                      "center",
                                    fontSize:
                                      "12px",
                                    color:
                                      "rgba(0,0,0,0.42)",
                                  }}
                                >
                                  Nenhum emoji encontrado.
                                </p>
                              )}
                            </section>
                          ),
                        )}
                      </div>
                    </div>,
                    document.body,
                  )}

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    isSending ||
                    isSendingMedia ||
                    isRecordingAudio
                  }
                  aria-label="Selecionar arquivo"
                  title="Anexar arquivo"
                  className="order-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black/65 transition hover:bg-black/[0.05] hover:text-[#087B7B] disabled:cursor-not-allowed disabled:opacity-40"
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

                {isRecordingAudio ? (
                  <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-55" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">
                        Gravando
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-red-700">
                        {formatRecordingTime(
                          recordingSeconds,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancelAudioRecording}
                      title="Cancelar gravação"
                      aria-label="Cancelar gravação"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-base transition hover:bg-red-100"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="h-4 w-4"
                      >
                        <path
                          d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={finishAudioRecording}
                      title="Finalizar gravação"
                      aria-label="Finalizar gravação"
                      className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Parar
                    </button>
                  </div>
                ) : (
                  <>
                    {!text.trim() &&
                      selectedFiles.length ===
                        0 && (
                      <button
                        type="button"
                        onClick={startAudioRecording}
                        disabled={
                          isSending ||
                          isSendingMedia
                        }
                        aria-label="Gravar mensagem de áudio"
                        title="Gravar áudio"
                        className="order-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black/70 transition hover:bg-black/[0.05] hover:text-[#087B7B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="h-5 w-5"
                        >
                          <rect
                            x="9"
                            y="3"
                            width="6"
                            height="11"
                            rx="3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}

                    <textarea
                  ref={messageInputRef}
                  rows={1}
                  value={text}
                  onChange={(event) =>
                    setText(
                      event.target.value,
                    )
                  }
                  onPaste={handlePaste}
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
                    isSendingMedia ||
                    isRecordingAudio
                  }
                  placeholder={
                    selectedFiles.length > 0
                      ? "Adicione uma legenda (opcional)..."
                      : "Digite sua mensagem ou cole uma imagem..."
                  }
                  className="order-3 min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-black/40 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </>
                )}

                {(text.trim() ||
                  selectedFiles.length >
                    0) && (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={
                      isSending ||
                      isSendingMedia ||
                      isRecordingAudio
                    }
                    aria-label="Enviar mensagem"
                    title={
                      mediaSendProgress
                        ? `Enviando ${mediaSendProgress.current} de ${mediaSendProgress.total}`
                        : "Enviar mensagem"
                    }
                    className="order-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A9090] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <path
                        d="m4 5 16 7-16 7 3-7-3-7Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 12h13"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-black/45">
            Selecione uma conversa.
          </div>
        )}

        {selectedChat &&
          isDraggingFiles && (
            <div className="pointer-events-none absolute inset-4 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-[#0A9090]/55 bg-white/95 shadow-2xl backdrop-blur-sm">
              <div className="max-w-md px-8 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECF8F8] text-[#087B7B]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-8 w-8"
                  >
                    <path
                      d="M12 16V5M8 9l4-4 4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <h3 className="mt-5 text-lg font-bold text-[#191919]">
                  Solte os arquivos para anexar
                </h3>

                <p className="mt-2 text-sm leading-6 text-black/45">
                  Imagens, vídeos, áudios, PDFs e outros documentos serão adicionados ao envio.
                </p>

                <p className="mt-3 text-xs font-semibold text-[#087B7B]">
                  Até {MAX_ATTACHMENTS} arquivos por vez
                </p>
              </div>
            </div>
          )}

        {forwardMessage &&
          typeof document !==
            "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-[25000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
              onMouseDown={(event) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  cancelForwardMessage();
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Encaminhar mensagem"
                style={{
                  width: "440px",
                  maxWidth:
                    "calc(100vw - 32px)",
                  height: "620px",
                  maxHeight:
                    "calc(100vh - 32px)",
                }}
                className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-[#191919]">
                      Encaminhar mensagem
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={cancelForwardMessage}
                    disabled={isForwarding}
                    aria-label="Fechar encaminhamento"
                    className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-black/45 transition hover:bg-black/[0.05] hover:text-black disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>

                <div className="shrink-0 border-b border-black/10 p-4">
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-black/10 bg-white px-4 transition focus-within:border-[#0A9090] focus-within:ring-4 focus-within:ring-[#0A9090]/10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-black/35"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="m16 16 4 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>

                    <input
                      id="forward-search"
                      type="search"
                      value={forwardSearch}
                      onChange={(event) =>
                        setForwardSearch(
                          event.target.value,
                        )
                      }
                      autoFocus
                      placeholder="Buscar contato ou conversa..."
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                  {forwardChats.length ===
                  0 ? (
                    <p className="px-4 py-8 text-center text-sm text-black/40">
                      Nenhuma conversa encontrada.
                    </p>
                  ) : (
                    forwardChats.map(
                      (chat) => {
                        const chatName =
                          getChatName(
                            chat,
                            contactsMap,
                          );

                        const picture =
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
                              forwardMessageToChat(
                                chat,
                              )
                            }
                            disabled={isForwarding}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#ECF8F8] disabled:cursor-wait disabled:opacity-50"
                          >
                            {picture ? (
                              <img
                                src={picture}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECF8F8] font-bold text-[#087B7B]">
                                {chatName.charAt(
                                  0,
                                )}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#191919]">
                                {chatName}
                              </p>

                              <p className="mt-1 truncate text-xs text-black/40">
                                {getCustomerPhone(
                                  chat,
                                )}
                              </p>
                            </div>

                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECF8F8] text-base text-[#087B7B]">
                              ↪
                            </span>
                          </button>
                        );
                      },
                    )
                  )}
                </div>

                <div className="shrink-0 border-t border-black/10 px-5 py-3 text-center text-xs text-black/40">
                  {isForwarding
                    ? "Encaminhando..."
                    : `${forwardChats.length} conversa(s) encontrada(s)`}
                </div>
              </div>
            </div>,
            document.body,
          )}

        {actionNotice && (
          <div className="absolute bottom-20 left-1/2 z-[120] -translate-x-1/2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
            {actionNotice}
          </div>
        )}

        {errorMessage && (
          <div className="absolute bottom-20 right-4 z-20 m-4 max-w-md rounded-xl bg-red-50 p-3 text-sm text-red-700 shadow-lg">
            {errorMessage}
          </div>
        )}
      </section>

      {selectedChat &&
        isCustomerQuickPanelOpen && (
        <ChatCustomerQuickPanel
          name={getChatName(
            selectedChat,
            contactsMap,
          )}
          phone={getCustomerPhone(
            selectedChat,
          )}
          company={
            selectedChat.crmCompany ||
            null
          }
          city={
            selectedChat.crmCity ||
            null
          }
          responsible={
            selectedChat.crmResponsible ||
            null
          }
          attendanceStatus={
            selectedChat.attendanceState ||
            selectedChat.crmStatus ||
            null
          }
          customerId={
            selectedChat.crmCustomerId ||
            null
          }
          canAssumeAttendance={
            selectedChat.attendanceState === "HUMANO" &&
            !selectedChat.crmResponsibleId
          }
          onAssigned={async () => {
            await loadChats(false, "refresh");
          }}
          onClose={() =>
            setIsCustomerQuickPanelOpen(
              false,
            )
          }
        />
      )}

    </div>
  );
}



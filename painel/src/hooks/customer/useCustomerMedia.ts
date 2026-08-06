"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ChatMessage } from "@/components/chat/MessageRenderer";

export type MediaCategory =
  | "imageMessage"
  | "audioMessage"
  | "videoMessage"
  | "documentMessage";

export type MediaFilter =
  | "all"
  | MediaCategory;

type UseCustomerMediaParams = {
  isOpen: boolean;
  messages: ChatMessage[];
};

export default function useCustomerMedia({
  isOpen,
  messages,
}: UseCustomerMediaParams) {
  const [
    activeMediaFilter,
    setActiveMediaFilter,
  ] = useState<MediaFilter>("all");

  const [
    selectedImageMessage,
    setSelectedImageMessage,
  ] = useState<ChatMessage | null>(null);

  const [
    selectedAudioMessage,
    setSelectedAudioMessage,
  ] = useState<ChatMessage | null>(null);

  const [
    selectedVideoMessage,
    setSelectedVideoMessage,
  ] = useState<ChatMessage | null>(null);

  const [
    selectedDocumentMessage,
    setSelectedDocumentMessage,
  ] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveMediaFilter("all");
    setSelectedImageMessage(null);
    setSelectedAudioMessage(null);
    setSelectedVideoMessage(null);
    setSelectedDocumentMessage(null);
  }, [isOpen]);

  const mediaMessages = useMemo(
    () =>
      messages
        .filter((message) =>
          [
            "imageMessage",
            "audioMessage",
            "videoMessage",
            "documentMessage",
          ].includes(
            message.messageType || "",
          ),
        )
        .sort(
          (
            firstMessage,
            secondMessage,
          ) =>
            secondMessage.messageTimestamp -
            firstMessage.messageTimestamp,
        ),
    [messages],
  );

  const mediaCounts = useMemo(() => {
    const counts: Record<
      MediaCategory,
      number
    > = {
      imageMessage: 0,
      audioMessage: 0,
      videoMessage: 0,
      documentMessage: 0,
    };

    for (const message of mediaMessages) {
      const messageType =
        message.messageType as MediaCategory;

      if (messageType in counts) {
        counts[messageType] += 1;
      }
    }

    return counts;
  }, [mediaMessages]);

  const mediaCards = useMemo(
    () => [
      {
        label: "Imagens",
        icon: "📷",
        count:
          mediaCounts.imageMessage,
        filter:
          "imageMessage" as const,
      },
      {
        label: "Áudios",
        icon: "🎤",
        count:
          mediaCounts.audioMessage,
        filter:
          "audioMessage" as const,
      },
      {
        label: "Vídeos",
        icon: "🎥",
        count:
          mediaCounts.videoMessage,
        filter:
          "videoMessage" as const,
      },
      {
        label: "Documentos",
        icon: "📄",
        count:
          mediaCounts.documentMessage,
        filter:
          "documentMessage" as const,
      },
    ],
    [mediaCounts],
  );

  const filteredMedia = useMemo(() => {
    if (
      activeMediaFilter === "all"
    ) {
      return mediaMessages;
    }

    return mediaMessages.filter(
      (message) =>
        message.messageType ===
        activeMediaFilter,
    );
  }, [
    activeMediaFilter,
    mediaMessages,
  ]);

  const visibleMedia = useMemo(
    () => filteredMedia.slice(0, 20),
    [filteredMedia],
  );

  const hasOpenViewer = Boolean(
    selectedImageMessage ||
      selectedAudioMessage ||
      selectedVideoMessage ||
      selectedDocumentMessage,
  );

  return {
    activeMediaFilter,
    setActiveMediaFilter,
    selectedImageMessage,
    setSelectedImageMessage,
    selectedAudioMessage,
    setSelectedAudioMessage,
    selectedVideoMessage,
    setSelectedVideoMessage,
    selectedDocumentMessage,
    setSelectedDocumentMessage,
    mediaMessages,
    mediaCards,
    filteredMedia,
    visibleMedia,
    hasOpenViewer,
  };
}

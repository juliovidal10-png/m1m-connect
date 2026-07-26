"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import CustomerAudioPlayer from "./CustomerAudioPlayer";
import CustomerDocumentViewer from "./CustomerDocumentViewer";
import CustomerImageViewer from "./CustomerImageViewer";
import CustomerVideoPlayer from "./CustomerVideoPlayer";
import type { ChatMessage } from "./MessageRenderer";

const DEFAULT_COMPANY_ID = "empresa-teste";

type CustomerPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  remoteJid: string;
  profilePicUrl?: string | null;
  lastInteraction?: string;
  messages?: ChatMessage[];
};

type CustomerTab =
  | "dados"
  | "notas"
  | "etiquetas"
  | "arquivos";

type MediaCategory =
  | "imageMessage"
  | "audioMessage"
  | "videoMessage"
  | "documentMessage";

type MediaFilter = "all" | MediaCategory;

type CustomerRecord = {
  id: string;
  companyId: string;
  remoteJid: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  responsible: string | null;
  observations: string | null;
  status: string | null;
};

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getDocumentName(message: ChatMessage) {
  return (
    message.message?.documentMessage?.fileName?.trim() ||
    message.message?.documentMessage?.title?.trim() ||
    "Documento"
  );
}

function getMediaLabel(message: ChatMessage) {
  if (message.messageType === "imageMessage") {
    return (
      message.message?.imageMessage?.caption?.trim() ||
      "Imagem"
    );
  }

  if (message.messageType === "audioMessage") {
    const seconds =
      message.message?.audioMessage?.seconds;

    return typeof seconds === "number"
      ? `Áudio de ${seconds} segundo${
          seconds === 1 ? "" : "s"
        }`
      : "Áudio";
  }

  if (message.messageType === "videoMessage") {
    return (
      message.message?.videoMessage?.caption?.trim() ||
      "Vídeo"
    );
  }

  if (message.messageType === "documentMessage") {
    return getDocumentName(message);
  }

  return "Arquivo";
}

function getMediaIcon(messageType?: string) {
  if (messageType === "imageMessage") {
    return "📷";
  }

  if (messageType === "audioMessage") {
    return "🎤";
  }

  if (messageType === "videoMessage") {
    return "🎥";
  }

  if (messageType === "documentMessage") {
    return "📄";
  }

  return "📎";
}

function getFilterLabel(filter: MediaFilter) {
  if (filter === "imageMessage") {
    return "Imagens";
  }

  if (filter === "audioMessage") {
    return "Áudios";
  }

  if (filter === "videoMessage") {
    return "Vídeos";
  }

  if (filter === "documentMessage") {
    return "Documentos";
  }

  return "Todos os arquivos";
}

export default function CustomerPanel({
  isOpen,
  onClose,
  name,
  phone,
  remoteJid,
  profilePicUrl,
  lastInteraction,
  messages = [],
}: CustomerPanelProps) {
  const [activeTab, setActiveTab] =
    useState<CustomerTab>("dados");

  const [activeMediaFilter, setActiveMediaFilter] =
    useState<MediaFilter>("all");

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

  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");

  const [responsible, setResponsible] =
    useState("Julinho");

  const [notes, setNotes] = useState("");

  const [
    isLoadingCustomer,
    setIsLoadingCustomer,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    feedbackMessage,
    setFeedbackMessage,
  ] = useState("");

  const [
    feedbackType,
    setFeedbackType,
  ] = useState<"success" | "error" | "">("");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("dados");
      setActiveMediaFilter("all");
      setSelectedImageMessage(null);
      setSelectedAudioMessage(null);
      setSelectedVideoMessage(null);
      setSelectedDocumentMessage(null);
      setFeedbackMessage("");
      setFeedbackType("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !remoteJid) {
      return;
    }

    const controller = new AbortController();

    async function loadCustomer() {
      setIsLoadingCustomer(true);
      setFeedbackMessage("");
      setFeedbackType("");

      setCompany("");
      setCity("");
      setResponsible("Julinho");
      setNotes("");

      try {
        const params = new URLSearchParams({
          companyId: DEFAULT_COMPANY_ID,
          remoteJid,
        });

        const response = await fetch(
          `/api/customers?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar os dados do cliente.",
          );
        }

        const customer =
          data as CustomerRecord | null;

        if (!customer) {
          return;
        }

        setCompany(customer.company || "");
        setCity(customer.city || "");

        setResponsible(
          customer.responsible || "Julinho",
        );

        setNotes(customer.observations || "");
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setFeedbackType("error");

        setFeedbackMessage(
          error instanceof Error
            ? error.message
            : "Erro ao carregar os dados do cliente.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCustomer(false);
        }
      }
    }

    loadCustomer();

    return () => {
      controller.abort();
    };
  }, [isOpen, remoteJid]);

  useEffect(() => {
    if (
      !isOpen ||
      selectedImageMessage ||
      selectedAudioMessage ||
      selectedVideoMessage ||
      selectedDocumentMessage
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    isOpen,
    onClose,
    selectedImageMessage,
    selectedAudioMessage,
    selectedVideoMessage,
    selectedDocumentMessage,
  ]);

  const mediaMessages = useMemo(
    () =>
      messages
        .filter((message) =>
          [
            "imageMessage",
            "audioMessage",
            "videoMessage",
            "documentMessage",
          ].includes(message.messageType || ""),
        )
        .sort(
          (firstMessage, secondMessage) =>
            secondMessage.messageTimestamp -
            firstMessage.messageTimestamp,
        ),
    [messages],
  );

  const mediaCounts = useMemo(() => {
    const counts: Record<MediaCategory, number> = {
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

  const filteredMedia = useMemo(() => {
    if (activeMediaFilter === "all") {
      return mediaMessages;
    }

    return mediaMessages.filter(
      (message) =>
        message.messageType === activeMediaFilter,
    );
  }, [activeMediaFilter, mediaMessages]);

  const visibleMedia = useMemo(
    () => filteredMedia.slice(0, 20),
    [filteredMedia],
  );

  async function handleSaveCustomer() {
    if (isSaving || !remoteJid) {
      return;
    }

    setIsSaving(true);
    setFeedbackMessage("");
    setFeedbackType("");

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: DEFAULT_COMPANY_ID,
          remoteJid,
          name,
          phone,
          company,
          city,
          responsible,
          observations: notes,
          status: "IA",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível salvar os dados.",
        );
      }

      setFeedbackType("success");
      setFeedbackMessage(
        "Dados do cliente salvos com sucesso.",
      );
    } catch (error) {
      setFeedbackType("error");

      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Erro ao salvar os dados do cliente.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const tabs: Array<{
    id: CustomerTab;
    label: string;
    icon: string;
  }> = [
    {
      id: "dados",
      label: "Dados",
      icon: "👤",
    },
    {
      id: "notas",
      label: "Notas",
      icon: "📝",
    },
    {
      id: "etiquetas",
      label: "Etiquetas",
      icon: "🏷️",
    },
    {
      id: "arquivos",
      label: "Arquivos",
      icon: "📎",
    },
  ];

  const mediaCards: Array<{
    label: string;
    icon: string;
    count: number;
    filter: MediaCategory;
  }> = [
    {
      label: "Imagens",
      icon: "📷",
      count: mediaCounts.imageMessage,
      filter: "imageMessage",
    },
    {
      label: "Áudios",
      icon: "🎤",
      count: mediaCounts.audioMessage,
      filter: "audioMessage",
    },
    {
      label: "Vídeos",
      icon: "🎥",
      count: mediaCounts.videoMessage,
      filter: "videoMessage",
    },
    {
      label: "Documentos",
      icon: "📄",
      count: mediaCounts.documentMessage,
      filter: "documentMessage",
    },
  ];

  return (
    <>
      <div className="absolute inset-0 z-40 flex justify-end bg-black/20">
        <button
          type="button"
          aria-label="Fechar central do cliente"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white shadow-2xl">
          <header className="shrink-0 border-b border-black/5 bg-white">
            <div className="flex h-20 items-center justify-between px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
                  CRM
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Central do cliente
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-xl text-black/45 transition hover:bg-black/[0.03]"
              >
                ×
              </button>
            </div>

            <div className="flex overflow-x-auto px-3">
              {tabs.map((tab) => {
                const isActive =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    className={`relative flex min-w-fit flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition ${
                      isActive
                        ? "text-[#e93800]"
                        : "text-black/40 hover:text-black/70"
                    }`}
                  >
                    <span aria-hidden="true">
                      {tab.icon}
                    </span>

                    {tab.label}

                    {isActive && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ff3d00]" />
                    )}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <section className="border-b border-black/5 p-6">
              <div className="flex items-center gap-4">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#fff1ec] text-xl font-bold text-[#e93800]">
                    {getInitial(name)}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">
                    {name}
                  </h3>

                  <p className="mt-1 text-sm text-black/45">
                    {phone}
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    WhatsApp conectado
                  </span>
                </div>
              </div>
            </section>

            {isLoadingCustomer && (
              <div className="border-b border-black/5 px-6 py-3 text-xs font-medium text-black/40">
                Carregando dados do cliente...
              </div>
            )}

            {feedbackMessage && (
              <div
                className={`mx-6 mt-5 rounded-xl p-3 text-sm ${
                  feedbackType === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {feedbackMessage}
              </div>
            )}

            {activeTab === "dados" && (
              <div className="space-y-5 p-6">
                <section>
                  <label
                    htmlFor="customer-company"
                    className="text-xs font-semibold uppercase tracking-wide text-black/40"
                  >
                    Empresa
                  </label>

                  <input
                    id="customer-company"
                    type="text"
                    value={company}
                    onChange={(event) =>
                      setCompany(event.target.value)
                    }
                    disabled={isLoadingCustomer}
                    placeholder="Nome da empresa"
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:bg-black/[0.03]"
                  />
                </section>

                <section>
                  <label
                    htmlFor="customer-city"
                    className="text-xs font-semibold uppercase tracking-wide text-black/40"
                  >
                    Cidade
                  </label>

                  <input
                    id="customer-city"
                    type="text"
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    disabled={isLoadingCustomer}
                    placeholder="Cidade do cliente"
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:bg-black/[0.03]"
                  />
                </section>

                <section>
                  <label
                    htmlFor="customer-responsible"
                    className="text-xs font-semibold uppercase tracking-wide text-black/40"
                  >
                    Responsável
                  </label>

                  <select
                    id="customer-responsible"
                    value={responsible}
                    onChange={(event) =>
                      setResponsible(
                        event.target.value,
                      )
                    }
                    disabled={isLoadingCustomer}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:bg-black/[0.03]"
                  >
                    <option value="Julinho">
                      Julinho
                    </option>

                    <option value="">
                      Sem responsável
                    </option>
                  </select>
                </section>

                <section className="rounded-xl bg-black/[0.025] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                    Última interação
                  </p>

                  <p className="mt-2 text-sm text-black/60">
                    {lastInteraction ||
                      "Informação indisponível"}
                  </p>
                </section>

                <section className="rounded-xl border border-dashed border-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                    Identificação
                  </p>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-black/40">
                        Telefone
                      </span>

                      <span className="text-right font-medium text-black/70">
                        {phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-black/40">
                        Canal
                      </span>

                      <span className="text-right font-medium text-black/70">
                        WhatsApp
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "notas" && (
              <div className="p-6">
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Estas observações são internas e o
                  cliente não poderá visualizá-las.
                </div>

                <section className="mt-5">
                  <label
                    htmlFor="customer-notes"
                    className="text-xs font-semibold uppercase tracking-wide text-black/40"
                  >
                    Observações
                  </label>

                  <textarea
                    id="customer-notes"
                    rows={10}
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    disabled={isLoadingCustomer}
                    placeholder="Adicione informações importantes sobre este cliente..."
                    className="mt-2 w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#ff3d00] focus:ring-4 focus:ring-[#ff3d00]/10 disabled:bg-black/[0.03]"
                  />
                </section>
              </div>
            )}

            {activeTab === "etiquetas" && (
              <div className="p-6">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                    Etiquetas do cliente
                  </p>

                  <div className="mt-3 flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-black/15 px-5 text-center">
                    <span className="text-3xl">
                      🏷️
                    </span>

                    <p className="mt-3 text-sm font-semibold text-black/65">
                      Nenhuma etiqueta adicionada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-black/40">
                      As etiquetas serão conectadas ao
                      banco em uma próxima etapa.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-4 h-11 w-full rounded-xl border border-[#ff3d00]/25 bg-[#fff1ec] text-sm font-semibold text-[#e93800] transition hover:bg-[#ffe4da]"
                  >
                    + Adicionar etiqueta
                  </button>
                </section>
              </div>
            )}

            {activeTab === "arquivos" && (
              <div className="p-6">
                <div className="rounded-xl border border-black/10 bg-black/[0.015] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Central de arquivos
                      </p>

                      <h3 className="mt-1 text-lg font-bold">
                        {mediaMessages.length} arquivo
                        {mediaMessages.length === 1
                          ? ""
                          : "s"}
                      </h3>
                    </div>

                    <span className="text-4xl">
                      📎
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-black/45">
                    Clique em uma categoria para
                    filtrar os arquivos desta
                    conversa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveMediaFilter("all")
                  }
                  className={`mt-4 w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    activeMediaFilter === "all"
                      ? "border-[#ff3d00] bg-[#fff1ec] text-[#e93800]"
                      : "border-black/10 hover:bg-black/[0.02]"
                  }`}
                >
                  📎 Todos os arquivos

                  <span className="float-right">
                    {mediaMessages.length}
                  </span>
                </button>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {mediaCards.map((card) => {
                    const isSelected =
                      activeMediaFilter === card.filter;

                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() =>
                          setActiveMediaFilter(
                            card.filter,
                          )
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-[#ff3d00] bg-[#fff1ec]"
                            : "border-black/10 hover:bg-black/[0.02]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-2xl">
                            {card.icon}
                          </span>

                          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[#e93800]">
                            {card.count}
                          </span>
                        </div>

                        <p
                          className={`mt-3 text-sm font-semibold ${
                            isSelected
                              ? "text-[#e93800]"
                              : ""
                          }`}
                        >
                          {card.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <section className="mt-7">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold">
                      {getFilterLabel(
                        activeMediaFilter,
                      )}
                    </h4>

                    <span className="text-xs text-black/35">
                      {filteredMedia.length} resultado
                      {filteredMedia.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                  {visibleMedia.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-black/15 p-6 text-center">
                      <span className="text-3xl">
                        📭
                      </span>

                      <p className="mt-3 text-sm font-semibold text-black/60">
                        Nenhum arquivo encontrado
                      </p>

                      <p className="mt-1 text-xs leading-5 text-black/40">
                        Não existem arquivos nesta
                        categoria entre as mensagens
                        carregadas.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {visibleMedia.map((message) => {
                        const isImage =
                          message.messageType ===
                          "imageMessage";

                        const isAudio =
                          message.messageType ===
                          "audioMessage";

                        const isVideo =
                          message.messageType ===
                          "videoMessage";

                        const isDocument =
                          message.messageType ===
                          "documentMessage";

                        const itemContent = (
                          <>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.035] text-xl">
                              {getMediaIcon(
                                message.messageType,
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {getMediaLabel(message)}
                              </p>

                              <p className="mt-1 text-xs text-black/40">
                                {formatMessageTime(
                                  message.messageTimestamp,
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="block text-xs font-semibold text-black/30">
                                {message.key.fromMe
                                  ? "Enviado"
                                  : "Recebido"}
                              </span>

                              <span className="mt-1 block text-[10px] font-semibold text-[#e93800]">
                                Abrir
                              </span>
                            </div>
                          </>
                        );

                        if (isImage) {
                          return (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() =>
                                setSelectedImageMessage(
                                  message,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#ff3d00]/40 hover:bg-[#fff1ec]"
                            >
                              {itemContent}
                            </button>
                          );
                        }

                        if (isAudio) {
                          return (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() =>
                                setSelectedAudioMessage(
                                  message,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#ff3d00]/40 hover:bg-[#fff1ec]"
                            >
                              {itemContent}
                            </button>
                          );
                        }

                        if (isVideo) {
                          return (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() =>
                                setSelectedVideoMessage(
                                  message,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#ff3d00]/40 hover:bg-[#fff1ec]"
                            >
                              {itemContent}
                            </button>
                          );
                        }

                        if (isDocument) {
                          return (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() =>
                                setSelectedDocumentMessage(
                                  message,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#ff3d00]/40 hover:bg-[#fff1ec]"
                            >
                              {itemContent}
                            </button>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-black/5 bg-white p-4">
            <button
              type="button"
              onClick={handleSaveCustomer}
              disabled={
                isSaving ||
                isLoadingCustomer ||
                !remoteJid
              }
              className="h-12 w-full rounded-xl bg-[#ff3d00] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving
                ? "Salvando..."
                : "Salvar alterações"}
            </button>
          </footer>
        </aside>
      </div>

      {selectedImageMessage && (
        <CustomerImageViewer
          message={selectedImageMessage}
          onClose={() =>
            setSelectedImageMessage(null)
          }
        />
      )}

      {selectedAudioMessage && (
        <CustomerAudioPlayer
          message={selectedAudioMessage}
          onClose={() =>
            setSelectedAudioMessage(null)
          }
        />
      )}

      {selectedVideoMessage && (
        <CustomerVideoPlayer
          message={selectedVideoMessage}
          onClose={() =>
            setSelectedVideoMessage(null)
          }
        />
      )}

      {selectedDocumentMessage && (
        <CustomerDocumentViewer
          message={selectedDocumentMessage}
          onClose={() =>
            setSelectedDocumentMessage(null)
          }
        />
      )}
    </>
  );
}
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import CustomerAudioPlayer from "./CustomerAudioPlayer";
import CustomerDocumentViewer from "./CustomerDocumentViewer";
import CustomerImageViewer from "./CustomerImageViewer";
import CustomerVideoPlayer from "./CustomerVideoPlayer";

import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerInformation from "@/components/customer/CustomerInformation";
import CustomerNotes from "@/components/customer/CustomerNotes";
import CustomerReminders from "@/components/customer/CustomerReminders";
import CustomerFiles from "@/components/customer/CustomerFiles";
import CustomerTimeline from "@/components/customer/CustomerTimeline";
import CustomerActions from "@/components/customer/CustomerActions";
import ReceiptPanel from "@/components/layout/ReceiptPanel";
import useCustomer from "@/hooks/customer/useCustomer";
import useCustomerReminders from "@/hooks/customer/useCustomerReminders";
import useCustomerMedia from "@/hooks/customer/useCustomerMedia";
import useCustomerReceipts from "@/hooks/customer/useCustomerReceipts";
import useCustomerTimeline from "@/hooks/customer/useCustomerTimeline";

import type { ChatMessage } from "./MessageRenderer";

type CustomerPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  remoteJid: string;
  profilePicUrl?: string | null;
  lastInteraction?: string;
  messages?: ChatMessage[];
  conversationHref?: string;
  initialTab?: CustomerTab;
};

type CustomerTab =
  | "cliente"
  | "atividades"
  | "arquivos";
type IconName =
  | "user"
  | "folder"
  | "calendar"
  | "note"
  | "message"
  | "activity";

function AppIcon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `${className} shrink-0`,
    width: 16,
    height: 16,
    style: {
      width: 16,
      height: 16,
      minWidth: 16,
      minHeight: 16,
      display: "block",
    },
    "aria-hidden": true,
  };

  if (name === "user") {
    return (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "folder") {
    return (
      <svg {...commonProps}>
        <path d="M3 7.5h6l2 2H21v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
        <path d="M3 7.5V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1.5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (name === "note") {
    return (
      <svg {...commonProps}>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...commonProps}>
        <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
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
  conversationHref,
  initialTab = "cliente",
}: CustomerPanelProps) {
  const [effectivePermissions, setEffectivePermissions] =
    useState<string[]>([]);

  const [
    persistedMessages,
    setPersistedMessages,
  ] = useState<ChatMessage[]>([]);

  const [
    isLoadingPersistedMessages,
    setIsLoadingPersistedMessages,
  ] = useState(false);

  const [
    persistedMessagesError,
    setPersistedMessagesError,
  ] = useState("");

  const effectiveMessages = useMemo(() => {
    const messageMap =
      new Map<string, ChatMessage>();

    for (const message of persistedMessages) {
      const messageKey =
        message.key?.id ||
        message.id;

      messageMap.set(
        messageKey,
        message,
      );
    }

    return Array.from(
      messageMap.values(),
    ).sort(
      (firstMessage, secondMessage) =>
        Number(
          firstMessage.messageTimestamp,
        ) -
        Number(
          secondMessage.messageTimestamp,
        ),
    );
  }, [
    persistedMessages,
  ]);

  useEffect(() => {
    if (!isOpen || !remoteJid) {
      return;
    }

    const controller = new AbortController();

    async function loadPersistedMessages() {
      setIsLoadingPersistedMessages(true);
      setPersistedMessagesError("");

      try {
        const response = await fetch(
          `/api/customer-center/media?remoteJid=${encodeURIComponent(remoteJid)}&phone=${encodeURIComponent(phone)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const contentType =
          response.headers.get("content-type") ?? "";

        if (
          !contentType.includes(
            "application/json",
          )
        ) {
          throw new Error(
            "A rota de mensagens retornou uma resposta invalida.",
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Nao foi possivel carregar as mensagens do cliente.",
          );
        }

        setPersistedMessages(
          Array.isArray(data)
            ? (data as ChatMessage[])
            : [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Erro ao carregar mensagens no Cliente 360:",
          error,
        );

        setPersistedMessages([]);

        setPersistedMessagesError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os arquivos da Central do Cliente.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPersistedMessages(false);
        }
      }
    }

    void loadPersistedMessages();

    return () => {
      controller.abort();
    };
  }, [
    isOpen,
    remoteJid,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEffectivePermissions() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Não foi possível carregar as permissões.",
          );
        }

        setEffectivePermissions(
          Array.isArray(data?.user?.effectivePermissions)
            ? data.user.effectivePermissions
            : Array.isArray(data?.effectivePermissions)
              ? data.effectivePermissions
              : [],
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Erro ao carregar permissões do painel do cliente:",
          error,
        );
        setEffectivePermissions([]);
      }
    }

    void loadEffectivePermissions();

    return () => {
      controller.abort();
    };
  }, []);

  const canAssumeAttendance =
    effectivePermissions.includes("ASSUME_ATTENDANCE");

  const canEditCrm =
    effectivePermissions.includes("EDIT_CRM");
  const [activeTab, setActiveTab] =
    useState<CustomerTab>("cliente");

  const [
    selectedReceiptId,
    setSelectedReceiptId,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab(initialTab);
  }, [
    isOpen,
    initialTab,
  ]);

  const {
    customerId,
    customerCode,
    company,
    setCompany,
    city,
    setCity,
    responsible,
    setResponsible,
    responsibleId,
    setResponsibleId,
    attendanceStatus,
    notes,
    setNotes,
    isLoadingCustomer,
    isSaving,
    isAssigning,
    feedbackMessage,
    feedbackType,
    clearFeedback,
    showSuccess,
    showError,
    saveCustomerRecord,
    handleSaveCustomer,
    handleAssignResponsible,
  } = useCustomer({
    isOpen,
    remoteJid,
    name,
    phone,
  });

  const {
    reminders,
    reminderTitle,
    setReminderTitle,
    reminderDescription,
    setReminderDescription,
    reminderDate,
    setReminderDate,
    reminderTime,
    setReminderTime,
    reminderResponsible,
    setReminderResponsible,
    isLoadingReminders,
    isSavingReminder,
    completingReminderId,
    handleCreateReminder,
    handleCompleteReminder,
  } = useCustomerReminders({
    isOpen,
    customerId,
    responsible,
    saveCustomerRecord,
    clearFeedback,
    showSuccess,
    showError,
  });

  const {
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
  } = useCustomerMedia({
    isOpen,
    messages: effectiveMessages,
  });

  const {
    receipts,
    isLoadingReceipts,
    receiptsError,
    reloadReceipts,
  } = useCustomerReceipts({
    isOpen,
    customerId,
  });

  const {
    timelineItems,
    timelineTotal,
    isLoadingTimeline,
    timelineError,
    reloadTimeline,
  } = useCustomerTimeline({
    isOpen:
      isOpen &&
      activeTab === "atividades",
    customerId,
  });

  useEffect(() => {
    if (
      !isOpen ||
      hasOpenViewer ||
      Boolean(selectedReceiptId)
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
    hasOpenViewer,
    selectedReceiptId,
  ]);

  if (!isOpen) {
    return null;
  }

  const tabs: Array<{
    id: CustomerTab;
    label: string;
    icon: IconName;
  }> = [
    {
      id: "cliente",
      label: "Cliente",
      icon: "user",
    },
    {
      id: "atividades",
      label: "Atividades",
      icon: "activity",
    },
    {
      id: "arquivos",
      label: "Arquivos",
      icon: "folder",
    },
  ];
  const shouldShowCustomerFooter =
    activeTab === "cliente";
  return (
    <>
      {!selectedReceiptId && (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/20">
        <button
          type="button"
          aria-label="Fechar central do cliente"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        <aside className="relative z-10 flex h-full w-[min(700px,calc(100vw-16px))] max-w-[700px] flex-col border-l border-black/10 bg-white shadow-2xl">
          <header className="shrink-0 border-b border-black/5 bg-white">
            <div className="flex h-20 items-center justify-between px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087B7B]">
                  Cliente 360°
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#171717]">
                  Central do Cliente
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {conversationHref && (
                  <Link
                    href={conversationHref}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0A9090]/20 bg-white px-3 text-xs font-bold text-[#087B7B] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0A9090]/35 hover:bg-[#F2FAFA] hover:shadow-sm"
                  >
                    <AppIcon
                      name="message"
                      className="h-4 w-4"
                    />
                    Conversa
                  </Link>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar painel"
                  title="Fechar"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-xl leading-none text-black/45 transition-all duration-200 hover:border-[#0A9090]/25 hover:bg-[#F2FAFA] hover:text-[#087B7B]"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex overflow-x-auto px-2">
              {tabs.map((tab) => {
                const isActive =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      clearFeedback();
                    }}
                    className={`relative flex min-w-fit flex-1 items-center justify-center gap-1.5 px-2 py-3 text-[11px] font-semibold transition-colors duration-200 ${
                      isActive
                        ? "text-[#087B7B]"
                        : "text-black/40 hover:text-[#087B7B]"
                    }`}
                  >
                    <AppIcon
                      name={tab.icon}
                      className="h-3.5 w-3.5"
                    />

                    {tab.label}

                    {tab.id === "atividades" &&
                      reminders.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A9090] px-1 text-[9px] font-bold text-white">
                          {reminders.length}
                        </span>
                      )}

                    {tab.id === "arquivos" &&
                      mediaMessages.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.07] px-1 text-[9px] font-bold text-black/55">
                          {mediaMessages.length}
                        </span>
                      )}

                    {isActive && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#0A9090]" />
                    )}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-black/5 bg-[#f7f7f8] p-5">
              <CustomerHeader
                avatar={profilePicUrl}
                name={name}
                customerCode={
                  customerCode
                }
                phone={phone}
                company={company}
                city={city}
                responsible={responsible}
                status={attendanceStatus}
                lastInteraction={lastInteraction}
                remindersCount={reminders.length}
                documentsCount={
                  mediaMessages.length
                }
                onOpenDocuments={() =>
                  setActiveTab("arquivos")
                }
              />
            </div>

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

                        {activeTab === "cliente" && (
              <div className="px-6 pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087B7B]">
                  Dados do cliente
                </p>
              </div>
            )}
{activeTab === "cliente" && (
              <div className="p-6">
                <CustomerInformation
                  company={company}
                  city={city}
                  responsible={responsible}
                  responsibleId={responsibleId}
                  phone={phone}
                  attendanceStatus={
                    attendanceStatus === "HUMANO"
                      ? "HUMANO"
                      : "IA"
                  }
                  lastInteraction={lastInteraction}
                  isLoading={isLoadingCustomer || !canEditCrm}
                  onCompanyChange={setCompany}
                  onCityChange={setCity}
                  onResponsibleChange={(responsibleName, userId) => {
                    setResponsible(responsibleName);
                    setResponsibleId(userId);
                  }}
                />
              </div>
            )}

                        {activeTab === "cliente" && (
              <div className="px-6 pt-2">
                <div className="border-t border-black/5 pt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
                    Observações internas
                  </p>
                  <p className="mt-1 text-xs text-black/40">
                    Notas livres sobre o cliente, sem prazo ou obrigação de ação.
                  </p>
                </div>
              </div>
            )}
{activeTab === "cliente" && (
              <div className="p-6">
                {canEditCrm ? (
                  <CustomerNotes
                    value={notes}
                    isSaving={isSaving}
                    onChange={setNotes}
                    onSave={handleSaveCustomer}
                  />
                ) : (
                  <div className="rounded-xl border border-black/10 bg-black/[0.025] p-4 text-sm text-black/50">
                    Você não possui permissão para editar o CRM deste cliente.
                  </div>
                )}
              </div>
            )}

                        {activeTab === "atividades" && (
              <div className="px-6 pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087B7B]">
                  Pendências ativas
                </p>
                <p className="mt-1 text-xs text-black/40">
                  O que ainda precisa de ação neste atendimento.
                </p>
              </div>
            )}
{activeTab === "atividades" && (
              <div className="p-6">
                <CustomerReminders
                  reminders={reminders}
                  reminderTitle={reminderTitle}
                  reminderDescription={
                    reminderDescription
                  }
                  reminderDate={reminderDate}
                  reminderTime={reminderTime}
                  reminderResponsible={
                    reminderResponsible
                  }
                  isLoading={isLoadingReminders}
                  isSaving={isSavingReminder}
                  completingReminderId={
                    completingReminderId
                  }
                  onTitleChange={
                    setReminderTitle
                  }
                  onDescriptionChange={
                    setReminderDescription
                  }
                  onDateChange={
                    setReminderDate
                  }
                  onTimeChange={
                    setReminderTime
                  }
                  onResponsibleChange={
                    setReminderResponsible
                  }
                  onSave={handleCreateReminder}
                  onComplete={
                    handleCompleteReminder
                  }
                />
              </div>
            )}

                        {activeTab === "atividades" && (
              <div className="px-6 pt-2">
                <div className="border-t border-black/5 pt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">
                    Histórico
                  </p>
                  <p className="mt-1 text-xs text-black/40">
                    Linha do tempo completa das interações com o cliente.
                  </p>
                </div>
              </div>
            )}
{activeTab === "atividades" && (
              <div className="p-6">
                <CustomerTimeline
                  items={timelineItems}
                  total={timelineTotal}
                  isLoading={
                    isLoadingTimeline
                  }
                  error={timelineError}
                  onReload={() =>
                    void reloadTimeline()
                  }
                  conversationHref={
                    conversationHref
                  }
                />
              </div>
            )}

            {activeTab === "arquivos" && (
              <>
                {isLoadingPersistedMessages && (
                  <div className="border-b border-black/5 px-6 py-3 text-xs font-medium text-black/40">
                    Carregando arquivos da Central do Cliente...
                  </div>
                )}

                {persistedMessagesError && (
                  <div className="mx-6 mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {persistedMessagesError}
                  </div>
                )}

                <CustomerFiles
                mediaMessages={mediaMessages}
                mediaCards={mediaCards}
                activeMediaFilter={
                  activeMediaFilter
                }
                filteredMedia={filteredMedia}
                visibleMedia={visibleMedia}
                onFilterChange={(filter) =>
                  setActiveMediaFilter(
                    filter as
                      | "all"
                      | "imageMessage"
                      | "audioMessage"
                      | "videoMessage"
                      | "documentMessage",
                  )
                }
                onOpenImage={(message) =>
                  setSelectedImageMessage(
                    message as ChatMessage,
                  )
                }
                onOpenAudio={(message) =>
                  setSelectedAudioMessage(
                    message as ChatMessage,
                  )
                }
                onOpenVideo={(message) =>
                  setSelectedVideoMessage(
                    message as ChatMessage,
                  )
                }
                onOpenDocument={(message) =>
                  setSelectedDocumentMessage(
                    message as ChatMessage,
                  )
                }
                receipts={receipts}
                isLoadingReceipts={
                  isLoadingReceipts
                }
                receiptsError={
                  receiptsError
                }
                onOpenReceipt={
                  setSelectedReceiptId
                }
              />
              </>
            )}
          </div>

          {shouldShowCustomerFooter && (
            <CustomerActions
              attendanceStatus={
                attendanceStatus === "HUMANO"
                  ? "HUMANO"
                  : "IA"
              }
              responsible={responsible}
              isAssigning={isAssigning}
              isSaving={isSaving}
              isLoadingCustomer={
                isLoadingCustomer
              }
              customerId={customerId}
              remoteJid={remoteJid}
              canAssumeAttendance={canAssumeAttendance}
              canEditCrm={canEditCrm}
              onAssign={
                handleAssignResponsible
              }
              onSave={handleSaveCustomer}
            />
          )}

        </aside>
      </div>
      )}

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

      <ReceiptPanel
        receiptId={selectedReceiptId}
        isOpen={Boolean(selectedReceiptId)}
        onClose={() =>
          setSelectedReceiptId(null)
        }
        onUpdated={() =>
          void reloadReceipts()
        }
      />
    </>
  );
}


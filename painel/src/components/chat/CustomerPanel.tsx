"use client";

import Link from "next/link";
import {
  useEffect,
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
  | "dados"
  | "timeline"
  | "notas"
  | "lembretes"
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
  initialTab = "dados",
}: CustomerPanelProps) {
  const [activeTab, setActiveTab] =
    useState<CustomerTab>("dados");

  const [
    isEditingCustomer,
    setIsEditingCustomer,
  ] = useState(false);

  const [
    selectedReceiptId,
    setSelectedReceiptId,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab(initialTab);
    setIsEditingCustomer(false);
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
    messages,
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
      activeTab === "timeline",
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
      id: "dados",
      label: "Dados",
      icon: "user",
    },
    {
      id: "lembretes",
      label: "Pendências",
      icon: "calendar",
    },
    {
      id: "arquivos",
      label: "Documentos",
      icon: "folder",
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: "activity",
    },
    {
      id: "notas",
      label: "Observações",
      icon: "note",
    },
  ];

  const shouldShowCustomerFooter =
    activeTab === "notas" ||
    (activeTab === "dados" &&
      isEditingCustomer);

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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e93800]">
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
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#ff3d00]/20 bg-white px-3 text-xs font-bold text-[#e93800] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff3d00]/35 hover:bg-[#fff5f1] hover:shadow-sm"
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-xl leading-none text-black/45 transition-all duration-200 hover:border-[#ff3d00]/25 hover:bg-[#fff5f1] hover:text-[#e93800]"
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
                      setIsEditingCustomer(false);
                      clearFeedback();
                    }}
                    className={`relative flex min-w-fit flex-1 items-center justify-center gap-1.5 px-2 py-3 text-[11px] font-semibold transition-colors duration-200 ${
                      isActive
                        ? "text-[#e93800]"
                        : "text-black/40 hover:text-[#e93800]"
                    }`}
                  >
                    <AppIcon
                      name={tab.icon}
                      className="h-3.5 w-3.5"
                    />

                    {tab.label}

                    {tab.id === "lembretes" &&
                      reminders.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3d00] px-1 text-[9px] font-bold text-white">
                          {reminders.length}
                        </span>
                      )}

                    {tab.id === "arquivos" &&
                      mediaMessages.length +
                        receipts.length >
                        0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.07] px-1 text-[9px] font-bold text-black/55">
                          {mediaMessages.length +
                            receipts.length}
                        </span>
                      )}

                    {isActive && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#ff3d00]" />
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
                  mediaMessages.length +
                  receipts.length
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

            {activeTab === "dados" && (
              <div className="p-6">
                {!isEditingCustomer ? (
                  <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/35">
                          Cadastro
                        </p>

                        <h3 className="mt-1 text-base font-bold text-[#171717]">
                          Dados do cliente
                        </h3>

                        <p className="mt-1 max-w-xl text-sm leading-6 text-black/45">
                          As informações principais já aparecem no resumo acima. Edite somente quando precisar atualizar o cadastro.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCustomer(true);
                          clearFeedback();
                        }}
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-black/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff3d00]/30 hover:bg-[#fff5f1] hover:text-[#e93800] hover:shadow-sm"
                      >
                        Editar cadastro
                      </button>
                    </div>
                  </section>
                ) : (
                  <div>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e93800]">
                          Edição
                        </p>

                        <h3 className="mt-1 text-base font-bold text-[#171717]">
                          Atualizar cadastro
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCustomer(false);
                          clearFeedback();
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/50 transition hover:border-black/20 hover:text-black/75"
                      >
                        Cancelar
                      </button>
                    </div>

                    <CustomerInformation
                      company={company}
                      city={city}
                      responsible={responsible}
                      phone={phone}
                      attendanceStatus={
                        attendanceStatus === "HUMANO"
                          ? "HUMANO"
                          : "IA"
                      }
                      lastInteraction={lastInteraction}
                      isLoading={isLoadingCustomer}
                      onCompanyChange={setCompany}
                      onCityChange={setCity}
                      onResponsibleChange={setResponsible}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "timeline" && (
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
                />
              </div>
            )}

            {activeTab === "notas" && (
              <div className="p-6">
                <CustomerNotes
                  value={notes}
                  isSaving={isSaving}
                  onChange={setNotes}
                  onSave={handleSaveCustomer}
                />
              </div>
            )}

            {activeTab === "lembretes" && (
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

            {activeTab === "arquivos" && (
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

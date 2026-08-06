"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ReceiptPanel from "./ReceiptPanel";

type ReminderRecord = {
  id: string;
  title: string;
  remindAt: string;
  status: string;
  customer?: {
    name?: string | null;
    displayName?: string | null;
    phone?: string | null;
    displayPhone?: string | null;
    remoteJid?: string | null;
    isGroup?: boolean;
    groupSubject?: string | null;
  } | null;
};

type ReceiptStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_NEW_RECEIPT"
  | "CUSTOMER_NOTIFIED"
  | "FINISHED";

type ReceiptRecord = {
  id: string;
  status: ReceiptStatus;
  amount?: string | number | null;
  paymentMethod?: string | null;
  createdAt: string;
  mediaUrl?: string | null;
  customer?: {
    name?: string | null;
    displayName?: string | null;
    phone?: string | null;
    displayPhone?: string | null;
    remoteJid?: string | null;
    isGroup?: boolean;
    groupSubject?: string | null;
  } | null;
  message?: {
    mediaUrl?: string | null;
    rawPayload?: unknown;
  } | null;
  responsible?: {
    name: string;
    displayName?: string | null;
  } | null;
};

const activeReceiptStatuses: ReceiptStatus[] = [
  "RECEIVED",
  "CLASSIFIED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "AWAITING_NEW_RECEIPT",
  "CUSTOMER_NOTIFIED",
];

const receiptLabels: Record<ReceiptStatus, string> = {
  RECEIVED: "Recebido",
  CLASSIFIED: "Classificado",
  UNDER_REVIEW: "Em anÃ¡lise",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  AWAITING_NEW_RECEIPT: "Aguardando novo",
  CUSTOMER_NOTIFIED: "Cliente notificado",
  FINISHED: "Finalizado",
};

const receiptClasses: Record<ReceiptStatus, string> = {
  RECEIVED: "border-blue-200 bg-blue-50 text-blue-700",
  CLASSIFIED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  UNDER_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  AWAITING_NEW_RECEIPT: "border-orange-200 bg-orange-50 text-orange-700",
  CUSTOMER_NOTIFIED: "border-violet-200 bg-violet-50 text-violet-700",
  FINISHED: "border-black/10 bg-black/[0.04] text-black/55",
};

function isReminderOverdue(reminder: ReminderRecord) {
  const date = new Date(reminder.remindAt);

  return (
    reminder.status === "PENDING" &&
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
}

function formatDelay(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "HorÃ¡rio indisponÃ­vel";
  }

  const minutes = Math.max(
    1,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );

  if (minutes < 60) {
    return `${minutes} min em atraso`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} h em atraso`;
  }

  return `${Math.floor(hours / 24)} d em atraso`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponÃ­vel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAmount(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getMessagePushName(
  rawPayload: unknown,
) {
  if (!isRecord(rawPayload)) {
    return "";
  }

  const pushName =
    rawPayload.pushName;

  return typeof pushName === "string"
    ? pushName.trim()
    : "";
}

function getBestCustomerName(
  customer?: ReceiptRecord["customer"],
) {
  return (
    customer?.displayName?.trim() ||
    customer?.name?.trim() ||
    customer?.displayPhone?.trim() ||
    customer?.phone?.trim() ||
    "Cliente sem identificaÃ§Ã£o"
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 20h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}>
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReminderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M6.5 4.5h11v15h-11v-15Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 9h6M9 12.5h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7 3.5h8l3 3V20.5H7V3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15 3.5v3h3M9.5 11h6M9.5 14.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function CentralPendencias() {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showReminders, setShowReminders] = useState(true);
  const [showReceipts, setShowReceipts] = useState(true);
  const [completingReminderId, setCompletingReminderId] = useState<string | null>(null);
  const [postponingReminderId, setPostponingReminderId] = useState<string | null>(null);
  const [reminderBeingPostponed, setReminderBeingPostponed] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const loadOperationalData = useCallback(async () => {
    try {
      const [remindersResponse, receiptsResponse] = await Promise.all([
        fetch("/api/reminders", { cache: "no-store" }),
        fetch("/api/payment-receipts", { cache: "no-store" }),
      ]);

      const [remindersData, receiptsData] = await Promise.all([
        remindersResponse.json(),
        receiptsResponse.json(),
      ]);

      if (!remindersResponse.ok) {
        throw new Error(remindersData.error || "Erro ao carregar os lembretes.");
      }

      if (!receiptsResponse.ok) {
        throw new Error(receiptsData.error || "Erro ao carregar os comprovantes.");
      }

      setReminders(Array.isArray(remindersData) ? remindersData : []);
      setReceipts(Array.isArray(receiptsData) ? receiptsData : []);
      setHasError(false);
    } catch (error) {
      console.error("Erro ao carregar a Central Operacional:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperationalData();

    const intervalId = window.setInterval(loadOperationalData, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadOperationalData]);

  const overdueReminders = useMemo(
    () =>
      reminders
        .filter(isReminderOverdue)
        .sort(
          (a, b) =>
            new Date(a.remindAt).getTime() -
            new Date(b.remindAt).getTime(),
        ),
    [reminders],
  );

  const activeReceipts = useMemo(
    () =>
      receipts
        .filter((receipt) => activeReceiptStatuses.includes(receipt.status))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [receipts],
  );

  const visibleReminders = overdueReminders.slice(0, 3);
  const visibleReceipts = activeReceipts.slice(0, 3);
  const totalCount = overdueReminders.length + activeReceipts.length;

  function openCustomerCenter(
    remoteJid: string | null | undefined,
    tab: "lembretes" | "arquivos",
  ) {
    if (!remoteJid) {
      return;
    }

    const params =
      new URLSearchParams({
        remoteJid,
        tab,
      });

    setIsOpen(false);

    window.location.assign(
      `/clientes?${params.toString()}`,
    );
  }

  async function handleCompleteReminder(reminderId: string) {
    if (completingReminderId) {
      return;
    }

    setCompletingReminderId(reminderId);

    try {
      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reminderId,
          action: "complete",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "NÃ£o foi possÃ­vel concluir o lembrete.");
      }

      setReminders((current) =>
        current.filter((reminder) => reminder.id !== reminderId),
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Erro ao concluir o lembrete.",
      );
    } finally {
      setCompletingReminderId(null);
    }
  }

  async function handlePostponeReminder(reminderId: string, minutes: number) {
    if (postponingReminderId || completingReminderId) {
      return;
    }

    setPostponingReminderId(reminderId);

    try {
      const remindAt = new Date(
        Date.now() + minutes * 60_000,
      ).toISOString();

      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reminderId,
          action: "postpone",
          remindAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "NÃ£o foi possÃ­vel adiar o lembrete.");
      }

      setReminders((current) =>
        current.map((reminder) =>
          reminder.id === reminderId
            ? {
                ...reminder,
                remindAt: data.remindAt || remindAt,
                status: data.status || "PENDING",
              }
            : reminder,
        ),
      );

      setReminderBeingPostponed(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Erro ao adiar o lembrete.",
      );
    } finally {
      setPostponingReminderId(null);
    }
  }

  function SectionHeader({
    title,
    count,
    open,
    onClick,
    type,
  }: {
    title: string;
    count: number;
    open: boolean;
    onClick: () => void;
    type: "reminder" | "receipt";
  }) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-black/[0.035]">
        <span className="text-black/50">
          {type === "receipt" ? <ReceiptIcon /> : <ReminderIcon />}
        </span>
        <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-[0.08em] text-black/55">
          {title}
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.06] px-1.5 text-[10px] font-bold text-black/55">
          {count > 99 ? "99+" : count}
        </span>
        <span className="text-black/35">
          <ChevronIcon open={open} />
        </span>
      </button>
    );
  }

  return (
    <section className="bg-white p-3">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-black/[0.025]"
        >
          <span className="text-black/55">
            <BellIcon />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-black/75">
              Central Operacional
            </span>
            <span className="mt-0.5 block text-xs text-black/40">
              {isLoading
                ? "Atualizando..."
                : hasError
                  ? "NÃ£o foi possÃ­vel carregar"
                  : totalCount === 0
                    ? "Nenhuma pendÃªncia operacional"
                    : `${overdueReminders.length} lembrete${
                        overdueReminders.length === 1 ? "" : "s"
                      } e ${activeReceipts.length} comprovante${
                        activeReceipts.length === 1 ? "" : "s"
                      }`}
            </span>
          </span>

          {totalCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}

          <span className="text-black/35">
            <ChevronIcon open={isOpen} />
          </span>
        </button>

        {isOpen && (
          <div className="max-h-[65vh] overflow-y-auto border-t border-black/10 bg-black/[0.015] p-3">
            {hasError ? (
              <button
                type="button"
                onClick={() => void loadOperationalData()}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-black/[0.025]"
              >
                Tentar novamente
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <SectionHeader
                    title="Lembretes"
                    count={overdueReminders.length}
                    open={showReminders}
                    onClick={() => setShowReminders((current) => !current)}
                    type="reminder"
                  />

                  {showReminders && (
                    <div className="mt-2 space-y-2">
                      {visibleReminders.length === 0 ? (
                        <div className="rounded-xl bg-white px-3 py-3 text-sm text-black/45">
                          Nenhum lembrete atrasado.
                        </div>
                      ) : (
                        visibleReminders.map((reminder) => {
                          const visibleName =
                            reminder.customer?.name?.trim() ||
                            reminder.customer?.phone ||
                            "Cliente";

                          return (
                            <article key={reminder.id} className="rounded-xl border border-black/10 bg-white p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-sm font-bold text-black/55">
                                  {visibleName.charAt(0).toUpperCase()}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-black/80">
                                    {visibleName}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-black/45">
                                    {reminder.title}
                                  </p>
                                  <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {formatDelay(reminder.remindAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={!reminder.customer?.remoteJid}
                                  onClick={() =>
                                    openCustomerCenter(
                                      reminder.customer?.remoteJid,
                                      "lembretes",
                                    )
                                  }
                                  className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-black/15"
                                >
                                  Abrir
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    completingReminderId !== null ||
                                    postponingReminderId !== null
                                  }
                                  onClick={() =>
                                    void handleCompleteReminder(reminder.id)
                                  }
                                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black/60 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {completingReminderId === reminder.id
                                    ? "..."
                                    : "Concluir"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    completingReminderId !== null ||
                                    postponingReminderId !== null
                                  }
                                  onClick={() =>
                                    setReminderBeingPostponed((current) =>
                                      current === reminder.id ? null : reminder.id,
                                    )
                                  }
                                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black/60 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Adiar
                                </button>
                              </div>

                              {reminderBeingPostponed === reminder.id && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {[30, 60, 1440].map((minutes) => (
                                    <button
                                      key={minutes}
                                      type="button"
                                      disabled={postponingReminderId !== null}
                                      onClick={() =>
                                        void handlePostponeReminder(
                                          reminder.id,
                                          minutes,
                                        )
                                      }
                                      className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-2 text-[11px] font-bold text-black/55 transition hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {minutes === 30
                                        ? "30 min"
                                        : minutes === 60
                                          ? "1 hora"
                                          : "1 dia"}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-black/10 pt-2">
                  <SectionHeader
                    title="Comprovantes"
                    count={activeReceipts.length}
                    open={showReceipts}
                    onClick={() => setShowReceipts((current) => !current)}
                    type="receipt"
                  />

                  {showReceipts && (
                    <div className="mt-2 space-y-2">
                      {visibleReceipts.length === 0 ? (
                        <div className="rounded-xl bg-white px-3 py-3 text-sm text-black/45">
                          Nenhum comprovante pendente.
                        </div>
                      ) : (
                        visibleReceipts.map((receipt) => {
                          const visibleName =
                            getBestCustomerName(
                              receipt.customer,
                            );

                          const mediaUrl =
                            receipt.mediaUrl ||
                            receipt.message?.mediaUrl ||
                            null;

                          const amount = formatAmount(receipt.amount);

                          return (
                            <article key={receipt.id} className="rounded-xl border border-black/10 bg-white p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700">
                                  <ReceiptIcon />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-sm font-semibold leading-5 text-black/80">
                                    {visibleName}
                                  </p>

                                  {receipt.customer?.phone && (
                                    <p className="mt-0.5 break-words text-[11px] text-black/40">
                                      {receipt.customer.phone}
                                    </p>
                                  )}

                                  <p className="mt-1 text-xs leading-5 text-black/45">
                                    Recebido em {formatDate(receipt.createdAt)}
                                  </p>

                                  {(amount || receipt.paymentMethod) && (
                                    <p className="mt-1.5 break-words text-xs font-semibold leading-5 text-black/60">
                                      {amount || "Valor nÃ£o informado"}
                                      {receipt.paymentMethod
                                        ? ` Â· ${receipt.paymentMethod}`
                                        : ""}
                                    </p>
                                  )}

                                  {receipt.responsible && (
                                    <p className="mt-1 break-words text-[11px] leading-5 text-black/40">
                                      ResponsÃ¡vel:{" "}
                                      {receipt.responsible.displayName ||
                                        receipt.responsible.name}
                                    </p>
                                  )}

                                  <div className="mt-2 flex justify-end">
                                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${receiptClasses[receipt.status]}`}>
                                      {receiptLabels[receipt.status]}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedReceiptId(
                                      receipt.id,
                                    )
                                  }
                                  className="flex h-9 w-full items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-2 text-[11px] font-bold text-orange-700 transition hover:bg-orange-100"
                                >
                                  Analisar
                                </button>

                                <button
                                  type="button"
                                  disabled={!mediaUrl}
                                  onClick={() => {
                                    if (mediaUrl) {
                                      window.open(
                                        mediaUrl,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                    }
                                  }}
                                  className="flex h-9 w-full items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-[11px] font-bold text-black/60 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Visualizar
                                </button>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ReceiptPanel
        receiptId={selectedReceiptId}
        isOpen={Boolean(selectedReceiptId)}
        onClose={() =>
          setSelectedReceiptId(null)
        }
        onUpdated={() =>
          void loadOperationalData()
        }
      />
    </section>
  );
}


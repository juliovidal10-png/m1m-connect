"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";

import useMediaLoader from "@/hooks/useMediaLoader";

type ReceiptStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "AWAITING_NEW_RECEIPT"
  | "CUSTOMER_NOTIFIED"
  | "FINISHED";

type UserRecord = {
  id: string;
  name: string;
  displayName?: string | null;
  role: string;
  active: boolean;
};

type ReceiptEvent = {
  id: string;
  type: string;
  actorType: string;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    displayName?: string | null;
  } | null;
};

type ReceiptRecord = {
  id: string;
  status: ReceiptStatus;
  amount?: string | number | null;
  paymentMethod?: string | null;
  identifiedBank?: string | null;
  paidAt?: string | null;
  observations?: string | null;
  rejectionReason?: string | null;
  mediaUrl?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  createdAt: string;
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
    id: string;
    mediaUrl?: string | null;
    mimeType?: string | null;
    content?: string | null;
    rawPayload?: unknown;
  } | null;
  responsible?: {
    id: string;
    name: string;
    displayName?: string | null;
  } | null;
  events?: ReceiptEvent[];
};

type ReceiptPanelProps = {
  receiptId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

const currentUserId = "julio";

const statusLabels: Record<
  ReceiptStatus,
  string
> = {
  RECEIVED: "Recebido",
  CLASSIFIED: "Classificado",
  UNDER_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  AWAITING_NEW_RECEIPT:
    "Aguardando novo comprovante",
  CUSTOMER_NOTIFIED:
    "Cliente notificado",
  FINISHED: "Finalizado",
};

const statusClasses: Record<
  ReceiptStatus,
  string
> = {
  RECEIVED:
    "border-blue-200 bg-blue-50 text-blue-700",
  CLASSIFIED:
    "border-indigo-200 bg-indigo-50 text-indigo-700",
  UNDER_REVIEW:
    "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED:
    "border-green-200 bg-green-50 text-green-700",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700",
  AWAITING_NEW_RECEIPT:
    "border-orange-200 bg-orange-50 text-orange-700",
  CUSTOMER_NOTIFIED:
    "border-violet-200 bg-violet-50 text-violet-700",
  FINISHED:
    "border-black/10 bg-black/[0.04] text-black/55",
};

const eventLabels: Record<
  string,
  string
> = {
  RECEIVED:
    "Comprovante recebido",
  CLASSIFIED:
    "Comprovante classificado",
  REVIEW_STARTED:
    "Análise iniciada",
  APPROVED:
    "Pagamento aprovado",
  REJECTED:
    "Pagamento recusado",
  AWAITING_NEW_RECEIPT:
    "Novo comprovante solicitado",
  CUSTOMER_NOTIFIED:
    "Cliente notificado",
  FINISHED:
    "Processo finalizado",
  NOTE_ADDED:
    "Informações atualizadas",
};

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M7 3.5h8l3 3V20.5H7V3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M15 3.5v3h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m9.2 13.3 1.8 1.8 3.8-4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConversationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Não informado";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

function formatAmount(
  value?: string | number | null,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  const amount =
    Number(value);

  if (
    Number.isNaN(amount)
  ) {
    return "";
  }

  return amount.toFixed(2);
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
  receipt: ReceiptRecord,
) {
  return (
    receipt.customer?.displayName?.trim() ||
    receipt.customer?.name?.trim() ||
    receipt.customer?.displayPhone?.trim() ||
    receipt.customer?.phone?.trim() ||
    "Cliente sem identificação"
  );
}

export default function ReceiptPanel({
  receiptId,
  isOpen,
  onClose,
  onUpdated,
}: ReceiptPanelProps) {
  const [receipt, setReceipt] =
    useState<ReceiptRecord | null>(
      null,
    );

  const [users, setUsers] =
    useState<UserRecord[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [selectedResponsibleId, setSelectedResponsibleId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [identifiedBank, setIdentifiedBank] =
    useState("");

  const [observations, setObservations] =
    useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [showRejection, setShowRejection] =
    useState(false);

  const [
    showFinishConfirmation,
    setShowFinishConfirmation,
  ] = useState(false);

  const mediaMessageId =
    receipt?.message?.id || "";

  const mediaMessage =
    receipt?.message?.rawPayload || null;

  const {
    media,
    loading: isLoadingMedia,
    error: hasMediaError,
  } = useMediaLoader(
    mediaMessageId,
    mediaMessage,
  );

  const evolutionImageSource =
    media?.base64 &&
    media.mimetype
      ? `data:${media.mimetype};base64,${media.base64}`
      : null;

  const localImageSource =
    receipt?.mediaUrl?.trim() ||
    receipt?.message?.mediaUrl?.trim() ||
    null;

  const imageSource =
    evolutionImageSource ||
    localImageSource;

  const shouldLoadEvolutionMedia =
    Boolean(
      mediaMessageId &&
      mediaMessage,
    );

  const isReceiptMediaLoading =
    shouldLoadEvolutionMedia &&
    isLoadingMedia &&
    !localImageSource;

  const hasReceiptMediaError =
    shouldLoadEvolutionMedia &&
    hasMediaError &&
    !localImageSource;

  const activeUsers =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.active,
        ),
      [users],
    );

  useEffect(() => {
    if (
      !isOpen ||
      !receiptId
    ) {
      return;
    }

    async function loadPanel() {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const [
          receiptResponse,
          usersResponse,
        ] = await Promise.all([
          fetch(
            `/api/payment-receipts/${receiptId}`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            "/api/users",
            {
              cache: "no-store",
            },
          ),
        ]);

        const [
          receiptData,
          usersData,
        ] = await Promise.all([
          receiptResponse.json(),
          usersResponse.json(),
        ]);

        if (!receiptResponse.ok) {
          throw new Error(
            receiptData.error ||
              "Não foi possível carregar o comprovante.",
          );
        }

        if (!usersResponse.ok) {
          throw new Error(
            usersData.error ||
              "Não foi possível carregar os usuários.",
          );
        }

        const loadedReceipt =
          receiptData as ReceiptRecord;

        setReceipt(
          loadedReceipt,
        );

        setUsers(
          Array.isArray(usersData)
            ? usersData
            : [],
        );

        setSelectedResponsibleId(
          loadedReceipt
            .responsible?.id ||
            currentUserId,
        );

        setAmount(
          formatAmount(
            loadedReceipt.amount,
          ),
        );

        setPaymentMethod(
          loadedReceipt
            .paymentMethod || "",
        );

        setIdentifiedBank(
          loadedReceipt
            .identifiedBank || "",
        );

        setObservations(
          loadedReceipt
            .observations || "",
        );

        setRejectionReason(
          loadedReceipt
            .rejectionReason || "",
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Erro ao carregar o comprovante.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPanel();
  }, [
    isOpen,
    receiptId,
  ]);

  async function runAction(
    action: string,
    extraBody: Record<
      string,
      unknown
    > = {},
  ) {
    if (
      !receiptId ||
      isProcessing
    ) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `/api/payment-receipts/${receiptId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
                actorType:
                  "USER",
                actorId:
                  currentUserId,
                ...extraBody,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível atualizar o comprovante.",
        );
      }

      const detailsResponse =
        await fetch(
          `/api/payment-receipts/${receiptId}`,
          {
            cache: "no-store",
          },
        );

      const details =
        await detailsResponse.json();

      if (
        !detailsResponse.ok
      ) {
        throw new Error(
          details.error ||
            "A ação foi concluída, mas os detalhes não puderam ser atualizados.",
        );
      }

      setReceipt(
        details as ReceiptRecord,
      );

      setSuccess(
        "Comprovante atualizado com sucesso.",
      );

      setShowRejection(false);
      onUpdated();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao atualizar o comprovante.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveDetails() {
    await runAction(
      "UPDATE_DETAILS",
      {
        amount:
          amount.trim()
            ? Number(
                amount.replace(
                  ",",
                  ".",
                ),
              )
            : null,
        paymentMethod,
        identifiedBank,
        observations,
      },
    );
  }

  async function handleReject() {
    if (
      !rejectionReason.trim()
    ) {
      setError(
        "Informe o motivo da recusa.",
      );
      return;
    }

    await runAction(
      "REJECT",
      {
        rejectionReason,
        observations,
      },
    );
  }

  function openConversation() {
    const remoteJid =
      receipt?.customer?.remoteJid;

    if (!remoteJid) {
      return;
    }

    const conversationUrl =
      `/?remoteJid=${encodeURIComponent(
        remoteJid,
      )}`;

    window.location.assign(
      conversationUrl,
    );
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <style jsx>{`
        @media (max-width: 760px) {
          .m1m-receipt-main-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .m1m-receipt-preview {
            max-width: 100% !important;
          }

          .m1m-receipt-preview img {
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex justify-end bg-black/35">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="min-w-0 flex-1 cursor-default"
      />

      <aside
        className="relative flex h-full w-full flex-col bg-[#f7f7f8] shadow-2xl"
        style={{
          width: "min(920px, 100vw)",
          maxWidth: "920px",
        }}
      >
        <header className="relative flex shrink-0 items-center gap-4 border-b border-black/10 bg-white px-6 py-4 pr-20">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm">
            <ReceiptIcon />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/35">
              Central Operacional • Financeiro
            </p>

            <h2 className="mt-1 truncate text-lg font-bold">
              Análise do comprovante
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar análise do comprovante"
            title="Fechar"
            className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-black/45 transition hover:bg-black/[0.06] hover:text-black focus:outline-none focus:ring-4 focus:ring-black/5"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <div className="h-56 animate-pulse rounded-2xl bg-black/[0.05]" />
              <div className="h-32 animate-pulse rounded-2xl bg-black/[0.05]" />
              <div className="h-44 animate-pulse rounded-2xl bg-black/[0.05]" />
            </div>
          ) : error &&
            !receipt ? (
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            </div>
          ) : receipt ? (
            <div className="space-y-5 p-5 md:p-6">
              <section
                className="m1m-receipt-main-grid grid gap-5 rounded-2xl border border-black/10 bg-white p-5"
                style={{
                  gridTemplateColumns:
                    "minmax(0, 300px) minmax(0, 1fr)",
                }}
              >
                <div
                  className="m1m-receipt-preview w-full min-w-0"
                  style={{
                    maxWidth: "300px",
                  }}
                >
                  <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#f2f3f3] shadow-inner">
                    {isReceiptMediaLoading ? (
                      <div
                        className="flex flex-col items-center justify-center gap-4"
                        style={{
                          height: "360px",
                        }}
                      >
                        <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/10 border-t-orange-600" />

                        <p className="text-sm font-semibold text-black/50">
                          Carregando comprovante...
                        </p>
                      </div>
                    ) : hasReceiptMediaError ? (
                      <div
                        className="flex flex-col items-center justify-center px-6 text-center"
                        style={{
                          height: "360px",
                        }}
                      >
                        <ReceiptIcon />

                        <p className="mt-4 text-sm font-bold text-black/65">
                          Comprovante indisponível
                        </p>

                        <p className="mt-2 max-w-sm text-xs leading-5 text-black/40">
                          Não foi possível recuperar esta mídia pela Evolution API.
                        </p>
                      </div>
                    ) : imageSource ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            imageSource,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="group relative block w-full"
                        title="Abrir comprovante ampliado"
                      >
                        <img
                          src={imageSource}
                          alt="Comprovante enviado pelo cliente"
                          className="block w-full bg-black/[0.015] object-contain transition group-hover:opacity-90"
                          style={{
                            width: "100%",
                            maxWidth: "300px",
                            height: "360px",
                            maxHeight: "360px",
                          }}
                        />

                        <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-xs font-bold text-white">
                          Ampliar
                        </span>
                      </button>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center px-6 text-center"
                        style={{
                          height: "360px",
                        }}
                      >
                        <ReceiptIcon />

                        <p className="mt-4 text-sm font-bold text-black/65">
                          Mídia não localizada
                        </p>

                        <p className="mt-2 max-w-sm text-xs leading-5 text-black/40">
                          Este registro não possui uma mensagem de mídia válida.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
                        Cliente
                      </p>

                      <h3 className="mt-1 break-words text-xl font-bold">
                        {getBestCustomerName(
                          receipt,
                        )}
                      </h3>

                      <p className="mt-1 text-sm text-black/45">
                        Recebido em{" "}
                        {formatDate(
                          receipt.createdAt,
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses[receipt.status]}`}
                    >
                      {
                        statusLabels[
                          receipt.status
                        ]
                      }
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Valor
                      </span>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(event) =>
                          setAmount(
                            event.target.value,
                          )
                        }
                        placeholder="0,00"
                        className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Forma de pagamento
                      </span>

                      <input
                        type="text"
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value,
                          )
                        }
                        placeholder="Ex.: PIX"
                        className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Banco identificado
                      </span>

                      <input
                        type="text"
                        value={identifiedBank}
                        onChange={(event) =>
                          setIdentifiedBank(
                            event.target.value,
                          )
                        }
                        placeholder="Nome do banco"
                        className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Observações
                      </span>

                      <textarea
                        rows={4}
                        value={observations}
                        onChange={(event) =>
                          setObservations(
                            event.target.value,
                          )
                        }
                        placeholder="Informações internas da análise"
                        className="mt-2 w-full resize-y rounded-xl border border-black/10 px-3 py-3 text-sm leading-6 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        void handleSaveDetails()
                      }
                      className="h-11 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/65 transition hover:bg-black/[0.03] disabled:opacity-50 sm:col-span-2"
                    >
                      Salvar informações
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                    Responsável pela análise
                  </span>

                  <select
                    value={
                      selectedResponsibleId
                    }
                    onChange={(event) =>
                      setSelectedResponsibleId(
                        event.target.value,
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">
                      Selecione o responsável
                    </option>

                    {activeUsers.map(
                      (user) => (
                        <option
                          key={user.id}
                          value={user.id}
                        >
                          {user.displayName ||
                            user.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </section>

              <section className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
                  Resultado da análise
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={
                      isProcessing ||
                      receipt.status ===
                        "FINISHED"
                    }
                    onClick={() =>
                      void runAction(
                        "APPROVE",
                      )
                    }
                    className="h-12 rounded-xl border border-green-200 bg-green-50 text-sm font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                  >
                    Aprovar pagamento
                  </button>

                  <button
                    type="button"
                    disabled={
                      isProcessing ||
                      receipt.status ===
                        "FINISHED"
                    }
                    onClick={() =>
                      setShowRejection(
                        (current) =>
                          !current,
                      )
                    }
                    className="h-12 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Pagamento não localizado
                  </button>
                </div>
              </section>

              {showRejection && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-red-800">
                        Pagamento não localizado
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-red-700/75">
                        Registre o motivo e escolha o próximo passo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowRejection(false)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-red-700 transition hover:bg-red-100"
                      aria-label="Fechar opções"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase tracking-wide text-red-700">
                      Motivo
                    </span>

                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: valor não identificado, comprovante ilegível ou dados divergentes"
                      className="mt-2 w-full resize-y rounded-xl border border-red-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        !rejectionReason.trim()
                      }
                      onClick={() =>
                        void runAction(
                          "AWAIT_NEW_RECEIPT",
                          {
                            observations:
                              rejectionReason.trim(),
                          },
                        )
                      }
                      className="h-11 rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Solicitar novo comprovante
                    </button>

                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        !rejectionReason.trim()
                      }
                      onClick={() =>
                        void handleReject()
                      }
                      className="h-11 rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Registrar recusa
                    </button>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-black/10 bg-white p-4">
                <h3 className="text-sm font-bold">
                  Histórico
                </h3>

                {receipt.events &&
                receipt.events.length >
                  0 ? (
                  <div className="mt-4 space-y-3">
                    {receipt.events.map(
                      (event) => (
                        <article
                          key={event.id}
                          className="border-l-2 border-orange-200 pl-4"
                        >
                          <p className="text-sm font-semibold text-black/70">
                            {eventLabels[
                              event.type
                            ] ||
                              event.type}
                          </p>

                          <p className="mt-1 text-xs text-black/40">
                            {event.actor
                              ? event.actor
                                  .displayName ||
                                event.actor
                                  .name
                              : event.actorType}
                            {" · "}
                            {formatDate(
                              event.createdAt,
                            )}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-black/40">
                    Nenhum evento registrado.
                  </p>
                )}
              </section>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {receipt && (
          <footer className="grid shrink-0 gap-3 border-t border-black/10 bg-white p-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={
                !receipt.customer
                  ?.remoteJid
              }
              onClick={
                openConversation
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff3d00] px-4 text-sm font-bold text-white transition hover:bg-[#e93800] focus:outline-none focus:ring-4 focus:ring-[#ff3d00]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ConversationIcon />
              Abrir conversa com o cliente
            </button>

            <button
              type="button"
              disabled={
                isProcessing ||
                receipt.status ===
                  "FINISHED"
              }
              onClick={() =>
                setShowFinishConfirmation(
                  true,
                )
              }
              className="h-11 rounded-xl bg-black text-sm font-bold text-white transition hover:bg-black/80 disabled:opacity-40"
            >
              Concluir análise
            </button>
          </footer>
        )}

        {showFinishConfirmation && receipt && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-5">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-bold">
                Concluir análise?
              </h3>

              <p className="mt-2 text-sm leading-6 text-black/50">
                O comprovante sairá da Central Operacional, mas continuará registrado no histórico financeiro.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    setShowFinishConfirmation(
                      false,
                    )
                  }
                  className="h-11 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/65 transition hover:bg-black/[0.03] disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={async () => {
                    await runAction(
                      "FINISH",
                    );

                    setShowFinishConfirmation(
                      false,
                    );

                    onClose();
                  }}
                  className="h-11 rounded-xl bg-black text-sm font-bold text-white transition hover:bg-black/80 disabled:opacity-50"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
      </div>
    </>,
    document.body,
  );
}

"use client";

import {
  formatMessageTime,
  getFilterLabel,
  getMediaLabel,
  type CustomerMediaMessageLike,
} from "./customer-utils";

import type {
  CustomerReceipt,
  CustomerReceiptStatus,
} from "@/hooks/customer/useCustomerReceipts";

export type CustomerMediaMessage =
  CustomerMediaMessageLike;

export type MediaCard = {
  filter: string;
  icon: string;
  label: string;
  count: number;
};

type CustomerFilesProps = {
  mediaMessages: CustomerMediaMessage[];
  mediaCards: MediaCard[];
  activeMediaFilter: string;
  filteredMedia: CustomerMediaMessage[];
  visibleMedia: CustomerMediaMessage[];
  onFilterChange: (filter: string) => void;
  onOpenImage: (
    message: CustomerMediaMessage,
  ) => void;
  onOpenAudio: (
    message: CustomerMediaMessage,
  ) => void;
  onOpenVideo: (
    message: CustomerMediaMessage,
  ) => void;
  onOpenDocument: (
    message: CustomerMediaMessage,
  ) => void;
  receipts: CustomerReceipt[];
  isLoadingReceipts: boolean;
  receiptsError: string;
  onOpenReceipt: (
    receiptId: string,
  ) => void;
};



type FilesIconName =
  | "paperclip"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "receipt";

function FilesIcon({
  name,
  size = 16,
}: {
  name: FilesIconName;
  size?: number;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: size,
    height: size,
    style: {
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      display: "block",
    },
    "aria-hidden": true,
  };

  if (name === "image") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m5 17 4.5-4.5 3 3L15 13l4 4" />
      </svg>
    );
  }

  if (name === "audio") {
    return (
      <svg {...commonProps}>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
      </svg>
    );
  }

  if (name === "video") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  }

  if (name === "document") {
    return (
      <svg {...commonProps}>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5M9 12h6M9 16h6" />
      </svg>
    );
  }

  if (name === "receipt") {
    return (
      <svg {...commonProps}>
        <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3Z" />
        <path d="M10 8h4M10 12h4M10 16h3" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="m9 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8" />
    </svg>
  );
}

function getMediaIconName(
  messageType?: string | null,
): FilesIconName {
  if (messageType === "imageMessage") {
    return "image";
  }

  if (messageType === "audioMessage") {
    return "audio";
  }

  if (messageType === "videoMessage") {
    return "video";
  }

  return "document";
}

const receiptStatusLabels: Record<
  CustomerReceiptStatus,
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

const receiptStatusClasses: Record<
  CustomerReceiptStatus,
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
    "border-teal-200 bg-teal-50 text-teal-700",
  CUSTOMER_NOTIFIED:
    "border-violet-200 bg-violet-50 text-violet-700",
  FINISHED:
    "border-black/10 bg-black/[0.04] text-black/55",
};

function formatReceiptAmount(
  value?: string | number | null,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Valor não informado";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "Valor não informado";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(amount);
}

function formatReceiptDate(
  value?: string | null,
) {
  if (!value) {
    return "Data não informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

export default function CustomerFiles({
  mediaMessages,
  mediaCards,
  activeMediaFilter,
  filteredMedia,
  visibleMedia,
  onFilterChange,
  onOpenImage,
  onOpenAudio,
  onOpenVideo,
  onOpenDocument,
  receipts,
  isLoadingReceipts,
  receiptsError,
  onOpenReceipt,
}: CustomerFilesProps) {
  return (
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

          <span className="text-black/45">
            <FilesIcon
              name="paperclip"
              size={16}
            />
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-black/45">
          Clique em uma categoria para filtrar os
          arquivos trocados com este cliente.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          onFilterChange("all")
        }
        className={`mt-4 w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
          activeMediaFilter === "all"
            ? "border-[#0A9090] bg-[#ECF8F8] text-[#087B7B]"
            : "border-black/10 hover:bg-black/[0.02]"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <FilesIcon
            name="paperclip"
            size={14}
          />
          Todos os arquivos
        </span>

        <span className="float-right">
          {mediaMessages.length}
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {mediaCards.map((card) => {
          const selected =
            activeMediaFilter === card.filter;

          return (
            <button
              key={card.filter}
              type="button"
              onClick={() =>
                onFilterChange(card.filter)
              }
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-[#0A9090] bg-[#ECF8F8]"
                  : "border-black/10 hover:bg-black/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-black/55">
                  <FilesIcon
                    name={
                      card.filter === "imageMessage"
                        ? "image"
                        : card.filter === "audioMessage"
                          ? "audio"
                          : card.filter === "videoMessage"
                            ? "video"
                            : "document"
                    }
                    size={16}
                  />
                </span>

                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[#087B7B]">
                  {card.count}
                </span>
              </div>

              <p
                className={`mt-3 text-sm font-semibold ${
                  selected
                    ? "text-[#087B7B]"
                    : ""
                }`}
              >
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      {mediaMessages.length > 0 && (
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
            <div className="mt-3 rounded-xl border border-dashed border-black/15 px-4 py-3 text-sm text-black/45">
              Nenhum arquivo nesta categoria.
            </div>
          ) : (
          <div className="mt-3 space-y-2">
            {visibleMedia.map((message) => {
              const itemContent = (
                <>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.035] text-xl">
                    <FilesIcon
                      name={getMediaIconName(
                        message.messageType,
                      )}
                      size={16}
                    />
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

                    <span className="mt-1 block text-[10px] font-semibold text-[#087B7B]">
                      Abrir
                    </span>
                  </div>
                </>
              );

              const className =
                "flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#0A9090]/40 hover:bg-[#ECF8F8]";

              if (
                message.messageType ===
                "imageMessage"
              ) {
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() =>
                      onOpenImage(message)
                    }
                    className={className}
                  >
                    {itemContent}
                  </button>
                );
              }

              if (
                message.messageType ===
                "audioMessage"
              ) {
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() =>
                      onOpenAudio(message)
                    }
                    className={className}
                  >
                    {itemContent}
                  </button>
                );
              }

              if (
                message.messageType ===
                "videoMessage"
              ) {
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() =>
                      onOpenVideo(message)
                    }
                    className={className}
                  >
                    {itemContent}
                  </button>
                );
              }

              if (
                message.messageType ===
                "documentMessage"
              ) {
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() =>
                      onOpenDocument(message)
                    }
                    className={className}
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
      )}

      <section className="mt-8 border-t border-black/10 pt-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
              Financeiro
            </p>

            <h4 className="mt-1 text-sm font-bold">
              Comprovantes
            </h4>
          </div>

          <span className="text-xs text-black/35">
            {receipts.length} comprovante
            {receipts.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {isLoadingReceipts ? (
          <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.015] p-4 text-sm text-black/45">
            Carregando comprovantes...
          </div>
        ) : receiptsError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {receiptsError}
          </div>
        ) : receipts.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-black/15 p-6 text-center">
            <span className="text-black/35">
              <FilesIcon
                name="receipt"
                size={20}
              />
            </span>

            <p className="mt-3 text-sm font-semibold text-black/60">
              Nenhum comprovante encontrado
            </p>

            <p className="mt-1 text-xs leading-5 text-black/40">
              Os comprovantes vinculados a este cliente aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {receipts.map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-xl border border-black/10 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.035] text-black/55">
                    <FilesIcon
                      name="receipt"
                      size={16}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-black/80">
                          {receipt.paymentMethod ||
                            "Comprovante de pagamento"}
                        </p>

                        <p className="mt-1 text-base font-bold text-black/80">
                          {formatReceiptAmount(
                            receipt.amount,
                          )}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${receiptStatusClasses[receipt.status]}`}
                      >
                        {receiptStatusLabels[
                          receipt.status
                        ]}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-black/45">
                      {receipt.identifiedBank && (
                        <p>
                          Banco:{" "}
                          {receipt.identifiedBank}
                        </p>
                      )}

                      <p>
                        Data:{" "}
                        {formatReceiptDate(
                          receipt.paidAt ||
                            receipt.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenReceipt(receipt.id)
                  }
                  className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-[#0A9090] px-4 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Abrir comprovante
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";

import type {
  CustomerTimelineItem,
  CustomerTimelineSource,
} from "@/hooks/customer/useCustomerTimeline";

type CustomerTimelineProps = {
  items: CustomerTimelineItem[];
  total: number;
  isLoading: boolean;
  error: string;
  onReload: () => void;
  conversationHref?: string;
};

type TimelineIconName =
  | "message"
  | "attendance"
  | "receipt"
  | "reminder"
  | "refresh";

function TimelineIcon({
  name,
  className = "h-4 w-4",
}: {
  name: TimelineIconName;
  className?: string;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "message") {
    return (
      <svg {...commonProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      </svg>
    );
  }

  if (name === "attendance") {
    return (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "receipt") {
    return (
      <svg {...commonProps}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (name === "reminder") {
    return (
      <svg {...commonProps}>
        <rect
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
        />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 11" />
      <path d="M4 13l2.4 4.6A7 7 0 0 0 17.9 15" />
    </svg>
  );
}

function getSourceIcon(
  source: CustomerTimelineSource,
): TimelineIconName {
  if (source === "ATTENDANCE") {
    return "attendance";
  }

  if (source === "RECEIPT") {
    return "receipt";
  }

  if (source === "REMINDER") {
    return "reminder";
  }

  return "message";
}

function getSourceLabel(
  source: CustomerTimelineSource,
) {
  if (source === "ATTENDANCE") {
    return "Atendimento";
  }

  if (source === "RECEIPT") {
    return "Financeiro";
  }

  if (source === "REMINDER") {
    return "Pendência";
  }

  return "Conversa";
}

function normalizeBrokenText(
  value: string,
) {
  const replacements: Array<
    [string, string]
  > = [
    ["Análise", "Análise"],
    ["análise", "análise"],
    ["Ãudio", "Áudio"],
    ["áudio", "áudio"],
    ["Pendência", "Pendência"],
    ["pendência", "pendência"],
    ["Observação", "Observação"],
    ["observação", "observação"],
    ["não", "não"],
    ["Não", "Não"],
    ["informação", "informação"],
    ["finalização", "finalização"],
  ];

  return replacements.reduce(
    (text, [broken, fixed]) =>
      text.replaceAll(
        broken,
        fixed,
      ),
    value,
  );
}

function readTextMetadata(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function getAIHandoffDetails(
  item: CustomerTimelineItem,
) {
  if (item.source !== "ATTENDANCE") return null;

  const eventMetadata = item.metadata?.eventMetadata;
  if (
    !eventMetadata ||
    typeof eventMetadata !== "object" ||
    Array.isArray(eventMetadata)
  ) return null;

  const metadata =
    eventMetadata as Record<string, unknown>;

  if (metadata.source !== "AI_HANDOFF") return null;

  return {
    sector: readTextMetadata(metadata.sectorName),
    subject: readTextMetadata(metadata.subject),
    context: readTextMetadata(metadata.context),
  };
}
function formatDayKey(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(
    yesterday.getDate() - 1,
  );

  const sameDay = (
    first: Date,
    second: Date,
  ) =>
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate();

  if (sameDay(date, today)) {
    return "Hoje";
  }

  if (sameDay(date, yesterday)) {
    return "Ontem";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatTime(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function removeVisualDuplicates(
  items: CustomerTimelineItem[],
) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = [
      item.source,
      item.type,
      item.occurredAt,
      item.title,
      item.description ?? "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function groupItems(
  items: CustomerTimelineItem[],
) {
  const groups = new Map<
    string,
    CustomerTimelineItem[]
  >();

  for (
    const item of
    removeVisualDuplicates(items)
  ) {
    const key =
      formatDayKey(item.occurredAt);

    const current =
      groups.get(key) ?? [];

    current.push(item);
    groups.set(key, current);
  }

  return Array.from(
    groups.entries(),
  );
}

export default function CustomerTimeline({
  items,
  total,
  isLoading,
  error,
  onReload,
  conversationHref,
}: CustomerTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#0A9090]" />

        <p className="mt-3 text-sm font-medium text-black/45">
          Carregando linha do tempo...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={onReload}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-700 transition hover:bg-red-100"
        >
          <TimelineIcon
            name="refresh"
            className="h-4 w-4"
          />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white p-7 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-black/[0.035] text-black/40">
          <TimelineIcon
            name="attendance"
            className="h-5 w-5"
          />
        </div>

        <h3 className="mt-3 text-sm font-bold text-[#191919]">
          Nenhum evento registrado
        </h3>

        <p className="mt-1 text-xs leading-5 text-black/45">
          As mensagens, pendências,
          comprovantes e ações do
          atendimento aparecerão aqui.
        </p>
      </div>
    );
  }

  const groups =
    groupItems(items);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
            Histórico operacional
          </p>

          <h3 className="mt-1 text-base font-bold text-[#191919]">
            Linha do tempo
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/[0.045] px-2.5 py-1 text-[10px] font-bold text-black/50">
            {total} eventos
          </span>

          <button
            type="button"
            onClick={onReload}
            title="Atualizar linha do tempo"
            aria-label="Atualizar linha do tempo"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 bg-white text-black/45 transition hover:border-[#0A9090]/25 hover:text-[#087B7B]"
          >
            <TimelineIcon
              name="refresh"
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(
          ([day, dayItems]) => (
            <section key={day}>
              <div className="sticky top-0 z-10 mb-3 bg-white/95 py-1 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/35">
                  {day}
                </p>
              </div>

              <div className="relative space-y-1 pl-3">
                <div className="absolute bottom-4 left-[26px] top-4 w-px bg-black/[0.07]" />

                {dayItems.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="relative flex gap-3 rounded-2xl p-3 transition hover:bg-black/[0.025]"
                    >
                      <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-black/50 shadow-sm">
                        <TimelineIcon
                          name={getSourceIcon(
                            item.source,
                          )}
                          className="h-4 w-4"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold leading-5 text-[#191919]">
                              {normalizeBrokenText(
                                item.title,
                              )}
                            </h4>

                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/30">
                              {getSourceLabel(
                                item.source,
                              )}
                            </p>
                          </div>

                          <time className="shrink-0 pt-0.5 text-[10px] font-semibold text-black/35">
                            {formatTime(
                              item.occurredAt,
                            )}
                          </time>
                        </div>

                        {(() => {
                          const handoff =
                            getAIHandoffDetails(item);

                          if (handoff) {
                            return (
                              <div className="mt-2 rounded-xl border border-[#0A9090]/10 bg-[#F7FBFB] px-3 py-2.5">
                                <div className="space-y-2">
                                  {handoff.sector && (
                                    <p className="text-xs leading-5 text-black/60">
                                      <span className="font-bold text-black/70">Setor:</span>{" "}
                                      {handoff.sector}
                                    </p>
                                  )}
                                  {handoff.subject && (
                                    <p className="text-xs leading-5 text-black/60">
                                      <span className="font-bold text-black/70">Assunto:</span>{" "}
                                      {handoff.subject}
                                    </p>
                                  )}
                                  {handoff.context && (
                                    <p className="break-words text-xs leading-5 text-black/60">
                                      <span className="font-bold text-black/70">Contexto:</span>{" "}
                                      {handoff.context}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return item.description ? (
                            <p className="mt-2 break-words text-xs leading-5 text-black/55">
                              {normalizeBrokenText(item.description)}
                            </p>
                          ) : null;
                        })()}

                        {item.actor?.name && (
                          <p className="mt-2 text-[10px] font-medium text-black/35">
                            Por{" "}
                            <span className="font-bold text-black/50">
                              {item.actor.name}
                            </span>
                          </p>
                        )}
                        {item.source === "MESSAGE" &&
                          conversationHref && (
                            <Link
                              href={conversationHref}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#0A9090]/15 bg-[#F2FAFA] px-2.5 py-1.5 text-[10px] font-bold text-[#087B7B] transition hover:border-[#0A9090]/30 hover:bg-white"
                            >
                              Ver na conversa
                              <span aria-hidden="true">
                                →
                              </span>
                            </Link>
                          )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}

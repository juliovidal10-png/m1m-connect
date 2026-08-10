"use client";

type CustomerHeaderProps = {
  avatar?: string | null;
  name: string;
  customerCode?: number | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  responsible?: string | null;
  status?: string | null;
  lastInteraction?: string | null;
  remindersCount?: number;
  documentsCount?: number;
  onOpenDocuments?: () => void;
};

type HeaderIconName =
  | "phone"
  | "building"
  | "pin"
  | "user"
  | "clock"
  | "folder"
  | "calendar"
  | "hash";

function HeaderIcon({
  name,
  className = "h-3.5 w-3.5",
}: {
  name: HeaderIconName;
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

  if (name === "phone") {
    return (
      <svg {...commonProps}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...commonProps}>
        <path d="M3 21h18M5 21V5l7-3 7 3v16" />
        <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
      </svg>
    );
  }

  if (name === "pin") {
    return (
      <svg {...commonProps}>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "folder") {
    return (
      <svg {...commonProps}>
        <path d="M3 7.5h6l2 2H21v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
      </svg>
    );
  }

  if (name === "hash") {
    return (
      <svg {...commonProps}>
        <path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const normalized =
    (status ?? "IA").toUpperCase();

  const isHuman =
    normalized === "HUMANO";

  return (
    <span
      className={
        isHuman
          ? "inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700"
      }
    >
      <span
        className={
          isHuman
            ? "h-1.5 w-1.5 rounded-full bg-blue-500"
            : "h-1.5 w-1.5 rounded-full bg-emerald-500"
        }
      />

      {isHuman
        ? "Atendimento humano"
        : "IA ativa"}
    </span>
  );
}

export default function CustomerHeader({
  avatar,
  name,
  customerCode,
  phone,
  company,
  city,
  responsible,
  status,
  lastInteraction,
  remindersCount = 0,
  documentsCount = 0,
  onOpenDocuments,
}: CustomerHeaderProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-orange-600">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#191919]">
                {name}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {customerCode !== null &&
                  customerCode !== undefined && (
                    <span className="inline-flex h-7 items-center rounded-lg bg-[#fff3ee] px-2.5 text-[11px] font-bold text-[#e93800] ring-1 ring-[#ff3d00]/10">
                      Cliente #
                      {String(
                        customerCode,
                      ).padStart(6, "0")}
                    </span>
                  )}

                {phone && (
                  <p className="inline-flex h-7 items-center gap-1.5 text-xs text-black/45">
                    <HeaderIcon
                      name="phone"
                      className="h-3.5 w-3.5"
                    />
                    {phone}
                  </p>
                )}
              </div>
            </div>

            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="my-4 h-px bg-black/5" />

      <div className="grid grid-cols-2 gap-3">
        <Info
          icon="building"
          title="Empresa"
          value={company || "Não informada"}
        />

        <Info
          icon="pin"
          title="Cidade"
          value={city || "Não informada"}
        />

        <Info
          icon="user"
          title="Responsável"
          value={responsible || "Não atribuído"}
        />

        <Info
          icon="clock"
          title="Última interação"
          value={
            lastInteraction ||
            "Sem informações"
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Summary
          icon="folder"
          label="Documentos"
          value={documentsCount}
          onClick={onOpenDocuments}
        />

        <Summary
          icon="calendar"
          label="Pendências"
          value={remindersCount}
        />
      </div>
    </div>
  );
}

function Info({
  icon,
  title,
  value,
}: {
  icon: HeaderIconName;
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-black/[0.025] p-3">
      <div className="flex items-center gap-1.5">
        <HeaderIcon
          name={icon}
          className="h-3.5 w-3.5"
        />

        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/35">
          {title}
        </p>
      </div>

      <p className="mt-1.5 break-words text-xs font-semibold text-black/70">
        {value}
      </p>
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
  onClick,
}: {
  icon: HeaderIconName;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <HeaderIcon
          name={icon}
          className="h-4 w-4"
        />

        <span className="text-xs font-semibold text-black/55">
          {label}
        </span>
      </div>

      <strong className="text-sm text-[#191919]">
        {value}
      </strong>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-3 py-2.5 text-left transition hover:border-[#ff3d00]/30 hover:bg-[#fff5f1]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-3 py-2.5">
      {content}
    </div>
  );
}

"use client";

type CustomerActionsProps = {
  attendanceStatus: "IA" | "HUMANO";
  responsible?: string | null;

  isAssigning: boolean;
  isSaving: boolean;
  isLoadingCustomer: boolean;

  customerId?: string | null;
  remoteJid?: string | null;

  canAssumeAttendance: boolean;
  canEditCrm: boolean;

  onAssign: () => void;
  onSave: () => void;
};

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M5 3h12l2 2v16H5z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 21v-7h8v7" />
    </svg>
  );
}

function AssumeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="m16.5 12.5 1.5 1.5 3-3" />
    </svg>
  );
}

export default function CustomerActions({
  attendanceStatus,
  isAssigning,
  isSaving,
  isLoadingCustomer,
  customerId,
  remoteJid,
  canAssumeAttendance,
  canEditCrm,
  onAssign,
  onSave,
}: CustomerActionsProps) {
  const isHuman = attendanceStatus === "HUMANO";

  if (!canAssumeAttendance && !canEditCrm) {
    return null;
  }

  return (
    <footer className="border-t border-black/5 bg-white p-4">
      <div className="space-y-3">
        {canAssumeAttendance && (
          <button
            type="button"
            onClick={onAssign}
            disabled={
              isAssigning ||
              isLoadingCustomer ||
              !customerId
            }
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {!isAssigning && <AssumeIcon />}

            <span>
              {isAssigning
                ? "Assumindo atendimento..."
                : "Assumir atendimento"}
            </span>
          </button>
        )}

        {canEditCrm && (
          <button
            type="button"
            onClick={onSave}
            disabled={
              isSaving ||
              isLoadingCustomer ||
              !remoteJid
            }
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0A9090] text-sm font-semibold text-white transition hover:bg-[#087B7B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {!isSaving && <SaveIcon />}

            <span>
              {isSaving
                ? "Salvando..."
                : "Salvar alterações"}
            </span>
          </button>
        )}
      </div>
    </footer>
  );
}


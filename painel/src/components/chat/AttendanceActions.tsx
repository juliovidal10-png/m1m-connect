"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Sector = {
  id: string;
  name: string;
  active?: boolean;
};

type AuthUser = {
  effectivePermissions?: string[];
};

export type AttendanceAssignment = {
  id: string;
  customerId: string;
  state: "IA" | "HUMANO" | "FINALIZADO";
  responsibleId: string | null;
  sectorId: string | null;
};

type Props = {
  attendanceId?: string | null;
  attendanceState?: string | null;
  currentSectorId?: string | null;
  customerId?: string | null;
  remoteJid?: string | null;
  responsibleId?: string | null;
  onChanged?: (assignment?: AttendanceAssignment) => Promise<void> | void;
};

function hasPermission(
  user: AuthUser | null,
  permission: string,
) {
  return (
    Array.isArray(user?.effectivePermissions) &&
    user.effectivePermissions.includes(permission)
  );
}

export default function AttendanceActions({
  attendanceId,
  attendanceState,
  currentSectorId,
  customerId,
  remoteJid,
  responsibleId,
  onChanged,
}: Props) {
  const [user, setUser] =
    useState<AuthUser | null>(null);
  const [sectors, setSectors] =
    useState<Sector[]>([]);
  const [open, setOpen] =
    useState(false);
  const [busy, setBusy] =
    useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!error) return;

    const timer = window.setTimeout(() => {
      setError("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/sectors").then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([auth, sectorData]) => {
        if (cancelled) return;
        setUser(auth?.user || null);
        setSectors(
          Array.isArray(sectorData)
            ? sectorData
            : Array.isArray(sectorData?.sectors)
              ? sectorData.sectors
              : [],
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Não foi possível carregar as ações do atendimento.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canAssume = useMemo(
    () =>
      Boolean(customerId || remoteJid) &&
      attendanceState !== "FINALIZADO" &&
      !responsibleId &&
      hasPermission(
        user,
        "ASSUME_ATTENDANCE",
      ),
    [
      attendanceState,
      customerId,
      remoteJid,
      responsibleId,
      user,
    ],
  );

  const canTransfer = useMemo(
    () =>
      Boolean(attendanceId) &&
      hasPermission(
        user,
        "TRANSFER_ATTENDANCE",
      ),
    [attendanceId, user],
  );

  const canFinish = useMemo(
    () =>
      attendanceState === "HUMANO" &&
      hasPermission(
        user,
        "CLOSE_ATTENDANCE",
      ),
    [
      attendanceState,
      user,
    ],
  );

  const availableSectors = sectors.filter(
    (sector) =>
      sector.active !== false &&
      sector.id !== currentSectorId,
  );

  if (
    attendanceState === "FINALIZADO" ||
    (!canAssume && !canTransfer && !canFinish)
  ) {
    return null;
  }

  async function assume() {
    if ((!customerId && !remoteJid) || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/customers/assign",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            customerId,
            remoteJid,
            sourceSurface: "CHAT_HEADER",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível assumir o atendimento.",
        );
      }

      if (onChanged) {
        await onChanged(data.attendance);
      } else {
        window.location.reload();
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao assumir atendimento.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function transferTo(sector: Sector) {
    if (!attendanceId || busy) return;

    setBusy(true);
    setTransferPending(true);
    setError("");

    try {
      const requestTransfer = () => fetch("/api/attendance/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, sectorId: sector.id }),
      });

      let response = await requestTransfer();
      let data = await response.json().catch(() => null);

      // The guard returns this specific conflict before the transfer runs.
      for (const delay of [350, 750, 1250]) {
        if (response.status !== 409 || data?.code !== "CONVERSATION_BUSY") break;
        await new Promise<void>(resolve => window.setTimeout(resolve, delay));
        response = await requestTransfer();
        data = await response.json().catch(() => null);
      }

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Não foi possível confirmar a transferência. Confira o setor da conversa antes de tentar novamente.",
        );
      }

      if (data?.attendance?.id !== attendanceId || data.attendance.sectorId !== sector.id) {
        if (onChanged) await onChanged();
        throw new Error("O servidor não confirmou o setor de destino. Confira a conversa antes de tentar novamente.");
      }

      setOpen(false);
      if (onChanged) await onChanged(data.attendance);
      else window.location.reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao transferir atendimento.",
      );
    } finally {
      setTransferPending(false);
      setBusy(false);
    }
  }

  async function finish() {
    if (!attendanceId || busy) return;

    const confirmed = window.confirm(
      "Finalizar este atendimento?",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const requestFinish = () => fetch(
        "/api/attendance/finish",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            attendanceId,
          }),
        },
      );

      let response = await requestFinish();
      let data = await response.json().catch(() => null);

      const isRetryableConflict = (code: unknown) =>
        code === "CONVERSATION_BUSY" ||
        code === "ATTENDANCE_LOCK_TIMEOUT";

      // Esses conflitos acontecem antes de a finalização ser executada.
      for (
        let retry = 0;
        retry < 2 &&
        response.status === 409 &&
        isRetryableConflict(data?.code);
        retry += 1
      ) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 400 * (retry + 1)),
        );
        response = await requestFinish();
        data = await response.json().catch(() => null);
      }

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : `Não foi possível confirmar a finalização (HTTP ${response.status}). Confira o estado da conversa antes de tentar novamente.`,
        );
      }

      if (data?.attendance?.id !== attendanceId || data.attendance.state !== "FINALIZADO") {
        if (onChanged) await onChanged();
        throw new Error("O servidor não confirmou a finalização. Confira o estado da conversa antes de tentar novamente.");
      }

      if (onChanged) await onChanged(data.attendance);
      else window.location.reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao finalizar atendimento.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-w-0 max-w-full flex-wrap items-center justify-start gap-2 md:justify-end">
      {canAssume && (
        <button
          type="button"
          disabled={busy}
          onClick={assume}
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[#0A9090] px-3 text-[11px] font-bold text-white transition hover:bg-[#087B7B] disabled:opacity-50 md:h-9 md:px-2.5 xl:h-10 xl:px-3 xl:text-xs"
        >
          {busy ? "Aguarde..." : "Assumir atendimento"}
        </button>
      )}

      {canTransfer && (
        <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setOpen((value) => !value)
            }
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 text-[11px] font-bold text-black/60 transition hover:border-[#0A9090]/30 hover:bg-[#F2FAFA] hover:text-[#087B7B] disabled:opacity-50 md:h-9 md:px-2.5 xl:h-10 xl:px-3 xl:text-xs"
          >
            {transferPending ? "Transferindo..." : "Transferir"}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-[150] w-56 overflow-hidden rounded-xl border border-black/10 bg-white p-2 shadow-xl">
              <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wide text-black/40">
                Transferir para
              </p>

              {availableSectors.length > 0 ? (
                availableSectors.map(
                  (sector) => (
                    <button
                      key={sector.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        transferTo(sector)
                      }
                      className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-black/70 transition hover:bg-[#F2FAFA] hover:text-[#087B7B] disabled:opacity-50"
                    >
                      {sector.name}
                    </button>
                  ),
                )
              ) : (
                <p className="px-3 py-2 text-xs text-black/40">
                  Nenhum outro setor disponível.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {canFinish && (
        <button
          type="button"
          disabled={busy}
          onClick={finish}
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 text-[11px] font-bold text-black/60 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 md:h-9 md:px-2.5 xl:h-10 xl:px-3 xl:text-xs"
        >
          {busy ? "Aguarde..." : "Finalizar"}
        </button>
      )}

      {error && (
        <div className="absolute right-0 top-12 z-[160] w-72 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

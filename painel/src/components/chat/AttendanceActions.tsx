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

type Props = {
  attendanceId?: string | null;
  attendanceState?: string | null;
  currentSectorId?: string | null;
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
}: Props) {
  const [user, setUser] =
    useState<AuthUser | null>(null);
  const [sectors, setSectors] =
    useState<Sector[]>([]);
  const [open, setOpen] =
    useState(false);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

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

  const canTransfer = useMemo(
    () =>
      hasPermission(
        user,
        "TRANSFER_ATTENDANCE",
      ),
    [user],
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
    !attendanceId ||
    attendanceState === "FINALIZADO" ||
    (!canTransfer && !canFinish)
  ) {
    return null;
  }

  async function transferTo(
    sector: Sector,
  ) {
    if (!attendanceId || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/attendance/transfer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            attendanceId,
            sectorId: sector.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível transferir o atendimento.",
        );
      }

      setOpen(false);
      window.location.reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Erro ao transferir atendimento.",
      );
    } finally {
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
      const response = await fetch(
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível finalizar o atendimento.",
        );
      }

      window.location.reload();
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
    <div className="relative flex items-center gap-2">
      {canTransfer && (
        <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setOpen((value) => !value)
            }
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/60 transition hover:border-[#0A9090]/30 hover:bg-[#F2FAFA] hover:text-[#087B7B] disabled:opacity-50"
          >
            Transferir
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
          className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-black/60 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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

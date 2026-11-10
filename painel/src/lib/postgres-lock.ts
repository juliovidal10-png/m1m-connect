export function isPostgresLockTimeout(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const failure = error as {
    code?: string;
    meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } };
    cause?: { originalCode?: string };
  };
  return failure.code === "55P03" ||
    failure.meta?.code === "55P03" ||
    failure.meta?.driverAdapterError?.cause?.originalCode === "55P03" ||
    failure.cause?.originalCode === "55P03";
}

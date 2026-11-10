import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isPostgresLockTimeout } from "@/lib/postgres-lock";

export const ATTENDANCE_BUSY_MESSAGE =
  "O atendimento está sendo atualizado. Tente novamente em instantes.";

export async function runAttendanceMutation<T>(
  companyId: string,
  target: { customerId: string } | { attendanceId: string },
  work: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const attempt = () => prisma.$transaction(async db => {
    await db.$executeRaw`SET LOCAL lock_timeout = '750ms'`;
    const customerId = "customerId" in target
      ? target.customerId
      : (await db.m1MAttendance.findFirst({
          where: { companyId, id: target.attendanceId },
          select: { customerId: true },
        }))?.customerId;
    if (customerId) {
      // Match the customer-first lock order used by conversation deletion.
      await db.$queryRaw`SELECT id FROM m1m_customers
        WHERE "companyId" = ${companyId} AND id = ${customerId} FOR NO KEY UPDATE`;
    }
    return work(db);
  });

  try {
    return await attempt();
  } catch (error) {
    if (!isPostgresLockTimeout(error)) throw error;
    // A rejected transaction has rolled back all writes before the retry.
    await new Promise(resolve => setTimeout(resolve, 120));
    return attempt();
  }
}

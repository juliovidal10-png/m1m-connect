-- CreateEnum
CREATE TYPE "M1MAttendanceState" AS ENUM ('IA', 'HUMANO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "M1MAttendanceEventType" AS ENUM ('STARTED_BY_AI', 'TAKEN_BY_HUMAN', 'FINISHED_BY_HUMAN', 'FINISHED_BY_AI');

-- CreateEnum
CREATE TYPE "M1MAttendanceActorType" AS ENUM ('AI', 'USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "m1m_attendances" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "responsibleId" TEXT,
    "state" "M1MAttendanceState" NOT NULL DEFAULT 'IA',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_attendance_events" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "type" "M1MAttendanceEventType" NOT NULL,
    "actorType" "M1MAttendanceActorType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_attendances_number_key" ON "m1m_attendances"("number");

-- CreateIndex
CREATE INDEX "m1m_attendances_companyId_idx" ON "m1m_attendances"("companyId");

-- CreateIndex
CREATE INDEX "m1m_attendances_customerId_idx" ON "m1m_attendances"("customerId");

-- CreateIndex
CREATE INDEX "m1m_attendances_responsibleId_idx" ON "m1m_attendances"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_attendances_state_idx" ON "m1m_attendances"("state");

-- CreateIndex
CREATE INDEX "m1m_attendances_startedAt_idx" ON "m1m_attendances"("startedAt");

-- CreateIndex
CREATE INDEX "m1m_attendances_finishedAt_idx" ON "m1m_attendances"("finishedAt");

-- CreateIndex
CREATE INDEX "m1m_attendances_companyId_customerId_idx" ON "m1m_attendances"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "m1m_attendance_events_attendanceId_idx" ON "m1m_attendance_events"("attendanceId");

-- CreateIndex
CREATE INDEX "m1m_attendance_events_type_idx" ON "m1m_attendance_events"("type");

-- CreateIndex
CREATE INDEX "m1m_attendance_events_actorId_idx" ON "m1m_attendance_events"("actorId");

-- CreateIndex
CREATE INDEX "m1m_attendance_events_createdAt_idx" ON "m1m_attendance_events"("createdAt");

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendance_events" ADD CONSTRAINT "m1m_attendance_events_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendance_events" ADD CONSTRAINT "m1m_attendance_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

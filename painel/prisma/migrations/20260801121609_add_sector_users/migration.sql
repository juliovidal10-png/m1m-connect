-- CreateTable
CREATE TABLE "m1m_sector_users" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_sector_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_sector_users_sectorId_idx" ON "m1m_sector_users"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_users_userId_idx" ON "m1m_sector_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_users_sectorId_userId_key" ON "m1m_sector_users"("sectorId", "userId");

-- AddForeignKey
ALTER TABLE "m1m_sector_users" ADD CONSTRAINT "m1m_sector_users_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sector_users" ADD CONSTRAINT "m1m_sector_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "m1m_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

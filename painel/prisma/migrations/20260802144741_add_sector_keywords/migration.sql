-- CreateTable
CREATE TABLE "m1m_sector_keywords" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_sector_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "m1m_sector_keywords_sectorId_idx" ON "m1m_sector_keywords"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_keywords_keyword_idx" ON "m1m_sector_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_keywords_sectorId_keyword_key" ON "m1m_sector_keywords"("sectorId", "keyword");

-- AddForeignKey
ALTER TABLE "m1m_sector_keywords" ADD CONSTRAINT "m1m_sector_keywords_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

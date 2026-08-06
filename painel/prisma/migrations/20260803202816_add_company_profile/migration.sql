-- CreateTable
CREATE TABLE "m1m_company_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "presentation" TEXT,
    "differentials" TEXT,
    "productsServices" TEXT,
    "targetAudience" TEXT,
    "serviceArea" TEXT,
    "companyPolicies" TEXT,
    "importantInformation" TEXT,
    "frequentlyAskedQuestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_company_profiles_companyId_key" ON "m1m_company_profiles"("companyId");

-- CreateIndex
CREATE INDEX "m1m_company_profiles_companyId_idx" ON "m1m_company_profiles"("companyId");

-- AddForeignKey
ALTER TABLE "m1m_company_profiles" ADD CONSTRAINT "m1m_company_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

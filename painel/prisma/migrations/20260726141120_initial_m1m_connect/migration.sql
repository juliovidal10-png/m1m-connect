-- CreateTable
CREATE TABLE "m1m_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_customers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "city" TEXT,
    "responsible" TEXT,
    "observations" TEXT,
    "status" TEXT DEFAULT 'IA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_companies_slug_key" ON "m1m_companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_users_email_key" ON "m1m_users"("email");

-- CreateIndex
CREATE INDEX "m1m_users_companyId_idx" ON "m1m_users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_customers_remoteJid_key" ON "m1m_customers"("remoteJid");

-- CreateIndex
CREATE INDEX "m1m_customers_companyId_idx" ON "m1m_customers"("companyId");

-- CreateIndex
CREATE INDEX "m1m_customers_remoteJid_idx" ON "m1m_customers"("remoteJid");

-- AddForeignKey
ALTER TABLE "m1m_users" ADD CONSTRAINT "m1m_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_customers" ADD CONSTRAINT "m1m_customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

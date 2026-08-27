-- CreateTable
CREATE TABLE "m1m_access_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_access_tokens_tokenHash_key"
ON "m1m_access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_userId_idx"
ON "m1m_access_tokens"("userId");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_purpose_idx"
ON "m1m_access_tokens"("purpose");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_expiresAt_idx"
ON "m1m_access_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "m1m_access_tokens"
ADD CONSTRAINT "m1m_access_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "m1m_users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
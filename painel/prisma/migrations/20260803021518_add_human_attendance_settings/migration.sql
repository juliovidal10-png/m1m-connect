-- CreateEnum
CREATE TYPE "M1MHumanReturnMode" AS ENUM ('IMMEDIATE', 'NEXT_CONVERSATION', 'MANUAL');

-- AlterTable
ALTER TABLE "m1m_companies" ADD COLUMN     "humanClosingMessage" TEXT,
ADD COLUMN     "humanReturnMode" "M1MHumanReturnMode" NOT NULL DEFAULT 'NEXT_CONVERSATION';

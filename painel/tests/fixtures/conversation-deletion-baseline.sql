-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "M1MSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "M1MBillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "M1MSubscriptionEventType" AS ENUM ('ACTIVATION', 'RENEWAL');

-- CreateEnum
CREATE TYPE "M1MHumanReturnMode" AS ENUM ('IMMEDIATE', 'NEXT_CONVERSATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "M1MAttendanceState" AS ENUM ('IA', 'HUMANO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "M1MAttendanceEventType" AS ENUM ('STARTED_BY_AI', 'TRANSFERRED_TO_SECTOR', 'TAKEN_BY_HUMAN', 'FINISHED_BY_HUMAN', 'FINISHED_BY_AI');

-- CreateEnum
CREATE TYPE "M1MAttendanceActorType" AS ENUM ('AI', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "M1MMessageDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "M1MMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER', 'REACTION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "M1MMessageFlagType" AS ENUM ('FAVORITE', 'PINNED');

-- CreateEnum
CREATE TYPE "M1MPaymentReceiptStatus" AS ENUM ('RECEIVED', 'CLASSIFIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'AWAITING_NEW_RECEIPT', 'CUSTOMER_NOTIFIED', 'FINISHED');

-- CreateEnum
CREATE TYPE "M1MPaymentReceiptEventType" AS ENUM ('RECEIVED', 'CLASSIFIED', 'REVIEW_STARTED', 'APPROVED', 'REJECTED', 'AWAITING_NEW_RECEIPT', 'CUSTOMER_NOTIFIED', 'FINISHED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "M1MWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "M1MUserPermission" AS ENUM ('VIEW_ALL_CONVERSATIONS', 'ASSUME_ATTENDANCE', 'TRANSFER_ATTENDANCE', 'CLOSE_ATTENDANCE', 'EDIT_CRM', 'VIEW_RECEIPTS', 'DELETE_CUSTOMERS', 'DELETE_MESSAGES', 'MANAGE_USERS', 'MANAGE_SECTORS', 'MANAGE_HOURS', 'MANAGE_AI', 'MANAGE_KNOWLEDGE', 'ACCESS_SETTINGS');

-- CreateEnum
CREATE TYPE "M1MUserRole" AS ENUM ('ADMIN', 'MANAGER', 'ATTENDANT', 'FINANCE');

-- CreateEnum
CREATE TYPE "M1MMessageAuthorType" AS ENUM ('CUSTOMER', 'HUMAN', 'AI');

-- CreateTable
CREATE TABLE "m1m_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "segment" TEXT,
    "presentation" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "locationLink" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "outOfHoursMessage" TEXT,
    "humanReturnMode" "M1MHumanReturnMode" NOT NULL DEFAULT 'NEXT_CONVERSATION',
    "humanClosingMessage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionStatus" "M1MSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "accessEndsAt" TIMESTAMP(3),
    "planName" TEXT,
    "subscriptionPriceCents" INTEGER,
    "billingCycle" "M1MBillingCycle",
    "subscriptionStartedAt" TIMESTAMP(3),
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "agentInstructions" TEXT,
    "whatsappInstanceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_companies_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "m1m_payment_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "acceptsPix" BOOLEAN NOT NULL DEFAULT false,
    "acceptsCash" BOOLEAN NOT NULL DEFAULT false,
    "acceptsCreditCard" BOOLEAN NOT NULL DEFAULT false,
    "acceptsDebitCard" BOOLEAN NOT NULL DEFAULT false,
    "acceptsBankSlip" BOOLEAN NOT NULL DEFAULT false,
    "acceptsBankTransfer" BOOLEAN NOT NULL DEFAULT false,
    "pixKeyType" TEXT,
    "pixKey" TEXT,
    "pixHolderName" TEXT,
    "pixHolderDocument" TEXT,
    "bankName" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "bankAccountType" TEXT,
    "maxInstallments" INTEGER,
    "installmentInterest" TEXT,
    "paymentDeadline" TEXT,
    "receiptInstructions" TEXT,
    "billingRules" TEXT,
    "additionalInformation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_sectors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "knowledge" TEXT,
    "useCustomSchedule" BOOLEAN NOT NULL DEFAULT false,
    "useCustomOutOfHoursMessage" BOOLEAN NOT NULL DEFAULT false,
    "outOfHoursMessage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_sector_keywords" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_sector_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_company_schedules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dayOfWeek" "M1MWeekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "secondOpeningTime" TEXT,
    "secondClosingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_company_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_sector_schedules" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "dayOfWeek" "M1MWeekday" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "secondOpeningTime" TEXT,
    "secondClosingTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_sector_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "role" "M1MUserRole" NOT NULL DEFAULT 'ATTENDANT',
    "useCustomPermissions" BOOLEAN NOT NULL DEFAULT false,
    "permissions" "M1MUserPermission"[] DEFAULT ARRAY[]::"M1MUserPermission"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_users_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "m1m_sector_users" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_sector_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_customers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerCode" INTEGER,
    "remoteJid" TEXT NOT NULL,
    "name" TEXT,
    "nameManuallySet" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "company" TEXT,
    "city" TEXT,
    "responsible" TEXT,
    "responsibleId" TEXT,
    "observations" TEXT,
    "status" TEXT DEFAULT 'IA',
    "assignedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_reminders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "responsible" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_attendances" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "responsibleId" TEXT,
    "sectorId" TEXT,
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

-- CreateTable
CREATE TABLE "m1m_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "instanceName" TEXT NOT NULL,
    "evolutionMessageId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "direction" "M1MMessageDirection" NOT NULL,
    "type" "M1MMessageType" NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "authorType" "M1MMessageAuthorType",
    "authorId" TEXT,
    "authorName" TEXT,
    "content" TEXT,
    "audioTranscription" TEXT,
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "rawPayload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_message_flags" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "M1MMessageFlagType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_message_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_payment_receipts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "messageId" TEXT,
    "responsibleId" TEXT,
    "status" "M1MPaymentReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "fileName" TEXT,
    "amount" DECIMAL(14,2),
    "paymentMethod" TEXT,
    "identifiedBank" TEXT,
    "paidAt" TIMESTAMP(3),
    "observations" TEXT,
    "rejectionReason" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "reviewStartedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "customerNotifiedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m1m_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_payment_receipt_events" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "type" "M1MPaymentReceiptEventType" NOT NULL,
    "actorType" "M1MAttendanceActorType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_payment_receipt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_subscription_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "M1MSubscriptionEventType" NOT NULL,
    "planName" TEXT,
    "amountCents" INTEGER,
    "billingCycle" "M1MBillingCycle",
    "previousAccessEndsAt" TIMESTAMP(3),
    "newAccessEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_subscription_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscriptionEventId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m1m_legal_acceptances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m1m_legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "m1m_companies_slug_key" ON "m1m_companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_companies_whatsappInstanceName_key" ON "m1m_companies"("whatsappInstanceName");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_company_profiles_companyId_key" ON "m1m_company_profiles"("companyId");

-- CreateIndex
CREATE INDEX "m1m_company_profiles_companyId_idx" ON "m1m_company_profiles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_payment_settings_companyId_key" ON "m1m_payment_settings"("companyId");

-- CreateIndex
CREATE INDEX "m1m_payment_settings_companyId_idx" ON "m1m_payment_settings"("companyId");

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_idx" ON "m1m_sectors"("companyId");

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_active_idx" ON "m1m_sectors"("companyId", "active");

-- CreateIndex
CREATE INDEX "m1m_sectors_companyId_sortOrder_idx" ON "m1m_sectors"("companyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sectors_companyId_name_key" ON "m1m_sectors"("companyId", "name");

-- CreateIndex
CREATE INDEX "m1m_sector_keywords_sectorId_idx" ON "m1m_sector_keywords"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_keywords_keyword_idx" ON "m1m_sector_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_keywords_sectorId_keyword_key" ON "m1m_sector_keywords"("sectorId", "keyword");

-- CreateIndex
CREATE INDEX "m1m_company_schedules_companyId_idx" ON "m1m_company_schedules"("companyId");

-- CreateIndex
CREATE INDEX "m1m_company_schedules_companyId_enabled_idx" ON "m1m_company_schedules"("companyId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_company_schedules_companyId_dayOfWeek_key" ON "m1m_company_schedules"("companyId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "m1m_sector_schedules_sectorId_idx" ON "m1m_sector_schedules"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_schedules_sectorId_enabled_idx" ON "m1m_sector_schedules"("sectorId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_schedules_sectorId_dayOfWeek_key" ON "m1m_sector_schedules"("sectorId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_users_email_key" ON "m1m_users"("email");

-- CreateIndex
CREATE INDEX "m1m_users_companyId_idx" ON "m1m_users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_access_tokens_tokenHash_key" ON "m1m_access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_userId_idx" ON "m1m_access_tokens"("userId");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_purpose_idx" ON "m1m_access_tokens"("purpose");

-- CreateIndex
CREATE INDEX "m1m_access_tokens_expiresAt_idx" ON "m1m_access_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "m1m_sector_users_sectorId_idx" ON "m1m_sector_users"("sectorId");

-- CreateIndex
CREATE INDEX "m1m_sector_users_userId_idx" ON "m1m_sector_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_sector_users_sectorId_userId_key" ON "m1m_sector_users"("sectorId", "userId");

-- CreateIndex
CREATE INDEX "m1m_customers_companyId_idx" ON "m1m_customers"("companyId");

-- CreateIndex
CREATE INDEX "m1m_customers_remoteJid_idx" ON "m1m_customers"("remoteJid");

-- CreateIndex
CREATE INDEX "m1m_customers_responsibleId_idx" ON "m1m_customers"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_customers_status_idx" ON "m1m_customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_customers_companyId_customerCode_key" ON "m1m_customers"("companyId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_customers_companyId_remoteJid_key" ON "m1m_customers"("companyId", "remoteJid");

-- CreateIndex
CREATE INDEX "m1m_reminders_companyId_idx" ON "m1m_reminders"("companyId");

-- CreateIndex
CREATE INDEX "m1m_reminders_customerId_idx" ON "m1m_reminders"("customerId");

-- CreateIndex
CREATE INDEX "m1m_reminders_remindAt_idx" ON "m1m_reminders"("remindAt");

-- CreateIndex
CREATE INDEX "m1m_reminders_status_idx" ON "m1m_reminders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_attendances_number_key" ON "m1m_attendances"("number");

-- CreateIndex
CREATE INDEX "m1m_attendances_companyId_idx" ON "m1m_attendances"("companyId");

-- CreateIndex
CREATE INDEX "m1m_attendances_customerId_idx" ON "m1m_attendances"("customerId");

-- CreateIndex
CREATE INDEX "m1m_attendances_responsibleId_idx" ON "m1m_attendances"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_attendances_sectorId_idx" ON "m1m_attendances"("sectorId");

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

-- CreateIndex
CREATE INDEX "m1m_messages_companyId_idx" ON "m1m_messages"("companyId");

-- CreateIndex
CREATE INDEX "m1m_messages_customerId_idx" ON "m1m_messages"("customerId");

-- CreateIndex
CREATE INDEX "m1m_messages_attendanceId_idx" ON "m1m_messages"("attendanceId");

-- CreateIndex
CREATE INDEX "m1m_messages_remoteJid_idx" ON "m1m_messages"("remoteJid");

-- CreateIndex
CREATE INDEX "m1m_messages_direction_idx" ON "m1m_messages"("direction");

-- CreateIndex
CREATE INDEX "m1m_messages_authorType_idx" ON "m1m_messages"("authorType");

-- CreateIndex
CREATE INDEX "m1m_messages_authorId_idx" ON "m1m_messages"("authorId");

-- CreateIndex
CREATE INDEX "m1m_messages_type_idx" ON "m1m_messages"("type");

-- CreateIndex
CREATE INDEX "m1m_messages_sentAt_idx" ON "m1m_messages"("sentAt");

-- CreateIndex
CREATE INDEX "m1m_messages_processingStartedAt_idx" ON "m1m_messages"("processingStartedAt");

-- CreateIndex
CREATE INDEX "m1m_messages_processedAt_idx" ON "m1m_messages"("processedAt");

-- CreateIndex
CREATE INDEX "m1m_messages_companyId_remoteJid_sentAt_idx" ON "m1m_messages"("companyId", "remoteJid", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_messages_companyId_instanceName_evolutionMessageId_key" ON "m1m_messages"("companyId", "instanceName", "evolutionMessageId");

-- CreateIndex
CREATE INDEX "m1m_message_flags_companyId_idx" ON "m1m_message_flags"("companyId");

-- CreateIndex
CREATE INDEX "m1m_message_flags_messageId_idx" ON "m1m_message_flags"("messageId");

-- CreateIndex
CREATE INDEX "m1m_message_flags_type_idx" ON "m1m_message_flags"("type");

-- CreateIndex
CREATE INDEX "m1m_message_flags_companyId_type_createdAt_idx" ON "m1m_message_flags"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_message_flags_companyId_messageId_type_key" ON "m1m_message_flags"("companyId", "messageId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_payment_receipts_messageId_key" ON "m1m_payment_receipts"("messageId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_idx" ON "m1m_payment_receipts"("companyId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_customerId_idx" ON "m1m_payment_receipts"("customerId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_attendanceId_idx" ON "m1m_payment_receipts"("attendanceId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_responsibleId_idx" ON "m1m_payment_receipts"("responsibleId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_status_idx" ON "m1m_payment_receipts"("status");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_createdAt_idx" ON "m1m_payment_receipts"("createdAt");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_status_idx" ON "m1m_payment_receipts"("companyId", "status");

-- CreateIndex
CREATE INDEX "m1m_payment_receipts_companyId_customerId_idx" ON "m1m_payment_receipts"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_receiptId_idx" ON "m1m_payment_receipt_events"("receiptId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_type_idx" ON "m1m_payment_receipt_events"("type");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_actorId_idx" ON "m1m_payment_receipt_events"("actorId");

-- CreateIndex
CREATE INDEX "m1m_payment_receipt_events_createdAt_idx" ON "m1m_payment_receipt_events"("createdAt");

-- CreateIndex
CREATE INDEX "m1m_subscription_events_companyId_createdAt_idx" ON "m1m_subscription_events"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "m1m_subscription_payments_companyId_paidAt_idx" ON "m1m_subscription_payments"("companyId", "paidAt");

-- CreateIndex
CREATE INDEX "m1m_subscription_payments_subscriptionEventId_idx" ON "m1m_subscription_payments"("subscriptionEventId");

-- CreateIndex
CREATE INDEX "m1m_legal_acceptances_companyId_idx" ON "m1m_legal_acceptances"("companyId");

-- CreateIndex
CREATE INDEX "m1m_legal_acceptances_userId_idx" ON "m1m_legal_acceptances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "m1m_legal_acceptances_companyId_userId_document_version_key" ON "m1m_legal_acceptances"("companyId", "userId", "document", "version");

-- AddForeignKey
ALTER TABLE "m1m_company_profiles" ADD CONSTRAINT "m1m_company_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_settings" ADD CONSTRAINT "m1m_payment_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sectors" ADD CONSTRAINT "m1m_sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sector_keywords" ADD CONSTRAINT "m1m_sector_keywords_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_company_schedules" ADD CONSTRAINT "m1m_company_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sector_schedules" ADD CONSTRAINT "m1m_sector_schedules_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_users" ADD CONSTRAINT "m1m_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_access_tokens" ADD CONSTRAINT "m1m_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "m1m_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sector_users" ADD CONSTRAINT "m1m_sector_users_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_sector_users" ADD CONSTRAINT "m1m_sector_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "m1m_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_customers" ADD CONSTRAINT "m1m_customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_customers" ADD CONSTRAINT "m1m_customers_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_reminders" ADD CONSTRAINT "m1m_reminders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_reminders" ADD CONSTRAINT "m1m_reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendances" ADD CONSTRAINT "m1m_attendances_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m1m_sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendance_events" ADD CONSTRAINT "m1m_attendance_events_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_attendance_events" ADD CONSTRAINT "m1m_attendance_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_messages" ADD CONSTRAINT "m1m_messages_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_message_flags" ADD CONSTRAINT "m1m_message_flags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_message_flags" ADD CONSTRAINT "m1m_message_flags_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "m1m_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "m1m_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "m1m_attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "m1m_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipts" ADD CONSTRAINT "m1m_payment_receipts_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipt_events" ADD CONSTRAINT "m1m_payment_receipt_events_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "m1m_payment_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_payment_receipt_events" ADD CONSTRAINT "m1m_payment_receipt_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "m1m_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_subscription_events" ADD CONSTRAINT "m1m_subscription_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_subscription_payments" ADD CONSTRAINT "m1m_subscription_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_subscription_payments" ADD CONSTRAINT "m1m_subscription_payments_subscriptionEventId_fkey" FOREIGN KEY ("subscriptionEventId") REFERENCES "m1m_subscription_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_legal_acceptances" ADD CONSTRAINT "m1m_legal_acceptances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "m1m_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m1m_legal_acceptances" ADD CONSTRAINT "m1m_legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "m1m_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


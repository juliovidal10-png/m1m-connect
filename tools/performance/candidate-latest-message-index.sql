-- CANDIDATE ONLY. Do not apply to production before isolated validation and owner approval.
-- Run outside a transaction. No IF NOT EXISTS: a same-name invalid/different index must fail.
CREATE INDEX CONCURRENTLY "m1m_messages_customerId_sentAt_idx"
ON "m1m_messages" ("customerId", "sentAt");

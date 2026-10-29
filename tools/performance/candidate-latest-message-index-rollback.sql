-- CANDIDATE ROLLBACK ONLY. Review index ownership/definition before any production execution.
-- Run outside a transaction. Does not delete messages; removes only the candidate index.
DROP INDEX CONCURRENTLY "m1m_messages_customerId_sentAt_idx";

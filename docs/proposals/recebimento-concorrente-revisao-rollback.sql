-- PROPOSTA DE REVERSAO. NAO EXECUTADA. EXIGE AUTORIZACAO ESPECIFICA.
-- Nao remover dados para permitir rollback. Qualquer registro novo bloqueia esta reversao.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
LOCK TABLE public.m1m_conversation_deletion_reviews IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.m1m_conversation_deletion_reviews WHERE reason='CONCURRENT_RECEIPT')
    THEN RAISE EXCEPTION 'ROLLBACK_BLOCKED_PRESERVE_CONCURRENT_RECEIPTS'; END IF;
END;
$rollback$;
ALTER TABLE public.m1m_conversation_deletion_reviews
  DROP CONSTRAINT m1m_conversation_deletion_reviews_reason_check,
  DROP CONSTRAINT m1m_conversation_deletion_reviews_identity_link_check,
  ADD CONSTRAINT m1m_conversation_deletion_reviews_reason_check
    CHECK (reason IN ('UNCERTAIN_ORIGIN','UNRESOLVED_IDENTITY')),
  ADD CONSTRAINT m1m_conversation_deletion_reviews_identity_link_check
    CHECK ("deletionId" IS NOT NULL OR reason='UNRESOLVED_IDENTITY');
COMMIT;

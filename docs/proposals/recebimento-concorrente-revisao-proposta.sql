-- PROPOSTA ADICIONAL. NAO EXECUTADA. EXIGE AUTORIZACAO ESPECIFICA.
-- Somente para banco novo/isolado nesta proxima etapa; nunca executar em compartilhado.
-- Pre-requisito: SQL original da candidata R2.8 aplicado neste banco isolado.
-- Sem tabelas/colunas/indices novos. Sem backfill ou alteracao de linhas.
-- Permite revisao duravel quando ainda nao se conhece o resultado da exclusao concorrente.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
DO $proposal$
DECLARE
  target_table regclass := to_regclass('public.m1m_conversation_deletion_reviews');
  reason_att smallint;
  deletion_att smallint;
  reason_name text;
  identity_name text;
  matches integer;
BEGIN
  IF target_table IS NULL THEN RAISE EXCEPTION 'REVIEW_TABLE_REQUIRED'; END IF;
  SELECT attnum INTO reason_att FROM pg_attribute WHERE attrelid=target_table AND attname='reason' AND NOT attisdropped;
  SELECT attnum INTO deletion_att FROM pg_attribute WHERE attrelid=target_table AND attname='deletionId' AND NOT attisdropped;
  IF reason_att IS NULL OR deletion_att IS NULL THEN RAISE EXCEPTION 'REVIEW_SCHEMA_DIVERGENT'; END IF;

  SELECT count(*),min(conname::text) INTO matches,reason_name FROM pg_constraint
    WHERE conrelid=target_table AND contype='c' AND conkey=ARRAY[reason_att]::smallint[]
      AND position('UNCERTAIN_ORIGIN' IN pg_get_constraintdef(oid))>0
      AND position('UNRESOLVED_IDENTITY' IN pg_get_constraintdef(oid))>0
      AND position('CONCURRENT_RECEIPT' IN pg_get_constraintdef(oid))=0;
  IF matches<>1 THEN RAISE EXCEPTION 'EXPECTED_ORIGINAL_REASON_CHECK'; END IF;

  SELECT count(*),min(conname::text) INTO matches,identity_name FROM pg_constraint
    WHERE conrelid=target_table AND contype='c'
      AND conkey @> ARRAY[reason_att,deletion_att]::smallint[] AND cardinality(conkey)=2
      AND position('UNRESOLVED_IDENTITY' IN pg_get_constraintdef(oid))>0
      AND position('IS NOT NULL' IN pg_get_constraintdef(oid))>0
      AND position('CONCURRENT_RECEIPT' IN pg_get_constraintdef(oid))=0;
  IF matches<>1 THEN RAISE EXCEPTION 'EXPECTED_ORIGINAL_IDENTITY_CHECK'; END IF;

  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, DROP CONSTRAINT %I',target_table,reason_name,identity_name);
  ALTER TABLE public.m1m_conversation_deletion_reviews
    ADD CONSTRAINT m1m_conversation_deletion_reviews_reason_check
      CHECK (reason IN ('UNCERTAIN_ORIGIN','UNRESOLVED_IDENTITY','CONCURRENT_RECEIPT')),
    ADD CONSTRAINT m1m_conversation_deletion_reviews_identity_link_check
      CHECK ("deletionId" IS NOT NULL OR reason IN ('UNRESOLVED_IDENTITY','CONCURRENT_RECEIPT'));
END;
$proposal$;
COMMIT;

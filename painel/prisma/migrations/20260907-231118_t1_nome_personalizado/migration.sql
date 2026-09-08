-- T1 - Protege o nome definido manualmente pela empresa contra sobrescrita automatica.
ALTER TABLE "m1m_customers"
ADD COLUMN "nameManuallySet" BOOLEAN NOT NULL DEFAULT false;
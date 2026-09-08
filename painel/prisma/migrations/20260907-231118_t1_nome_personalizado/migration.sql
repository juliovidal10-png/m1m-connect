-- T1 - Protege o nome definido manualmente pela empresa contra sobrescrita automatica.
ALTER TABLE "M1MCustomer"
ADD COLUMN "nameManuallySet" BOOLEAN NOT NULL DEFAULT false;
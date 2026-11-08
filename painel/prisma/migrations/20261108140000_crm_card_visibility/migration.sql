-- A CRM card is a view of a customer. Removal never deletes the customer or its relations.
ALTER TABLE "m1m_customers"
  ADD COLUMN "crmCardRemovedAt" TIMESTAMP(3),
  ADD COLUMN "crmManuallyAddedAt" TIMESTAMP(3);

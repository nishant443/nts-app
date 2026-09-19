-- Expenses are claimed against a customer rather than a work report.
ALTER TABLE "expenses" ADD COLUMN "customerId" TEXT;

CREATE INDEX "expenses_customerId_idx" ON "expenses"("customerId");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

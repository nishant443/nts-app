-- One claim now holds several category lines. Existing single-category
-- claims become a claim with one line.
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "distanceKm" DECIMAL(8,2),
    "foodType" "FoodType",
    "note" TEXT,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_items_expenseId_idx" ON "expense_items"("expenseId");
CREATE INDEX "expense_items_category_idx" ON "expense_items"("category");

ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "expense_items" ("id", "expenseId", "position", "category", "amount", "distanceKm", "foodType", "note")
SELECT replace(gen_random_uuid()::text, '-', ''), "id", 0, "category", "amount", "distanceKm", "foodType", NULL
FROM "expenses";

ALTER TABLE "expenses" DROP COLUMN "category";
ALTER TABLE "expenses" DROP COLUMN "distanceKm";
ALTER TABLE "expenses" DROP COLUMN "foodType";
ALTER TABLE "expenses" ALTER COLUMN "description" DROP NOT NULL;

-- Travel is claimed by distance and food as a local/outstation allowance;
-- the amount is derived from these on the server.
CREATE TYPE "FoodType" AS ENUM ('LOCAL', 'OUTSTATION');

ALTER TABLE "expenses" ADD COLUMN "distanceKm" DECIMAL(8,2);
ALTER TABLE "expenses" ADD COLUMN "foodType" "FoodType";

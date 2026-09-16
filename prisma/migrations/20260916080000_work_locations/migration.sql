-- Per-employee daily work locations replace the single office fence.
ALTER TYPE "NotificationType" ADD VALUE 'WORK_LOCATION_SET';

CREATE TABLE "work_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 50,
    "notes" TEXT,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_locations_userId_date_key" ON "work_locations"("userId", "date");
CREATE INDEX "work_locations_userId_date_idx" ON "work_locations"("userId", "date");

ALTER TABLE "work_locations"
  ADD CONSTRAINT "work_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_locations"
  ADD CONSTRAINT "work_locations_setById_fkey" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "company_settings"
  DROP COLUMN "officeLatitude",
  DROP COLUMN "officeLongitude",
  DROP COLUMN "checkInRadiusMeters";

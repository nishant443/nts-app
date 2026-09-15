-- Office geofence for self check-in / check-out.
ALTER TABLE "company_settings"
  ADD COLUMN "officeLatitude" DOUBLE PRECISION,
  ADD COLUMN "officeLongitude" DOUBLE PRECISION,
  ADD COLUMN "checkInRadiusMeters" INTEGER NOT NULL DEFAULT 30;

-- Where each self check-in / check-out happened, and how far from the office.
ALTER TABLE "attendance"
  ADD COLUMN "checkInLatitude" DOUBLE PRECISION,
  ADD COLUMN "checkInLongitude" DOUBLE PRECISION,
  ADD COLUMN "checkInDistanceM" INTEGER,
  ADD COLUMN "checkOutLatitude" DOUBLE PRECISION,
  ADD COLUMN "checkOutLongitude" DOUBLE PRECISION,
  ADD COLUMN "checkOutDistanceM" INTEGER;

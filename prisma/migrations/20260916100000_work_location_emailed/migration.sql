-- Work-location emails are sent by hand; remember when.
ALTER TABLE "work_locations" ADD COLUMN "emailedAt" TIMESTAMP(3);

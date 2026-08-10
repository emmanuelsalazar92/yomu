ALTER TABLE "DailyJourney"
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 5;

DROP INDEX "DailyJourney_childProfileId_dateKey_key";

CREATE UNIQUE INDEX "DailyJourney_childProfileId_dateKey_durationMinutes_key"
ON "DailyJourney"("childProfileId", "dateKey", "durationMinutes");

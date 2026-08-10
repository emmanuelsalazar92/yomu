CREATE TYPE "DailyActivityType" AS ENUM ('INITIAL_SOUND', 'SYLLABLE_BUILD', 'TRACE_LETTER');
CREATE TYPE "DailyJourneyStatus" AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE "DailyJourney" (
  "id" TEXT NOT NULL,
  "childProfileId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "status" "DailyJourneyStatus" NOT NULL DEFAULT 'ACTIVE',
  "rewardStage" INTEGER,
  "rewardName" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DailyJourney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyActivity" (
  "id" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "type" "DailyActivityType" NOT NULL,
  "position" INTEGER NOT NULL,
  "wordId" TEXT,
  "wordText" TEXT,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "outcome" "AnswerOutcome",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyActivityTarget" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "targetPosition" INTEGER NOT NULL,
  "expectedPiece" TEXT NOT NULL,
  "selectedPiece" TEXT,
  "outcome" "AnswerOutcome",
  "helpUsed" BOOLEAN NOT NULL DEFAULT false,
  "responseTimeMs" INTEGER,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyActivityTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyJourney_childProfileId_dateKey_key" ON "DailyJourney"("childProfileId", "dateKey");
CREATE INDEX "DailyJourney_childProfileId_completedAt_idx" ON "DailyJourney"("childProfileId", "completedAt");
CREATE UNIQUE INDEX "DailyActivity_journeyId_position_key" ON "DailyActivity"("journeyId", "position");
CREATE INDEX "DailyActivity_wordId_idx" ON "DailyActivity"("wordId");
CREATE UNIQUE INDEX "DailyActivityTarget_activityId_targetPosition_key" ON "DailyActivityTarget"("activityId", "targetPosition");
CREATE INDEX "DailyActivityTarget_activityId_outcome_idx" ON "DailyActivityTarget"("activityId", "outcome");

ALTER TABLE "DailyJourney" ADD CONSTRAINT "DailyJourney_childProfileId_fkey"
  FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_journeyId_fkey"
  FOREIGN KEY ("journeyId") REFERENCES "DailyJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_wordId_fkey"
  FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyActivityTarget" ADD CONSTRAINT "DailyActivityTarget_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "DailyActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

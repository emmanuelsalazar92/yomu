-- Add the independent learning activities without changing existing game sessions.
CREATE TYPE "LearningActivityType" AS ENUM ('CASE_MATCH', 'NAME_TILES', 'SYLLABLE_COUNT');

ALTER TABLE "ChildProfile"
  ADD COLUMN "practiceName" TEXT,
  ADD COLUMN "nameActivityEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Word"
  ADD COLUMN "syllables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "LearningActivitySession" (
  "id" TEXT NOT NULL,
  "childProfileId" TEXT NOT NULL,
  "activityType" "LearningActivityType" NOT NULL,
  "mode" TEXT NOT NULL,
  "requestedCount" INTEGER NOT NULL,
  "actualCount" INTEGER NOT NULL DEFAULT 0,
  "requestKey" TEXT,
  "categoryId" TEXT,
  "difficulty" INTEGER,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "score" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "reviewOfSessionId" TEXT,
  CONSTRAINT "LearningActivitySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningActivityItem" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "wordId" TEXT,
  "position" INTEGER NOT NULL,
  "targetKey" TEXT NOT NULL,
  "prompt" JSONB NOT NULL,
  "options" JSONB NOT NULL,
  "correctResponse" JSONB NOT NULL,
  "firstResponse" JSONB,
  "outcome" "AnswerOutcome",
  "helpUsed" BOOLEAN NOT NULL DEFAULT false,
  "responseTimeMs" INTEGER,
  "technicalSkipReason" TEXT,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningActivityItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivitySkillProgress" (
  "id" TEXT NOT NULL,
  "childProfileId" TEXT NOT NULL,
  "activityType" "LearningActivityType" NOT NULL,
  "skillKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "state" "ProgressState" NOT NULL DEFAULT 'NEW',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstTryCorrect" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "assistedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "recentAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "distinctSessions" INTEGER NOT NULL DEFAULT 0,
  "lastPracticedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivitySkillProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningActivitySession_requestKey_key" ON "LearningActivitySession"("requestKey");
CREATE INDEX "LearningActivitySession_childProfileId_activityType_startedAt_idx" ON "LearningActivitySession"("childProfileId", "activityType", "startedAt");
CREATE INDEX "LearningActivitySession_status_startedAt_idx" ON "LearningActivitySession"("status", "startedAt");
CREATE INDEX "LearningActivitySession_reviewOfSessionId_idx" ON "LearningActivitySession"("reviewOfSessionId");
CREATE UNIQUE INDEX "LearningActivityItem_sessionId_position_key" ON "LearningActivityItem"("sessionId", "position");
CREATE UNIQUE INDEX "LearningActivityItem_sessionId_targetKey_key" ON "LearningActivityItem"("sessionId", "targetKey");
CREATE INDEX "LearningActivityItem_wordId_idx" ON "LearningActivityItem"("wordId");
CREATE INDEX "LearningActivityItem_sessionId_outcome_idx" ON "LearningActivityItem"("sessionId", "outcome");
CREATE UNIQUE INDEX "ActivitySkillProgress_childProfileId_activityType_skillKey_mode_key" ON "ActivitySkillProgress"("childProfileId", "activityType", "skillKey", "mode");
CREATE INDEX "ActivitySkillProgress_childProfileId_activityType_updatedAt_idx" ON "ActivitySkillProgress"("childProfileId", "activityType", "updatedAt");

ALTER TABLE "LearningActivitySession" ADD CONSTRAINT "LearningActivitySession_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningActivitySession" ADD CONSTRAINT "LearningActivitySession_reviewOfSessionId_fkey" FOREIGN KEY ("reviewOfSessionId") REFERENCES "LearningActivitySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningActivityItem" ADD CONSTRAINT "LearningActivityItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningActivityItem" ADD CONSTRAINT "LearningActivityItem_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivitySkillProgress" ADD CONSTRAINT "ActivitySkillProgress_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'SINGLE_CONSONANT';

CREATE TYPE "TargetKind" AS ENUM ('VOWEL', 'CONSONANT');

ALTER TABLE "AppSettings"
  ADD COLUMN "activeConsonants" TEXT[] NOT NULL DEFAULT ARRAY['M', 'P', 'L', 'S', 'T', 'N']::TEXT[];

ALTER TABLE "SessionExercise"
  ADD COLUMN "targetPosition" INTEGER,
  ADD COLUMN "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Attempt"
  ADD COLUMN "targetKind" "TargetKind",
  ADD COLUMN "targetLetter" TEXT,
  ADD COLUMN "targetPosition" INTEGER,
  ADD COLUMN "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "LetterSkillProgress" (
  "id" TEXT NOT NULL,
  "childProfileId" TEXT NOT NULL,
  "targetKind" "TargetKind" NOT NULL,
  "targetLetter" TEXT NOT NULL,
  "exerciseType" "ExerciseType" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstTryCorrect" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "lastPracticedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LetterSkillProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LetterSkillProgress_childProfileId_targetKind_targetLetter_exerciseType_key"
  ON "LetterSkillProgress"("childProfileId", "targetKind", "targetLetter", "exerciseType");
CREATE INDEX "LetterSkillProgress_childProfileId_targetKind_updatedAt_idx"
  ON "LetterSkillProgress"("childProfileId", "targetKind", "updatedAt");
ALTER TABLE "LetterSkillProgress"
  ADD CONSTRAINT "LetterSkillProgress_childProfileId_fkey"
  FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

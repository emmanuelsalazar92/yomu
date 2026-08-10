CREATE TYPE "AnswerOutcome" AS ENUM ('CORRECT', 'INCORRECT', 'ASSISTED', 'SKIPPED');

ALTER TABLE "GameSession" ADD COLUMN "reviewOfSessionId" TEXT;

ALTER TABLE "Attempt"
  ADD COLUMN "sessionExerciseId" TEXT,
  ADD COLUMN "assistedSpaces" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "incorrectSpaces" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "skippedSpaces" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AttemptAnswer"
  ALTER COLUMN "selectedVowel" DROP NOT NULL,
  ADD COLUMN "outcome" "AnswerOutcome",
  ADD COLUMN "helpUsed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AttemptAnswer"
SET "outcome" = CASE WHEN "correctFirstTry" THEN 'CORRECT'::"AnswerOutcome" ELSE 'INCORRECT'::"AnswerOutcome" END;

ALTER TABLE "AttemptAnswer" ALTER COLUMN "outcome" SET NOT NULL;

ALTER TABLE "AppSettings"
  ADD COLUMN "incorrectFeedbackDelayMs" INTEGER NOT NULL DEFAULT 2200;

CREATE TABLE "SessionTarget" (
  "id" TEXT NOT NULL,
  "sessionExerciseId" TEXT NOT NULL,
  "targetPosition" INTEGER NOT NULL,
  "expectedGrapheme" TEXT NOT NULL,
  "selectedLetter" TEXT,
  "outcome" "AnswerOutcome",
  "helpUsed" BOOLEAN NOT NULL DEFAULT false,
  "audioPlayCount" INTEGER NOT NULL DEFAULT 0,
  "responseTimeMs" INTEGER,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionTarget_sessionExerciseId_targetPosition_key"
  ON "SessionTarget"("sessionExerciseId", "targetPosition");
CREATE INDEX "SessionTarget_sessionExerciseId_outcome_idx"
  ON "SessionTarget"("sessionExerciseId", "outcome");
CREATE UNIQUE INDEX "Attempt_sessionExerciseId_key" ON "Attempt"("sessionExerciseId");
CREATE INDEX "GameSession_reviewOfSessionId_idx" ON "GameSession"("reviewOfSessionId");

ALTER TABLE "SessionTarget"
  ADD CONSTRAINT "SessionTarget_sessionExerciseId_fkey"
  FOREIGN KEY ("sessionExerciseId") REFERENCES "SessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt"
  ADD CONSTRAINT "Attempt_sessionExerciseId_fkey"
  FOREIGN KEY ("sessionExerciseId") REFERENCES "SessionExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_reviewOfSessionId_fkey"
  FOREIGN KEY ("reviewOfSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SessionTarget" (
  "id", "sessionExerciseId", "targetPosition", "expectedGrapheme", "createdAt", "updatedAt"
)
SELECT
  md5(se."id" || ':' || positions."targetPosition"::TEXT),
  se."id",
  positions."targetPosition",
  '',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "SessionExercise" se
JOIN "ExerciseConfiguration" ec ON ec."id" = se."configurationId"
CROSS JOIN LATERAL unnest(
  CASE
    WHEN ec."type" = 'SINGLE_CONSONANT' AND se."targetPosition" IS NOT NULL
      THEN ARRAY[se."targetPosition"]
    ELSE ec."hiddenPositions"
  END
) AS positions("targetPosition")
ON CONFLICT ("sessionExerciseId", "targetPosition") DO NOTHING;

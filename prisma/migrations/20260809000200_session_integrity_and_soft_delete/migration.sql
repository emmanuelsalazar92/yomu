-- Keep deleted words for historical attempts while excluding them from new work.
ALTER TABLE "Word" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "GameSession"
  ADD COLUMN "actualCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "requestKey" TEXT;

CREATE UNIQUE INDEX "GameSession_requestKey_key" ON "GameSession"("requestKey");
DROP INDEX "Word_active_difficulty_categoryId_idx";
CREATE INDEX "Word_active_deletedAt_difficulty_categoryId_idx"
  ON "Word"("active", "deletedAt", "difficulty", "categoryId");

CREATE TABLE "SessionExercise" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionExercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionExercise_sessionId_wordId_key" ON "SessionExercise"("sessionId", "wordId");
CREATE UNIQUE INDEX "SessionExercise_sessionId_position_key" ON "SessionExercise"("sessionId", "position");
CREATE INDEX "SessionExercise_wordId_idx" ON "SessionExercise"("wordId");
CREATE INDEX "SessionExercise_configurationId_idx" ON "SessionExercise"("configurationId");

ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_wordId_fkey"
  FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_configurationId_fkey"
  FOREIGN KEY ("configurationId") REFERENCES "ExerciseConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

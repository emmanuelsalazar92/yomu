-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HelpMode" AS ENUM ('WITH_IMAGE', 'WITHOUT_IMAGE', 'LISTEN');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('ONE_VOWEL', 'ALL_VOWELS', 'INITIAL_VOWEL', 'MIXED');

-- CreateEnum
CREATE TYPE "ProgressState" AS ENUM ('NEW', 'LEARNING', 'ALMOST_LEARNED', 'LEARNED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#B9DCCB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "imagePath" TEXT,
    "audioPath" TEXT,
    "imageMime" TEXT,
    "audioMime" TEXT,
    "categoryId" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseConfiguration" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "hiddenPositions" INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "helpMode" "HelpMode" NOT NULL,
    "exerciseType" "ExerciseType" NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "includeLearned" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "difficulty" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "score" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "exerciseType" "ExerciseType" NOT NULL,
    "helpMode" "HelpMode" NOT NULL,
    "firstTryCorrectSpaces" INTEGER NOT NULL,
    "totalSpaces" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "audioPlayCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedVowel" TEXT NOT NULL,
    "expectedGrapheme" TEXT NOT NULL,
    "correctFirstTry" BOOLEAN NOT NULL,
    "errorCount" INTEGER NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordSkillProgress" (
    "id" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "exerciseType" "ExerciseType" NOT NULL,
    "helpMode" "HelpMode" NOT NULL,
    "state" "ProgressState" NOT NULL DEFAULT 'NEW',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstTryCorrect" INTEGER NOT NULL DEFAULT 0,
    "recentAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distinctSessions" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordSkillProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hintAfterErrors" INTEGER NOT NULL DEFAULT 2,
    "feedbackDelayMs" INTEGER NOT NULL DEFAULT 900,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "ChildProfile_active_idx" ON "ChildProfile"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Word_active_difficulty_categoryId_idx" ON "Word"("active", "difficulty", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_normalizedText_categoryId_key" ON "Word"("normalizedText", "categoryId");

-- CreateIndex
CREATE INDEX "ExerciseConfiguration_wordId_active_type_idx" ON "ExerciseConfiguration"("wordId", "active", "type");

-- CreateIndex
CREATE INDEX "GameSession_childProfileId_startedAt_idx" ON "GameSession"("childProfileId", "startedAt");

-- CreateIndex
CREATE INDEX "GameSession_status_startedAt_idx" ON "GameSession"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Attempt_childProfileId_wordId_createdAt_idx" ON "Attempt"("childProfileId", "wordId", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_sessionId_createdAt_idx" ON "Attempt"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_position_idx" ON "AttemptAnswer"("attemptId", "position");

-- CreateIndex
CREATE INDEX "WordSkillProgress_childProfileId_state_updatedAt_idx" ON "WordSkillProgress"("childProfileId", "state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WordSkillProgress_childProfileId_wordId_exerciseType_helpMo_key" ON "WordSkillProgress"("childProfileId", "wordId", "exerciseType", "helpMode");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseConfiguration" ADD CONSTRAINT "ExerciseConfiguration_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "ExerciseConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSkillProgress" ADD CONSTRAINT "WordSkillProgress_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSkillProgress" ADD CONSTRAINT "WordSkillProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

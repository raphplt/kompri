-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChallengeFamily" AS ENUM ('SANS_IA', 'AVEC_IA', 'CONTRE_IA', 'APRES_IA');

-- CreateEnum
CREATE TYPE "OralMode" AS ENUM ('CHAT', 'VOICE');

-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('EXAMINER', 'LEARNER');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rncpBlockReference" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPrerequisite" (
    "skillId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "SkillPrerequisite_pkey" PRIMARY KEY ("skillId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "family" "ChallengeFamily" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "rubricSnapshot" JSONB NOT NULL,
    "contentVersion" TEXT NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "submittedWork" TEXT NOT NULL,
    "challengeSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "mode" "OralMode" NOT NULL DEFAULT 'CHAT',
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "rubricSnapshot" JSONB NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OralSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralTurn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "speaker" "Speaker" NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OralTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "oralSessionId" TEXT NOT NULL,
    "verdict" "Verdict" NOT NULL,
    "criteria" JSONB NOT NULL,
    "validatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "consumedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OralUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SkillPrerequisite_prerequisiteId_idx" ON "SkillPrerequisite"("prerequisiteId");

-- CreateIndex
CREATE INDEX "Challenge_skillId_idx" ON "Challenge"("skillId");

-- CreateIndex
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_challengeId_idx" ON "Attempt"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_id_userId_key" ON "Attempt"("id", "userId");

-- CreateIndex
CREATE INDEX "OralSession_userId_startedAt_idx" ON "OralSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "OralSession_attemptId_userId_idx" ON "OralSession"("attemptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OralSession_id_userId_key" ON "OralSession"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OralTurn_sessionId_sequence_key" ON "OralTurn"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_oralSessionId_key" ON "Validation"("oralSessionId");

-- CreateIndex
CREATE INDEX "Validation_userId_skillId_expiresAt_idx" ON "Validation"("userId", "skillId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_oralSessionId_userId_key" ON "Validation"("oralSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OralUsage_sessionId_key" ON "OralUsage"("sessionId");

-- CreateIndex
CREATE INDEX "OralUsage_userId_consumedAt_idx" ON "OralUsage"("userId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OralUsage_sessionId_userId_key" ON "OralUsage"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_attemptId_userId_fkey" FOREIGN KEY ("attemptId", "userId") REFERENCES "Attempt"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralTurn" ADD CONSTRAINT "OralTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OralSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_oralSessionId_userId_fkey" FOREIGN KEY ("oralSessionId", "userId") REFERENCES "OralSession"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralUsage" ADD CONSTRAINT "OralUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralUsage" ADD CONSTRAINT "OralUsage_sessionId_userId_fkey" FOREIGN KEY ("sessionId", "userId") REFERENCES "OralSession"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants that Prisma does not yet express in its schema.
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_expiry_check" CHECK ("expiresAt" > "validatedAt");
ALTER TABLE "OralTurn" ADD CONSTRAINT "OralTurn_sequence_check" CHECK ("sequence" >= 0);
ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_dates_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");
ALTER TABLE "SkillPrerequisite" ADD CONSTRAINT "SkillPrerequisite_self_check" CHECK ("skillId" <> "prerequisiteId");

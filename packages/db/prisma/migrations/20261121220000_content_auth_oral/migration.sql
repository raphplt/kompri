-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OralStatus" AS ENUM ('ACTIVE', 'GRADING_FAILED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "archivedAt" TIMESTAMPTZ(3),
ADD COLUMN     "deliverable" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "examinerNotes" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "OralSession" ADD COLUMN     "grade" JSONB,
ADD COLUMN     "gradedAt" TIMESTAMPTZ(3),
ADD COLUMN     "gradingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plan" JSONB,
ADD COLUMN     "questionDeadline" TIMESTAMPTZ(3),
ADD COLUMN     "status" "OralStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "verdict" "Verdict";

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "archivedAt" TIMESTAMPTZ(3),
ADD COLUMN     "domainId" TEXT,
ADD COLUMN     "estimatedHours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "objectives" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "SkillStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMPTZ(3),
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "body" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_skillId_slug_key" ON "Lesson"("skillId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "OralSession_attemptId_key" ON "OralSession"("attemptId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sessions created before this migration have no plan and cannot be resumed.
UPDATE "OralSession" SET "status" = 'GRADING_FAILED' WHERE "plan" IS NULL;

-- A learner can only have one oral in progress at a time.
CREATE UNIQUE INDEX "OralSession_one_active_per_user" ON "OralSession"("userId") WHERE "status" = 'ACTIVE';

ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_grading_attempts_check" CHECK ("gradingAttempts" >= 0);
ALTER TABLE "OralSession" ADD CONSTRAINT "OralSession_completed_check" CHECK ("status" <> 'COMPLETED' OR ("verdict" IS NOT NULL AND "grade" IS NOT NULL AND "gradedAt" IS NOT NULL));
ALTER TABLE "User" ADD CONSTRAINT "User_failed_login_check" CHECK ("failedLoginCount" >= 0);
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_expiry_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_position_check" CHECK ("position" > 0);

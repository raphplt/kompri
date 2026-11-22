-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'CONFIRMED', 'OVERTURNED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastActiveAt" TIMESTAMPTZ(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'LEARNER';

-- AlterTable
ALTER TABLE "Validation" ADD COLUMN     "reminderSentAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oralSessionId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_createdAt_idx" ON "EmailVerification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_oralSessionId_key" ON "ReviewRequest"("oralSessionId");

-- CreateIndex
CREATE INDEX "ReviewRequest_status_createdAt_idx" ON "ReviewRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_oralSessionId_userId_key" ON "ReviewRequest"("oralSessionId", "userId");

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_oralSessionId_userId_fkey" FOREIGN KEY ("oralSessionId", "userId") REFERENCES "OralSession"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Accounts that existed before e-mail verification keep working.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_expiry_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_decision_check" CHECK (("status" = 'OPEN') = ("decidedAt" IS NULL));

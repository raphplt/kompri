-- CreateTable
CREATE TABLE "TutorUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consumedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorUsage_userId_consumedAt_idx" ON "TutorUsage"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "TutorUsage" ADD CONSTRAINT "TutorUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


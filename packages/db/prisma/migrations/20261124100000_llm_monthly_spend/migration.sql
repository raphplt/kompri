-- CreateTable
CREATE TABLE "LlmMonthlySpend" (
    "month" TEXT NOT NULL,
    "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LlmMonthlySpend_pkey" PRIMARY KEY ("month")
);


-- CreateTable
CREATE TABLE "public"."BackgroundJobLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "lessonsGenerated" INTEGER NOT NULL DEFAULT 0,
    "teachersProcessed" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,

    CONSTRAINT "BackgroundJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJobLog_jobName_executedAt_idx" ON "public"."BackgroundJobLog"("jobName", "executedAt");

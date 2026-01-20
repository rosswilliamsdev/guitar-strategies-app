/*
  Warnings:

  - You are about to drop the column `level` on the `Curriculum` table. All the data in the column will be lost.
  - You are about to drop the column `calendlyEventId` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `LibraryItem` table. All the data in the column will be lost.
  - You are about to drop the column `calendlyUrl` on the `TeacherProfile` table. All the data in the column will be lost.
  - Made the column `timezone` on table `TeacherProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."SlotStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."BillingStatus" AS ENUM ('PENDING', 'BILLED', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."LessonStatus" ADD VALUE 'NO_SHOW';

-- DropIndex
DROP INDEX "public"."Curriculum_level_idx";

-- AlterTable
ALTER TABLE "public"."Curriculum" DROP COLUMN "level";

-- AlterTable
ALTER TABLE "public"."Lesson" DROP COLUMN "calendlyEventId",
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recurringId" TEXT,
ADD COLUMN     "recurringSlotId" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "public"."LibraryItem" DROP COLUMN "difficulty";

-- AlterTable
ALTER TABLE "public"."TeacherProfile" DROP COLUMN "calendlyUrl",
ALTER COLUMN "timezone" SET NOT NULL;

-- DropEnum
DROP TYPE "public"."SkillLevel";

-- CreateTable
CREATE TABLE "public"."TeacherLessonSettings" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "allows30Min" BOOLEAN NOT NULL DEFAULT true,
    "allows60Min" BOOLEAN NOT NULL DEFAULT true,
    "price30Min" INTEGER NOT NULL,
    "price60Min" INTEGER NOT NULL,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 21,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLessonSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherAvailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherBlockedTime" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherBlockedTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringSlot" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "public"."SlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "monthlyRate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlotSubscription" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    "monthlyRate" INTEGER NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastBilledMonth" TEXT,
    "nextBillDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlyBilling" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "expectedLessons" INTEGER NOT NULL,
    "actualLessons" INTEGER NOT NULL DEFAULT 0,
    "ratePerLesson" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "public"."BillingStatus" NOT NULL DEFAULT 'PENDING',
    "billedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherLessonSettings_teacherId_key" ON "public"."TeacherLessonSettings"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherLessonSettings_teacherId_idx" ON "public"."TeacherLessonSettings"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherAvailability_teacherId_idx" ON "public"."TeacherAvailability"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherAvailability_dayOfWeek_idx" ON "public"."TeacherAvailability"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAvailability_teacherId_dayOfWeek_startTime_endTime_key" ON "public"."TeacherAvailability"("teacherId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "TeacherBlockedTime_teacherId_idx" ON "public"."TeacherBlockedTime"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherBlockedTime_startTime_endTime_idx" ON "public"."TeacherBlockedTime"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "RecurringSlot_teacherId_status_idx" ON "public"."RecurringSlot"("teacherId", "status");

-- CreateIndex
CREATE INDEX "RecurringSlot_studentId_status_idx" ON "public"."RecurringSlot"("studentId", "status");

-- CreateIndex
CREATE INDEX "RecurringSlot_dayOfWeek_idx" ON "public"."RecurringSlot"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringSlot_teacherId_dayOfWeek_startTime_duration_status_key" ON "public"."RecurringSlot"("teacherId", "dayOfWeek", "startTime", "duration", "status");

-- CreateIndex
CREATE INDEX "SlotSubscription_status_idx" ON "public"."SlotSubscription"("status");

-- CreateIndex
CREATE INDEX "SlotSubscription_nextBillDate_idx" ON "public"."SlotSubscription"("nextBillDate");

-- CreateIndex
CREATE INDEX "SlotSubscription_studentId_idx" ON "public"."SlotSubscription"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSubscription_slotId_studentId_startMonth_key" ON "public"."SlotSubscription"("slotId", "studentId", "startMonth");

-- CreateIndex
CREATE INDEX "MonthlyBilling_month_idx" ON "public"."MonthlyBilling"("month");

-- CreateIndex
CREATE INDEX "MonthlyBilling_status_idx" ON "public"."MonthlyBilling"("status");

-- CreateIndex
CREATE INDEX "MonthlyBilling_studentId_month_idx" ON "public"."MonthlyBilling"("studentId", "month");

-- CreateIndex
CREATE INDEX "MonthlyBilling_teacherId_month_idx" ON "public"."MonthlyBilling"("teacherId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBilling_subscriptionId_month_key" ON "public"."MonthlyBilling"("subscriptionId", "month");

-- CreateIndex
CREATE INDEX "Lesson_recurringId_idx" ON "public"."Lesson"("recurringId");

-- CreateIndex
CREATE INDEX "Lesson_recurringSlotId_idx" ON "public"."Lesson"("recurringSlotId");

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_recurringSlotId_fkey" FOREIGN KEY ("recurringSlotId") REFERENCES "public"."RecurringSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherLessonSettings" ADD CONSTRAINT "TeacherLessonSettings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherBlockedTime" ADD CONSTRAINT "TeacherBlockedTime_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringSlot" ADD CONSTRAINT "RecurringSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringSlot" ADD CONSTRAINT "RecurringSlot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlotSubscription" ADD CONSTRAINT "SlotSubscription_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."RecurringSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlotSubscription" ADD CONSTRAINT "SlotSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyBilling" ADD CONSTRAINT "MonthlyBilling_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."SlotSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyBilling" ADD CONSTRAINT "MonthlyBilling_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyBilling" ADD CONSTRAINT "MonthlyBilling_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

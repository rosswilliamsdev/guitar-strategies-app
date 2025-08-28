-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_studentId_fkey";

-- DropIndex
DROP INDEX "public"."Lesson_teacherId_date_status_idx";

-- DropIndex
DROP INDEX "public"."Lesson_teacherId_studentId_date_idx";

-- DropIndex
DROP INDEX "public"."RecurringSlot_status_bookedAt_idx";

-- DropIndex
DROP INDEX "public"."RecurringSlot_studentId_status_dayOfWeek_idx";

-- DropIndex
DROP INDEX "public"."RecurringSlot_teacherId_dayOfWeek_startTime_status_idx";

-- DropIndex
DROP INDEX "public"."RecurringSlot_teacherId_status_dayOfWeek_idx";

-- DropIndex
DROP INDEX "public"."TeacherAvailability_teacherId_dayOfWeek_isActive_idx";

-- DropIndex
DROP INDEX "public"."TeacherBlockedTime_teacherId_startTime_endTime_idx";

-- DropIndex
DROP INDEX "public"."TeacherProfile_isActive_id_idx";

-- DropIndex
DROP INDEX "public"."TeacherProfile_isActive_userId_idx";

-- AlterTable
ALTER TABLE "public"."Invoice" ADD COLUMN     "customEmail" TEXT,
ADD COLUMN     "customFullName" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

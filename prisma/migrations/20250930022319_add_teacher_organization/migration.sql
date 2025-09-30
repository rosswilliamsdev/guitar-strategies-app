-- DropIndex
DROP INDEX "public"."Curriculum_teacherId_isActive_idx";

-- DropIndex
DROP INDEX "public"."EmailPreference_enabled_idx";

-- DropIndex
DROP INDEX "public"."Invoice_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Invoice_month_idx";

-- DropIndex
DROP INDEX "public"."Invoice_studentId_status_idx";

-- DropIndex
DROP INDEX "public"."Invoice_teacherId_status_idx";

-- DropIndex
DROP INDEX "public"."Lesson_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Lesson_date_status_idx";

-- DropIndex
DROP INDEX "public"."Lesson_isRecurring_idx";

-- DropIndex
DROP INDEX "public"."Lesson_studentId_status_idx";

-- DropIndex
DROP INDEX "public"."Lesson_teacherId_status_idx";

-- DropIndex
DROP INDEX "public"."StudentProfile_joinedAt_idx";

-- DropIndex
DROP INDEX "public"."TeacherAvailability_teacherId_dayOfWeek_idx";

-- DropIndex
DROP INDEX "public"."TeacherAvailability_teacherId_isActive_idx";

-- DropIndex
DROP INDEX "public"."TeacherProfile_isAdmin_idx";

-- AlterTable
ALTER TABLE "public"."TeacherProfile" ADD COLUMN     "isSoloTeacher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationName" TEXT;

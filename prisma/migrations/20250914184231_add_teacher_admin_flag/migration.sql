/*
  Warnings:

  - Changed the type of `type` on the `EmailPreference` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."EmailType" AS ENUM ('LESSON_BOOKING', 'LESSON_CANCELLATION', 'LESSON_REMINDER', 'INVOICE_GENERATED', 'INVOICE_OVERDUE', 'CHECKLIST_COMPLETION', 'SYSTEM_UPDATES');

-- DropForeignKey
ALTER TABLE "public"."EmailPreference" DROP CONSTRAINT "EmailPreference_userId_fkey";

-- DropIndex
DROP INDEX "public"."idx_lessons_student_date_status";

-- DropIndex
DROP INDEX "public"."idx_lessons_teacher_date_status";

-- DropIndex
DROP INDEX "public"."idx_teacher_profile_user_active";

-- AlterTable
ALTER TABLE "public"."EmailPreference" DROP COLUMN "type",
ADD COLUMN     "type" "public"."EmailType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."TeacherProfile" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_userId_type_key" ON "public"."EmailPreference"("userId", "type");

-- AddForeignKey
ALTER TABLE "public"."EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

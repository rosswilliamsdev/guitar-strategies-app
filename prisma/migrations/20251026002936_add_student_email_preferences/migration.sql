-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'LESSON_COMPLETED';

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "emailOnInvoice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailOnLessonComplete" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailOnLessonReminder" BOOLEAN NOT NULL DEFAULT true;

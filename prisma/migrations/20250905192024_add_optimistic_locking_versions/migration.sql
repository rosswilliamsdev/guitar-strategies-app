-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."RecurringSlot" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."TeacherAvailability" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

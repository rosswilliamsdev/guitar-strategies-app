/*
  Warnings:

  - You are about to drop the column `monthlyRate` on the `RecurringSlot` table. All the data in the column will be lost.
  - Added the required column `perLessonPrice` to the `RecurringSlot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."RecurringSlot" DROP COLUMN "monthlyRate",
ADD COLUMN     "perLessonPrice" INTEGER NOT NULL;

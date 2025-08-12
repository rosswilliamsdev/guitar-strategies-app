/*
  Warnings:

  - You are about to drop the column `category` on the `StudentChecklist` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."StudentChecklist_category_idx";

-- AlterTable
ALTER TABLE "public"."StudentChecklist" DROP COLUMN "category";

-- DropEnum
DROP TYPE "public"."ChecklistCategory";

/*
  Warnings:

  - You are about to drop the column `priority` on the `StudentChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `StudentChecklistItem` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."StudentChecklistItem_sortOrder_idx";

-- AlterTable
ALTER TABLE "public"."StudentChecklistItem" DROP COLUMN "priority",
DROP COLUMN "sortOrder";

-- AlterTable
ALTER TABLE "StudentChecklistItem" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "StudentChecklistItem_checklistId_sortOrder_idx" ON "StudentChecklistItem"("checklistId", "sortOrder");

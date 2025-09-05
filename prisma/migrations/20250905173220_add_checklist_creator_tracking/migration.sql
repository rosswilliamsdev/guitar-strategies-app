-- AlterTable
ALTER TABLE "public"."StudentChecklist" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdByRole" TEXT;

-- CreateIndex
CREATE INDEX "StudentChecklist_createdBy_idx" ON "public"."StudentChecklist"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."StudentChecklist" ADD CONSTRAINT "StudentChecklist_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "public"."ChecklistCategory" AS ENUM ('PRACTICE', 'GOALS', 'REPERTOIRE', 'TECHNIQUE', 'THEORY', 'PERFORMANCE', 'RECORDING', 'GEAR', 'OTHER');

-- CreateTable
CREATE TABLE "public"."StudentChecklist" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ChecklistCategory" NOT NULL DEFAULT 'PRACTICE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "resourceUrl" TEXT,
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentChecklist_studentId_idx" ON "public"."StudentChecklist"("studentId");

-- CreateIndex
CREATE INDEX "StudentChecklist_category_idx" ON "public"."StudentChecklist"("category");

-- CreateIndex
CREATE INDEX "StudentChecklist_isActive_idx" ON "public"."StudentChecklist"("isActive");

-- CreateIndex
CREATE INDEX "StudentChecklistItem_checklistId_idx" ON "public"."StudentChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "StudentChecklistItem_isCompleted_idx" ON "public"."StudentChecklistItem"("isCompleted");

-- CreateIndex
CREATE INDEX "StudentChecklistItem_sortOrder_idx" ON "public"."StudentChecklistItem"("sortOrder");

-- AddForeignKey
ALTER TABLE "public"."StudentChecklist" ADD CONSTRAINT "StudentChecklist_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentChecklistItem" ADD CONSTRAINT "StudentChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."StudentChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

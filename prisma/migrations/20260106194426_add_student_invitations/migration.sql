-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'STUDENT_INVITATION';

-- CreateTable
CREATE TABLE "StudentInvitation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvitation_studentId_key" ON "StudentInvitation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvitation_token_key" ON "StudentInvitation"("token");

-- CreateIndex
CREATE INDEX "StudentInvitation_teacherId_idx" ON "StudentInvitation"("teacherId");

-- CreateIndex
CREATE INDEX "StudentInvitation_token_idx" ON "StudentInvitation"("token");

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

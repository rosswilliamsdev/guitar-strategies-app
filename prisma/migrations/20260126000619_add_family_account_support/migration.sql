-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'FAMILY');

-- DropIndex
DROP INDEX "public"."StudentProfile_userId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateIndex
CREATE INDEX "User_accountType_idx" ON "User"("accountType");

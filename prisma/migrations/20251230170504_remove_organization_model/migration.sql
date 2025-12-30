/*
  Warnings:

  - You are about to drop the column `isOrgFounder` on the `TeacherProfile` table. All the data in the column will be lost.
  - You are about to drop the column `isSoloTeacher` on the `TeacherProfile` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `TeacherProfile` table. All the data in the column will be lost.
  - You are about to drop the column `organizationName` on the `TeacherProfile` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Instrument" AS ENUM ('GUITAR', 'BASS', 'UKULELE');

-- DropForeignKey
ALTER TABLE "public"."Organization" DROP CONSTRAINT "Organization_founderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeacherProfile" DROP CONSTRAINT "TeacherProfile_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."TeacherProfile_organizationId_idx";

-- AlterTable
ALTER TABLE "LibraryItem" ADD COLUMN     "instrument" "Instrument" NOT NULL DEFAULT 'GUITAR',
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'TABLATURE';

-- AlterTable
ALTER TABLE "TeacherProfile" DROP COLUMN "isOrgFounder",
DROP COLUMN "isSoloTeacher",
DROP COLUMN "organizationId",
DROP COLUMN "organizationName";

-- DropTable
DROP TABLE "public"."Organization";

-- CreateIndex
CREATE INDEX "LibraryItem_instrument_idx" ON "LibraryItem"("instrument");

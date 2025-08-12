-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "public"."RecommendationCategory" AS ENUM ('GEAR', 'BOOKS', 'SOFTWARE', 'ONLINE_COURSES', 'APPS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "public"."LibraryCategory" AS ENUM ('TABLATURE', 'SHEET_MUSIC', 'CHORD_CHARTS', 'SCALES', 'ETUDES', 'EXERCISES', 'THEORY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LinkType" AS ENUM ('WEBSITE', 'YOUTUBE', 'VIMEO', 'SPOTIFY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CurriculumCategory" AS ENUM ('CHORDS', 'SCALES', 'ARPEGGIOS', 'THEORY', 'RHYTHM', 'LEAD_GUITAR', 'FINGERSTYLE', 'SONGS', 'RIFFS', 'SOLOS', 'TECHNIQUE', 'SIGHT_READING', 'EAR_TRAINING', 'IMPROVISATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendlyUrl" TEXT,
    "bio" TEXT,
    "hourlyRate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "venmoHandle" TEXT,
    "paypalEmail" TEXT,
    "zelleEmail" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "phoneNumber" TEXT,
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goals" TEXT,
    "instrument" TEXT NOT NULL DEFAULT 'guitar',
    "phoneNumber" TEXT,
    "parentEmail" TEXT,
    "emergencyContact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lesson" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "notes" TEXT,
    "homework" TEXT,
    "progress" TEXT,
    "calendlyEventId" TEXT,
    "status" "public"."LessonStatus" NOT NULL DEFAULT 'COMPLETED',
    "focusAreas" TEXT,
    "songsPracticed" TEXT,
    "nextSteps" TEXT,
    "studentRating" INTEGER,
    "teacherRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonAttachment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonLink" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "linkType" "public"."LinkType" NOT NULL DEFAULT 'WEBSITE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LibraryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "category" "public"."LibraryCategory" NOT NULL DEFAULT 'SHEET_MUSIC',
    "difficulty" "public"."SkillLevel",
    "tags" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recommendation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "category" "public"."RecommendationCategory" NOT NULL,
    "teacherId" TEXT NOT NULL,
    "price" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "lessonDate" TIMESTAMP(3),
    "lessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Curriculum" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "public"."SkillLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CurriculumSection" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."CurriculumCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CurriculumItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER,
    "estimatedMinutes" INTEGER,
    "resourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentCurriculumProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCurriculumProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentItemProgress" (
    "id" TEXT NOT NULL,
    "curriculumProgressId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "public"."ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "teacherNotes" TEXT,
    "studentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "platformFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maxFileSize" INTEGER NOT NULL DEFAULT 10485760,
    "allowedFileTypes" TEXT NOT NULL DEFAULT 'pdf,doc,docx,jpg,png',
    "paymentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "libraryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recommendationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "public"."TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_userId_idx" ON "public"."TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_isActive_idx" ON "public"."TeacherProfile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "public"."StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_userId_idx" ON "public"."StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_teacherId_idx" ON "public"."StudentProfile"("teacherId");

-- CreateIndex
CREATE INDEX "StudentProfile_isActive_idx" ON "public"."StudentProfile"("isActive");

-- CreateIndex
CREATE INDEX "Lesson_teacherId_date_idx" ON "public"."Lesson"("teacherId", "date");

-- CreateIndex
CREATE INDEX "Lesson_studentId_date_idx" ON "public"."Lesson"("studentId", "date");

-- CreateIndex
CREATE INDEX "Lesson_status_idx" ON "public"."Lesson"("status");

-- CreateIndex
CREATE INDEX "Lesson_date_idx" ON "public"."Lesson"("date");

-- CreateIndex
CREATE INDEX "LessonAttachment_lessonId_idx" ON "public"."LessonAttachment"("lessonId");

-- CreateIndex
CREATE INDEX "LessonLink_lessonId_idx" ON "public"."LessonLink"("lessonId");

-- CreateIndex
CREATE INDEX "LibraryItem_teacherId_idx" ON "public"."LibraryItem"("teacherId");

-- CreateIndex
CREATE INDEX "LibraryItem_isPublic_idx" ON "public"."LibraryItem"("isPublic");

-- CreateIndex
CREATE INDEX "LibraryItem_category_idx" ON "public"."LibraryItem"("category");

-- CreateIndex
CREATE INDEX "Recommendation_teacherId_idx" ON "public"."Recommendation"("teacherId");

-- CreateIndex
CREATE INDEX "Recommendation_category_idx" ON "public"."Recommendation"("category");

-- CreateIndex
CREATE INDEX "Invoice_teacherId_month_idx" ON "public"."Invoice"("teacherId", "month");

-- CreateIndex
CREATE INDEX "Invoice_studentId_month_idx" ON "public"."Invoice"("studentId", "month");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "public"."Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_lessonId_idx" ON "public"."InvoiceItem"("lessonId");

-- CreateIndex
CREATE INDEX "Curriculum_teacherId_idx" ON "public"."Curriculum"("teacherId");

-- CreateIndex
CREATE INDEX "Curriculum_level_idx" ON "public"."Curriculum"("level");

-- CreateIndex
CREATE INDEX "Curriculum_isPublished_idx" ON "public"."Curriculum"("isPublished");

-- CreateIndex
CREATE INDEX "CurriculumSection_curriculumId_idx" ON "public"."CurriculumSection"("curriculumId");

-- CreateIndex
CREATE INDEX "CurriculumSection_sortOrder_idx" ON "public"."CurriculumSection"("sortOrder");

-- CreateIndex
CREATE INDEX "CurriculumItem_sectionId_idx" ON "public"."CurriculumItem"("sectionId");

-- CreateIndex
CREATE INDEX "CurriculumItem_sortOrder_idx" ON "public"."CurriculumItem"("sortOrder");

-- CreateIndex
CREATE INDEX "StudentCurriculumProgress_studentId_idx" ON "public"."StudentCurriculumProgress"("studentId");

-- CreateIndex
CREATE INDEX "StudentCurriculumProgress_curriculumId_idx" ON "public"."StudentCurriculumProgress"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCurriculumProgress_studentId_curriculumId_key" ON "public"."StudentCurriculumProgress"("studentId", "curriculumId");

-- CreateIndex
CREATE INDEX "StudentItemProgress_curriculumProgressId_idx" ON "public"."StudentItemProgress"("curriculumProgressId");

-- CreateIndex
CREATE INDEX "StudentItemProgress_itemId_idx" ON "public"."StudentItemProgress"("itemId");

-- CreateIndex
CREATE INDEX "StudentItemProgress_status_idx" ON "public"."StudentItemProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentItemProgress_curriculumProgressId_itemId_key" ON "public"."StudentItemProgress"("curriculumProgressId", "itemId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonAttachment" ADD CONSTRAINT "LessonAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonLink" ADD CONSTRAINT "LessonLink_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryItem" ADD CONSTRAINT "LibraryItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recommendation" ADD CONSTRAINT "Recommendation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curriculum" ADD CONSTRAINT "Curriculum_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CurriculumSection" ADD CONSTRAINT "CurriculumSection_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "public"."Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CurriculumItem" ADD CONSTRAINT "CurriculumItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."CurriculumSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentCurriculumProgress" ADD CONSTRAINT "StudentCurriculumProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentCurriculumProgress" ADD CONSTRAINT "StudentCurriculumProgress_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "public"."Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentItemProgress" ADD CONSTRAINT "StudentItemProgress_curriculumProgressId_fkey" FOREIGN KEY ("curriculumProgressId") REFERENCES "public"."StudentCurriculumProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentItemProgress" ADD CONSTRAINT "StudentItemProgress_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."CurriculumItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

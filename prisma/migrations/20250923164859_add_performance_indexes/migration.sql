-- Performance Optimization Indexes for Guitar Strategies
-- Focus on the most critical indexes for production performance

-- Lesson - composite indexes for common queries (most critical for performance)
CREATE INDEX IF NOT EXISTS "Lesson_teacherId_status_idx" ON "Lesson"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "Lesson_studentId_status_idx" ON "Lesson"("studentId", "status");
CREATE INDEX IF NOT EXISTS "Lesson_date_status_idx" ON "Lesson"("date", "status");
CREATE INDEX IF NOT EXISTS "Lesson_createdAt_idx" ON "Lesson"("createdAt");
CREATE INDEX IF NOT EXISTS "Lesson_isRecurring_idx" ON "Lesson"("isRecurring");

-- Invoice - performance indexes for billing queries
CREATE INDEX IF NOT EXISTS "Invoice_teacherId_status_idx" ON "Invoice"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_studentId_status_idx" ON "Invoice"("studentId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_month_idx" ON "Invoice"("month");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- TeacherAvailability - for scheduling queries
CREATE INDEX IF NOT EXISTS "TeacherAvailability_teacherId_dayOfWeek_idx" ON "TeacherAvailability"("teacherId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "TeacherAvailability_teacherId_isActive_idx" ON "TeacherAvailability"("teacherId", "isActive");

-- RecurringSlot - for recurring lesson queries
CREATE INDEX IF NOT EXISTS "RecurringSlot_teacherId_status_idx" ON "RecurringSlot"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "RecurringSlot_studentId_status_idx" ON "RecurringSlot"("studentId", "status");
CREATE INDEX IF NOT EXISTS "RecurringSlot_dayOfWeek_idx" ON "RecurringSlot"("dayOfWeek");

-- MonthlyBilling - for billing queries
CREATE INDEX IF NOT EXISTS "MonthlyBilling_teacherId_month_idx" ON "MonthlyBilling"("teacherId", "month");
CREATE INDEX IF NOT EXISTS "MonthlyBilling_studentId_month_idx" ON "MonthlyBilling"("studentId", "month");

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS "TeacherProfile_isAdmin_idx" ON "TeacherProfile"("isAdmin");
CREATE INDEX IF NOT EXISTS "StudentProfile_joinedAt_idx" ON "StudentProfile"("joinedAt");
CREATE INDEX IF NOT EXISTS "InvoiceItem_lessonId_idx" ON "InvoiceItem"("lessonId");
CREATE INDEX IF NOT EXISTS "StudentChecklistItem_isCompleted_idx" ON "StudentChecklistItem"("isCompleted");
CREATE INDEX IF NOT EXISTS "Curriculum_teacherId_isActive_idx" ON "Curriculum"("teacherId", "isActive");
CREATE INDEX IF NOT EXISTS "EmailPreference_enabled_idx" ON "EmailPreference"("enabled");
CREATE INDEX IF NOT EXISTS "SlotSubscription_status_idx" ON "SlotSubscription"("status");
-- Add missing indexes for recurring slot queries optimization

-- 1. Composite index for finding active recurring slots by teacher
-- Used by: background-jobs.ts, recurring-lessons.ts
CREATE INDEX IF NOT EXISTS "RecurringSlot_teacherId_status_dayOfWeek_idx" ON "RecurringSlot"("teacherId", "status", "dayOfWeek");

-- 2. Index for lesson existence checks in recurring lesson generation
-- Used by: recurring-lessons.ts for duplicate prevention
CREATE INDEX IF NOT EXISTS "Lesson_teacherId_studentId_date_idx" ON "Lesson"("teacherId", "studentId", "date");

-- 3. Composite index for teacher profile queries with recurring slots
-- Used by: background-jobs.ts for finding teachers with active slots
CREATE INDEX IF NOT EXISTS "TeacherProfile_isActive_id_idx" ON "TeacherProfile"("isActive", "id");

-- 4. Index for recurring slot conflict checks
-- Used by: slot booking API for checking existing bookings
CREATE INDEX IF NOT EXISTS "RecurringSlot_teacherId_dayOfWeek_startTime_status_idx" ON "RecurringSlot"("teacherId", "dayOfWeek", "startTime", "status");

-- 5. Index for student recurring slot queries
-- Used by: student dashboard and slot management
CREATE INDEX IF NOT EXISTS "RecurringSlot_studentId_status_dayOfWeek_idx" ON "RecurringSlot"("studentId", "status", "dayOfWeek");

-- 6. Index for teacher availability queries  
-- Used by: scheduler.ts for availability checks
CREATE INDEX IF NOT EXISTS "TeacherAvailability_teacherId_dayOfWeek_isActive_idx" ON "TeacherAvailability"("teacherId", "dayOfWeek", "isActive");

-- 7. Index for lesson date range queries with teacher and status
-- Used by: scheduler.ts for conflict checking
CREATE INDEX IF NOT EXISTS "Lesson_teacherId_date_status_idx" ON "Lesson"("teacherId", "date", "status");

-- 8. Index for blocked time range queries
-- Used by: scheduler.ts for availability checks
CREATE INDEX IF NOT EXISTS "TeacherBlockedTime_teacherId_startTime_endTime_idx" ON "TeacherBlockedTime"("teacherId", "startTime", "endTime");

-- 9. Index for recurring slot age-based queries
-- Used by: background-jobs.ts for system health validation
CREATE INDEX IF NOT EXISTS "RecurringSlot_status_bookedAt_idx" ON "RecurringSlot"("status", "bookedAt");

-- 10. Composite index for teacher profile lesson settings queries
-- Used by: teacher validation and setup workflows
CREATE INDEX IF NOT EXISTS "TeacherProfile_isActive_userId_idx" ON "TeacherProfile"("isActive", "userId");
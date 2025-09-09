-- Performance Indexes for Dashboard and API Optimization
-- These indexes improve query performance for common dashboard statistics and lesson queries

-- Index for lessons by teacher with date ordering and status filtering
-- Optimizes teacher dashboard queries and lesson statistics
CREATE INDEX idx_lessons_teacher_date_status ON "Lesson"("teacherId", "date" DESC, "status");

-- Index for lessons by student with date ordering and status filtering  
-- Optimizes student dashboard queries and lesson history
CREATE INDEX idx_lessons_student_date_status ON "Lesson"("studentId", "date" DESC, "status");

-- Index for active teacher profiles by user
-- Optimizes teacher lookup queries and authentication flows
CREATE INDEX idx_teacher_profile_user_active ON "TeacherProfile"("userId", "isActive");
-- This migration was already applied directly to the database
-- Documenting the changes for migration history

-- Add LESSON_BOOKING_RECURRING to EmailType enum
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'LESSON_BOOKING_RECURRING';

-- Drop the unique constraint on RecurringSlot that included status
-- (This was removed to handle edge cases with slot status changes)
DROP INDEX IF EXISTS "RecurringSlot_teacherId_dayOfWeek_startTime_duration_status_key";

-- The following changes were already applied in earlier migration
-- Just documenting here for history:
-- - EmailPreference table created
-- - EmailTemplate table created
-- - Email-related indexes added

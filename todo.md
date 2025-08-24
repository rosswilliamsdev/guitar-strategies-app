# Guitar Strategies App - Todo List

## Priority Issues for Next Session 🚨

### Critical System Features
- [ ] **Teacher Settings Validation**: Ensure all teachers have proper lesson settings configured (prevent empty availability like we just fixed)

### User Experience Improvements
- [ ] **Better Loading States**: Add proper loading indicators during booking process with skeleton UI
- [ ] **Timezone Display Consistency**: Show timezone information clearly in availability calendar and booking confirmations
- [ ] **Weekly Lesson Display Polish**: Improve the recurring lesson card layout and make cancellation flow more intuitive

### Technical Enhancements
- [ ] **API Error Handling**: Standardize error responses across all booking/scheduling endpoints
- [ ] **Database Indexing**: Add missing database indexes for recurring slot queries to improve performance

## Recently Completed ✅

- [x] **Student Booking Success Feedback Modal (Aug 24, 2025)** - Comprehensive confirmation modal for booking success
  - [x] Created detailed BookingSuccessModal component with professional design
  - [x] Shows different content for single vs recurring bookings with clear time reservation language
  - [x] Displays teacher details, schedule, duration, and investment information
  - [x] Lists first 4 reserved time slots for recurring bookings with auto-generation notice
  - [x] Emphasizes time commitment business model - payment due whether attending or canceling
  - [x] Includes clear "What Happens Next" section with payment policy communication
  - [x] Fixed scrollable modal with proper overflow handling and removed non-functional elements
  - [x] Updated language throughout to emphasize "time reservation" vs "lesson purchase"
  - [x] Removed duplicate booking logic in BookingSection that was bypassing modal
  - [x] Shows weekly investment rate instead of per-lesson to clarify ongoing commitment
  - [x] Modal closes on user action (no auto-redirect) with options to close or view lessons

- [x] **Complete Automatic Lesson Generation System (Aug 24, 2025)** - Production-ready background job system
  - [x] Built comprehensive background job engine (`lib/background-jobs.ts`)
  - [x] Added BackgroundJobLog database model with proper indexing
  - [x] Created cron endpoint (`/api/cron/generate-lessons`) for automated execution
  - [x] Implemented admin management APIs for job monitoring and manual triggering
  - [x] Built admin dashboard (`/admin/background-jobs`) with real-time monitoring
  - [x] Configured Vercel Cron integration with daily scheduling
  - [x] Added comprehensive system health validation and error handling
  - [x] Generated lessons 12 weeks in advance with duplicate prevention
  - [x] Updated middleware to allow cron endpoint access
  - [x] Created detailed setup documentation and deployment guide

- [x] **Teacher Availability Fix (Aug 24, 2025)** - Fixed critical issue where teacher availability wasn't showing for students
  - [x] Identified missing TeacherLessonSettings as root cause
  - [x] Created proper lesson settings with pricing configuration
  - [x] Removed extensive debug logging from scheduler and API endpoints
  - [x] Fixed unused imports and technical debt cleanup

- [x] **Database Constraint Violation Fix (Aug 24, 2025)** - Fixed recurring lesson cancellation error
  - [x] Identified unique constraint issue on RecurringSlot table (`teacherId`, `dayOfWeek`, `startTime`, `duration`, `status`)
  - [x] Changed cancellation logic from status update to slot deletion to avoid constraint violations
  - [x] Updated API response messages and logging to reflect deletion instead of status changes
  - [x] Added additional logging to track cancelled slots for debugging purposes
  - [x] Preserved lesson history while removing recurring slot bookings cleanly
  
- [x] **Recurring Lesson System Improvements (Aug 24, 2025)**  
  - [x] Unified on RecurringSlot model for indefinite recurring lessons
  - [x] Implemented per-lesson pricing with dynamic monthly rate calculation
  - [x] Fixed booking validation for advance booking limits
  - [x] Improved weekly lesson display UI with single card layout
  - [x] Added softer cancel button styling inside lesson cards

- [x] **Modal System Enhancements (Aug 23, 2025)**
  - [x] Replaced all browser alert() and confirm() dialogs with professional modals
  - [x] Fixed missing Dialog imports and state variables
  - [x] Added proper error handling modals throughout application

- [x] Teacher-initiated booking system (Aug 17, 2025)
  - [x] Teachers can assign students to open time slots from schedule page
  - [x] Support for single and recurring lesson bookings
  - [x] Modal interface for student selection and booking type
  - [x] API endpoint for teacher-initiated bookings
  - [x] Fixed nested button HTML validation issues in TimePicker
  - [x] Show open time slots even when no lessons scheduled

## Email Notification System

- [ ] Create an email notification system
  - [ ] Send email to student when lesson is cancelled
  - [ ] Send email to teacher when lesson is cancelled
  - [ ] Include lesson details (date, time, duration) in cancellation emails
  - [ ] Set up email service provider (e.g., SendGrid, Mailgun, or Resend)
  - [ ] Create email templates for lesson cancellation notifications
  - [ ] Add email sending functionality to lesson cancellation API endpoint
  - [ ] Handle email delivery failures gracefully
  - [ ] Add email preferences to user settings (opt-in/opt-out)

## Makeup Credit System

- [ ] Implement makeup credit system for cancelled lessons
  - [ ] Create database schema for makeup credits
    - [ ] Add MakeupCredit model with fields: id, studentId, teacherId, originalLessonId, creditAmount, issueDate, expirationDate (2 weeks from issue), isUsed, usedAt, usedForLessonId
    - [ ] Add relationship between MakeupCredit and Student/Teacher/Lesson models
  - [ ] Automatic credit generation
    - [ ] When student cancels a lesson, automatically create a makeup credit
    - [ ] Set expiration date to 2 weeks past the cancelled lesson date
    - [ ] Credit amount should match the cancelled lesson duration/value
  - [ ] Credit management interface
    - [ ] Student dashboard showing available makeup credits
    - [ ] Display credit details (amount, expiration date, from which cancelled lesson)
    - [ ] Show expired credits (grayed out)
    - [ ] Alert students when credits are about to expire (within 3 days)
  - [ ] Credit redemption system
    - [ ] Allow students to apply makeup credits when booking new lessons
    - [ ] Automatically apply oldest credits first (FIFO)
    - [ ] Mark credits as used when applied to a new booking
    - [ ] Update lesson records to show if paid with makeup credit
  - [ ] Teacher visibility
    - [ ] Teacher dashboard showing student makeup credit balances
    - [ ] History of issued and redeemed credits
    - [ ] Reports on credit usage patterns
  - [ ] Credit expiration handling
    - [ ] Automated cleanup of expired credits
    - [ ] Email notifications before credits expire (3 days, 1 day warnings)
    - [ ] Track expired credit statistics for reporting
  - [ ] API endpoints
    - [ ] GET /api/makeup-credits - List student's credits
    - [ ] POST /api/makeup-credits/redeem - Apply credit to lesson booking
    - [ ] GET /api/makeup-credits/teacher - Teacher view of all student credits
  - [ ] Business rules
    - [ ] Credits cannot be transferred between students
    - [ ] Credits cannot be refunded for cash
    - [ ] Maximum credit accumulation limit (e.g., 3 credits per student)
    - [ ] Handle edge cases (teacher cancellations vs student cancellations)

## Schedule Management Enhancements

- [ ] Drag-and-drop lesson rescheduling
  - [ ] Allow teachers to drag lessons to different time slots
  - [ ] Check availability before allowing drop
  - [ ] Send notification to student about reschedule
  - [ ] Option to reschedule entire recurring series

- [ ] Bulk actions for lessons
  - [ ] Select multiple lessons for cancellation
  - [ ] Bulk mark as completed
  - [ ] Bulk move to different time slot
  
- [ ] Student swap functionality
  - [ ] Allow teachers to swap two students' lesson times
  - [ ] Notify both students of the swap
  
## TypeScript and Code Quality

- [ ] Fix remaining TypeScript type mismatches
  - [ ] Update component prop types to handle null vs undefined properly
  - [ ] Fix enum type conversions (LessonStatus, etc.)
  - [ ] Resolve teacher/student profile type inconsistencies
# Guitar Strategies App - Todo List

## Priority Issues for Next Session 🚨

### High Priority Technical Debt
- [ ] **Remove Debug Logging**: Clean up extensive `console.log` statements added for debugging
- [ ] **Fix Unused Imports**: Remove `bookRecurringLessons` import from booking route (no longer used)
- [ ] **Schema Field Consistency**: Fix mismatch between `allows30Min/allows60Min` in schema vs `allow30Min/allow60Min` in validation logic

### Critical UX Issues  
- [ ] **Unify Recurring Lesson Systems**: Decide between RecurringSlot model vs individual recurring lessons - currently have both
- [ ] **Monthly Rate Billing Logic**: Address confusion between fixed "4 lessons/month" vs actual monthly occurrences (4-5 lessons)

### User Experience Gaps
- [ ] **Automatic Lesson Generation**: RecurringSlots only create 4 weeks initially - need automatic generation as time progresses
- [ ] **Booking Success Feedback**: Add clear confirmation of what was created after booking recurring lessons  
- [ ] **Timezone Consistency**: Fix remaining inconsistencies in timezone handling across booking/display

### Polish & Features
- [ ] **Better Loading States**: Add proper loading indicators during booking process
- [ ] **Email Notifications**: Add notifications when lessons are booked/cancelled
- [ ] **Calendar Integration**: Allow students to add lessons to personal calendars

## Recently Completed ✅

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
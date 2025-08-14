# Guitar Strategies App - Todo List

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
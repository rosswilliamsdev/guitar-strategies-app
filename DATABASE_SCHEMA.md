# Guitar Strategies - Database Schema Reference

**Last Updated:** March 11, 2026
**Database:** PostgreSQL
**ORM:** Prisma 6.13.0

---

## Table of Contents

1. [Authentication & Users](#authentication--users)
2. [Core Profiles](#core-profiles)
3. [Teaching & Scheduling](#teaching--scheduling)
4. [Billing & Invoicing](#billing--invoicing)
5. [Content & Learning](#content--learning)
6. [System & Configuration](#system--configuration)
7. [Enums Reference](#enums-reference)
8. [Relationship Diagrams](#relationship-diagrams)

---

## Authentication & Users

### `User`
**Purpose:** Central authentication table for all users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique user identifier |
| `email` | String | UNIQUE, INDEXED | User email address |
| `password` | String? | NULLABLE | Bcrypt hashed password |
| `name` | String | REQUIRED | User's full name |
| `role` | Role | DEFAULT: STUDENT, INDEXED | STUDENT, TEACHER, or ADMIN |
| `createdAt` | DateTime | DEFAULT: now() | Account creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update timestamp |

**Relationships:**
- `teacherProfile` → TeacherProfile (1:1)
- `studentProfile` → StudentProfile (1:1)
- `sessions` → Session[] (1:many)
- `accounts` → Account[] (1:many)
- `passwordResetTokens` → PasswordResetToken[] (1:many)
- `emailPreferences` → EmailPreference[] (1:many)
- `createdChecklists` → StudentChecklist[] (1:many)

**Notes:**
- One user can only have ONE role (student OR teacher OR admin)
- Profile tables extend User based on role
- Password is nullable (for OAuth users, currently unused)

---

### `Session`
**Purpose:** NextAuth session storage (CURRENTLY UNUSED - JWT strategy)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Session identifier |
| `sessionToken` | String | UNIQUE | Session token |
| `userId` | String | FK → User.id | User owning the session |
| `expires` | DateTime | REQUIRED | Session expiration |

**Cascade:** DELETE User → DELETE Sessions

**Notes:**
- Table exists but is **NOT USED** in production
- App uses JWT strategy (stateless sessions)
- Sessions stored in HTTP-only cookies, not database

---

### `Account`
**Purpose:** OAuth provider accounts (CURRENTLY UNUSED)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Account identifier |
| `userId` | String | FK → User.id | Associated user |
| `type` | String | REQUIRED | Account type |
| `provider` | String | REQUIRED | OAuth provider (Google, GitHub, etc.) |
| `providerAccountId` | String | REQUIRED | Provider's user ID |
| `refresh_token` | String? | NULLABLE | OAuth refresh token |
| `access_token` | String? | NULLABLE | OAuth access token |
| `expires_at` | Int? | NULLABLE | Token expiration (unix timestamp) |
| `token_type` | String? | NULLABLE | Token type (Bearer, etc.) |
| `scope` | String? | NULLABLE | OAuth scopes |
| `id_token` | String? | NULLABLE | ID token |
| `session_state` | String? | NULLABLE | Session state |

**Unique Constraint:** `[provider, providerAccountId]`
**Cascade:** DELETE User → DELETE Accounts

**Notes:**
- Table exists but OAuth is **NOT IMPLEMENTED**
- Only credentials provider (email/password) is active

---

### `PasswordResetToken`
**Purpose:** Temporary tokens for password reset flow

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Token identifier |
| `userId` | String | FK → User.id, INDEXED | User requesting reset |
| `token` | String | UNIQUE | Bcrypt hashed token |
| `expires` | DateTime | REQUIRED | Token expiration |
| `createdAt` | DateTime | DEFAULT: now() | Token creation time |

**Cascade:** DELETE User → DELETE Tokens

**Notes:**
- Tokens are bcrypt hashed (not plain text)
- Expires after 1 hour
- Deleted after successful password reset

---

### `VerificationToken`
**Purpose:** Email verification tokens (NextAuth)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `identifier` | String | REQUIRED | User identifier (email) |
| `token` | String | UNIQUE | Verification token |
| `expires` | DateTime | REQUIRED | Token expiration |

**Unique Constraint:** `[identifier, token]`

**Notes:**
- Currently unused (no email verification flow)

---

## Core Profiles

### `TeacherProfile`
**Purpose:** Extended profile for teachers with business settings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Profile identifier |
| `userId` | String | UNIQUE, FK → User.id, INDEXED | Associated user account |
| `bio` | String? | NULLABLE | Teacher biography |
| `hourlyRate` | Int? | NULLABLE | Hourly rate in cents |
| `isActive` | Boolean | DEFAULT: true, INDEXED | Active status |
| `isAdmin` | Boolean | DEFAULT: false | Admin privileges flag |
| `venmoHandle` | String? | NULLABLE | Venmo username (@user) |
| `paypalEmail` | String? | NULLABLE | PayPal email for invoices |
| `zelleEmail` | String? | NULLABLE | Zelle email/phone |
| `timezone` | String | DEFAULT: "America/Chicago" | Teacher's timezone |
| `phoneNumber` | String? | NULLABLE | Contact phone |
| `profileImageUrl` | String? | NULLABLE | Avatar URL |
| `createdAt` | DateTime | DEFAULT: now() | Profile creation |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `user` ← User (1:1)
- `students` → StudentProfile[] (1:many) - *"TeacherStudents"*
- `lessons` → Lesson[] (1:many)
- `recurringSlots` → RecurringSlot[] (1:many)
- `invoices` → Invoice[] (1:many)
- `curriculums` → Curriculum[] (1:many)
- `libraryItems` → LibraryItem[] (1:many)
- `recommendations` → Recommendation[] (1:many)
- `availability` → TeacherAvailability[] (1:many)
- `lessonSettings` → TeacherLessonSettings (1:1)
- `monthlyBilling` → MonthlyBilling[] (1:many)
- `studentInvitations` → StudentInvitation[] (1:many)

**Cascade:** DELETE User → DELETE TeacherProfile → CASCADE to all related records

**Notes:**
- `isAdmin` allows teachers to access admin routes
- Payment methods (Venmo/PayPal/Zelle) displayed on invoices
- Solo teacher model: no cross-teacher relationships

---

### `StudentProfile`
**Purpose:** Extended profile for students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Profile identifier |
| `userId` | String | UNIQUE, FK → User.id, INDEXED | Associated user account |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Assigned teacher |
| `joinedAt` | DateTime | DEFAULT: now() | Enrollment date |
| `goals` | String? | NULLABLE | Student learning goals |
| `instrument` | String | DEFAULT: "guitar" | Primary instrument |
| `phoneNumber` | String? | NULLABLE | Contact phone |
| `parentEmail` | String? | NULLABLE | Parent email (for minors) |
| `emergencyContact` | String? | NULLABLE | Emergency contact info |
| `isActive` | Boolean | DEFAULT: true, INDEXED | Active enrollment status |
| `emailOnInvoice` | Boolean | DEFAULT: true | Email invoice notifications |
| `emailOnLessonComplete` | Boolean | DEFAULT: true | Email lesson complete notifications |
| `emailOnLessonReminder` | Boolean | DEFAULT: true | Email lesson reminders |
| `createdAt` | DateTime | DEFAULT: now() | Profile creation |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `user` ← User (1:1)
- `teacher` ← TeacherProfile (many:1) - *"TeacherStudents"*
- `lessons` → Lesson[] (1:many)
- `recurringSlots` → RecurringSlot[] (1:many)
- `invoices` → Invoice[] (1:many)
- `studentChecklists` → StudentChecklist[] (1:many)
- `studentProgress` → StudentCurriculumProgress[] (1:many)
- `slotSubscriptions` → SlotSubscription[] (1:many)
- `monthlyBilling` → MonthlyBilling[] (1:many)
- `invitation` → StudentInvitation (1:1)

**Cascade:** DELETE User → DELETE StudentProfile → CASCADE to all related records
**Cascade:** DELETE TeacherProfile → DELETE StudentProfile (students belong to teachers)

**Notes:**
- `teacherId` is REQUIRED - students must belong to a teacher
- Email preferences control notification behavior
- Students cannot exist without an assigned teacher

---

## Teaching & Scheduling

### `Lesson`
**Purpose:** Individual lesson records (scheduled or completed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Lesson identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Teacher |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `date` | DateTime | REQUIRED, INDEXED | Lesson date/time |
| `duration` | Int | REQUIRED | Lesson length (30 or 60 minutes) |
| `status` | LessonStatus | DEFAULT: SCHEDULED, INDEXED | Status enum |
| `notes` | String? | NULLABLE | Teacher notes (Tiptap HTML, max 5000 chars) |
| `homework` | String? | NULLABLE | Assigned homework (Tiptap HTML) |
| `progress` | String? | NULLABLE | Progress notes (Tiptap HTML) |
| `nextSteps` | String? | NULLABLE | Next steps (Tiptap HTML) |
| `focusAreas` | String? | NULLABLE | Focus areas (comma-separated) |
| `songsPracticed` | String? | NULLABLE | Songs practiced (comma-separated) |
| `studentRating` | Int? | NULLABLE | Student self-rating (1-5) |
| `teacherRating` | Int? | NULLABLE | Teacher assessment (1-5) |
| `isRecurring` | Boolean | DEFAULT: false | Generated from recurring slot? |
| `recurringId` | String? | NULLABLE, INDEXED | Legacy recurring identifier |
| `recurringSlotId` | String? | NULLABLE, FK, INDEXED | Link to RecurringSlot |
| `price` | Int | DEFAULT: 0 | Lesson price in cents |
| `timezone` | String | DEFAULT: "America/Chicago" | Lesson timezone |
| `checklistItems` | String? | NULLABLE | Checklist items (JSON) |
| `version` | Int | DEFAULT: 1 | Optimistic locking version |
| `createdAt` | DateTime | DEFAULT: now() | Record creation |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)
- `student` ← StudentProfile (many:1)
- `recurringSlot` ← RecurringSlot (many:1)
- `attachments` → LessonAttachment[] (1:many)
- `links` → LessonLink[] (1:many)
- `invoiceItems` → InvoiceItem[] (1:many)

**Composite Indexes:**
- `[teacherId, date]` - Teacher's lessons by date
- `[studentId, date]` - Student's lessons by date

**Cascade:** DELETE Student/Teacher → DELETE Lessons → CASCADE to attachments/links

**Notes:**
- Rich text fields use Tiptap HTML format
- `version` field enables optimistic locking (concurrent edit prevention)
- Recurring lessons link back to their generating slot
- Status flow: SCHEDULED → COMPLETED/CANCELLED/MISSED/NO_SHOW

---

### `LessonAttachment`
**Purpose:** Files attached to lessons (PDFs, audio, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Attachment identifier |
| `lessonId` | String | FK → Lesson.id, INDEXED | Parent lesson |
| `fileName` | String | REQUIRED | Stored filename |
| `originalName` | String | REQUIRED | Original upload filename |
| `fileSize` | Int | REQUIRED | File size in bytes |
| `mimeType` | String | REQUIRED | MIME type (application/pdf, etc.) |
| `fileUrl` | String | REQUIRED | Vercel Blob storage URL |
| `uploadedAt` | DateTime | DEFAULT: now() | Upload timestamp |

**Relationships:**
- `lesson` ← Lesson (many:1)

**Cascade:** DELETE Lesson → DELETE Attachments

---

### `LessonLink`
**Purpose:** External links attached to lessons (YouTube, Spotify, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Link identifier |
| `lessonId` | String | FK → Lesson.id, INDEXED | Parent lesson |
| `title` | String | REQUIRED | Link title |
| `url` | String | REQUIRED | Link URL |
| `description` | String? | NULLABLE | Link description |
| `linkType` | LinkType | DEFAULT: WEBSITE | Type enum |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |

**Relationships:**
- `lesson` ← Lesson (many:1)

**Cascade:** DELETE Lesson → DELETE Links

**LinkType values:** WEBSITE, YOUTUBE, VIMEO, SPOTIFY, OTHER

---

### `RecurringSlot`
**Purpose:** Weekly recurring lesson time slots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Slot identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Teacher |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `dayOfWeek` | Int | REQUIRED, INDEXED | 0-6 (Sunday-Saturday) |
| `startTime` | String | REQUIRED | "HH:MM" format (e.g., "14:00") |
| `duration` | Int | REQUIRED | 30 or 60 minutes |
| `status` | SlotStatus | DEFAULT: ACTIVE, INDEXED | Status enum |
| `perLessonPrice` | Int | REQUIRED | Price per lesson in cents |
| `bookedAt` | DateTime | DEFAULT: now() | Booking timestamp |
| `cancelledAt` | DateTime? | NULLABLE | Cancellation timestamp |
| `version` | Int | DEFAULT: 1 | Optimistic locking version |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)
- `student` ← StudentProfile (many:1)
- `lessons` → Lesson[] (1:many) - *"SlotLessons"*
- `subscriptions` → SlotSubscription[] (1:many)

**Composite Indexes:**
- `[teacherId, status]` - Teacher's active slots
- `[studentId, status]` - Student's active slots

**Cascade:** DELETE Student/Teacher → DELETE RecurringSlots → CASCADE to lessons

**Notes:**
- Background job generates Lesson records 12 weeks in advance
- Example: "Every Tuesday at 2:00pm for 30 minutes"
- Status: ACTIVE → generating lessons, CANCELLED → stopped

---

### `TeacherAvailability`
**Purpose:** Teacher's weekly availability schedule

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Availability identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Teacher |
| `dayOfWeek` | Int | REQUIRED, INDEXED | 0-6 (Sunday-Saturday) |
| `startTime` | String | REQUIRED | "HH:MM" format (e.g., "09:00") |
| `endTime` | String | REQUIRED | "HH:MM" format (e.g., "17:00") |
| `isActive` | Boolean | DEFAULT: true | Active status |
| `version` | Int | DEFAULT: 1 | Optimistic locking version |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)

**Unique Constraint:** `[teacherId, dayOfWeek, startTime, endTime]`
**Cascade:** DELETE TeacherProfile → DELETE Availability

**Notes:**
- Defines when teacher is available for booking
- Example: Monday 9am-5pm, Wednesday 10am-6pm
- Used by booking UI to show available time slots

---

### `TeacherLessonSettings`
**Purpose:** Teacher's lesson pricing and duration configuration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Settings identifier |
| `teacherId` | String | UNIQUE, FK → TeacherProfile.id, INDEXED | Teacher (1:1 relationship) |
| `allows30Min` | Boolean | DEFAULT: true | Enable 30-minute lessons |
| `allows60Min` | Boolean | DEFAULT: true | Enable 60-minute lessons |
| `price30Min` | Int | REQUIRED | Price for 30-min lesson (cents) |
| `price60Min` | Int | REQUIRED | Price for 60-min lesson (cents) |
| `advanceBookingDays` | Int | DEFAULT: 21 | How far ahead teachers can book (1-90 days) |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (1:1)

**Cascade:** DELETE TeacherProfile → DELETE Settings

**Notes:**
- One settings record per teacher
- Teachers can disable 30 or 60 minute durations
- Advance booking prevents overbooking too far in future

---

## Billing & Invoicing

### `Invoice`
**Purpose:** Monthly invoices for lesson payments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Invoice identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Teacher issuing invoice |
| `studentId` | String? | NULLABLE, FK → StudentProfile.id, INDEXED | Student (null for custom invoices) |
| `invoiceNumber` | String | REQUIRED | Formatted number (e.g., "INV-2026-001") |
| `month` | String | REQUIRED, INDEXED | "YYYY-MM" format (e.g., "2026-03") |
| `dueDate` | DateTime | REQUIRED, INDEXED | Payment due date |
| `status` | InvoiceStatus | DEFAULT: PENDING, INDEXED | Status enum |
| `subtotal` | Int | REQUIRED | Subtotal in cents |
| `total` | Int | REQUIRED | Total amount in cents |
| `paidAt` | DateTime? | NULLABLE | Payment received timestamp |
| `paymentMethod` | String? | NULLABLE | Payment method (Venmo, PayPal, etc.) |
| `paymentNotes` | String? | NULLABLE | Payment reference notes |
| `customFullName` | String? | NULLABLE | Custom invoice recipient name |
| `customEmail` | String? | NULLABLE | Custom invoice recipient email |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)
- `student` ← StudentProfile (many:1, NULLABLE)
- `items` → InvoiceItem[] (1:many)

**Composite Indexes:**
- `[teacherId, month]` - Teacher's monthly invoices
- `[studentId, month]` - Student's monthly invoices

**Cascade:** DELETE TeacherProfile → DELETE Invoices
**No Cascade:** DELETE StudentProfile (allows historical invoices for deleted students)

**Notes:**
- Generated monthly by background job
- Custom invoices (non-students) use `customFullName` and `customEmail`
- Status flow: PENDING → SENT → VIEWED → PAID or OVERDUE
- Teachers mark as PAID manually after receiving payment

---

### `InvoiceItem`
**Purpose:** Individual line items on invoices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Item identifier |
| `invoiceId` | String | FK → Invoice.id, INDEXED | Parent invoice |
| `description` | String | REQUIRED | Line item description |
| `quantity` | Int | DEFAULT: 1 | Quantity |
| `rate` | Int | REQUIRED | Per-unit rate in cents |
| `amount` | Int | REQUIRED | Total amount (quantity × rate) |
| `lessonDate` | DateTime? | NULLABLE | Associated lesson date |
| `lessonId` | String? | NULLABLE, FK → Lesson.id, INDEXED | Link to lesson |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |

**Relationships:**
- `invoice` ← Invoice (many:1)
- `lesson` ← Lesson (many:1, NULLABLE)

**Cascade:** DELETE Invoice → DELETE Items

**Notes:**
- Typically one item per lesson
- Description example: "Guitar Lesson - Mar 15, 2026"
- Optional lesson reference links invoice to specific lesson

---

### `SlotSubscription`
**Purpose:** Recurring monthly subscriptions for lesson slots

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Subscription identifier |
| `slotId` | String | FK → RecurringSlot.id, INDEXED | Recurring slot |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `startMonth` | String | REQUIRED | "YYYY-MM" start month |
| `endMonth` | String? | NULLABLE | "YYYY-MM" end month (null = ongoing) |
| `monthlyRate` | Int | REQUIRED | Monthly subscription rate (cents) |
| `status` | SubscriptionStatus | DEFAULT: ACTIVE, INDEXED | Status enum |
| `lastBilledMonth` | String? | NULLABLE | Last billed "YYYY-MM" |
| `nextBillDate` | DateTime? | NULLABLE, INDEXED | Next billing date |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `slot` ← RecurringSlot (many:1)
- `student` ← StudentProfile (many:1)
- `billingRecords` → MonthlyBilling[] (1:many)

**Unique Constraint:** `[slotId, studentId, startMonth]`

**Cascade:** DELETE RecurringSlot → DELETE Subscriptions
**Cascade:** DELETE StudentProfile → DELETE Subscriptions

**Notes:**
- Tracks "pay monthly for weekly lessons" arrangements
- Status: ACTIVE, PAUSED, CANCELLED, EXPIRED
- Background job creates MonthlyBilling records

---

### `MonthlyBilling`
**Purpose:** Individual monthly billing records for subscriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Billing record identifier |
| `subscriptionId` | String | FK → SlotSubscription.id, INDEXED | Parent subscription |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Teacher |
| `month` | String | REQUIRED, INDEXED | "YYYY-MM" billing month |
| `expectedLessons` | Int | REQUIRED | Expected lesson count (e.g., 4 for weekly) |
| `actualLessons` | Int | DEFAULT: 0 | Actual lessons delivered |
| `ratePerLesson` | Int | REQUIRED | Rate per lesson (cents) |
| `totalAmount` | Int | REQUIRED | Total bill (expectedLessons × rate) |
| `status` | BillingStatus | DEFAULT: PENDING, INDEXED | Status enum |
| `billedAt` | DateTime? | NULLABLE | Billing timestamp |
| `paidAt` | DateTime? | NULLABLE | Payment timestamp |
| `paymentMethod` | String? | NULLABLE | Payment method used |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `subscription` ← SlotSubscription (many:1)
- `student` ← StudentProfile (many:1)
- `teacher` ← TeacherProfile (many:1)

**Unique Constraint:** `[subscriptionId, month]`

**Composite Indexes:**
- `[studentId, month]` - Student's monthly bills
- `[teacherId, month]` - Teacher's monthly billing

**Cascade:** DELETE SlotSubscription → DELETE Billing Records

**Notes:**
- One record per subscription per month
- Status: PENDING → BILLED → PAID or OVERDUE
- Tracks expected vs actual lesson delivery

---

## Content & Learning

### `Curriculum`
**Purpose:** Teacher-created learning paths/courses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Curriculum identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Creating teacher |
| `title` | String | REQUIRED | Curriculum title |
| `description` | String? | NULLABLE | Curriculum description |
| `isActive` | Boolean | DEFAULT: true | Active status |
| `isPublished` | Boolean | DEFAULT: false, INDEXED | Published to students |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)
- `sections` → CurriculumSection[] (1:many)
- `studentProgress` → StudentCurriculumProgress[] (1:many)

**Cascade:** DELETE TeacherProfile → DELETE Curriculums → CASCADE to sections/progress

**Notes:**
- Teachers build structured learning paths
- `isPublished` controls student visibility
- Example: "Beginner Guitar Fundamentals"

---

### `CurriculumSection`
**Purpose:** Sections within a curriculum (e.g., "Open Chords")

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Section identifier |
| `curriculumId` | String | FK → Curriculum.id, INDEXED | Parent curriculum |
| `title` | String | REQUIRED | Section title |
| `description` | String? | NULLABLE | Section description |
| `category` | CurriculumCategory? | NULLABLE | Category enum |
| `sortOrder` | Int | DEFAULT: 0, INDEXED | Display order |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `curriculum` ← Curriculum (many:1)
- `items` → CurriculumItem[] (1:many)

**Cascade:** DELETE Curriculum → DELETE Sections

**Notes:**
- Organizes curriculum into logical sections
- `sortOrder` controls display sequence
- Categories: CHORDS, SCALES, THEORY, etc. (see Enums)

---

### `CurriculumItem`
**Purpose:** Individual learning items within a section

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Item identifier |
| `sectionId` | String | FK → CurriculumSection.id, INDEXED | Parent section |
| `title` | String | REQUIRED | Item title (e.g., "G Major Chord") |
| `description` | String? | NULLABLE | Item description |
| `difficulty` | Int? | NULLABLE | Difficulty level (1-5) |
| `estimatedMinutes` | Int? | NULLABLE | Estimated practice time |
| `resourceUrl` | String? | NULLABLE | External resource link |
| `notes` | String? | NULLABLE | Additional notes |
| `sortOrder` | Int | DEFAULT: 0, INDEXED | Display order |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `section` ← CurriculumSection (many:1)
- `progress` → StudentItemProgress[] (1:many)

**Cascade:** DELETE CurriculumSection → DELETE Items

---

### `StudentCurriculumProgress`
**Purpose:** Tracks student's progress through a curriculum

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Progress identifier |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `curriculumId` | String | FK → Curriculum.id, INDEXED | Curriculum |
| `startedAt` | DateTime | DEFAULT: now() | Start timestamp |
| `completedAt` | DateTime? | NULLABLE | Completion timestamp |
| `totalItems` | Int | DEFAULT: 0 | Total items in curriculum |
| `completedItems` | Int | DEFAULT: 0 | Items completed |
| `progressPercent` | Float | DEFAULT: 0 | Completion percentage (0-100) |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `student` ← StudentProfile (many:1)
- `curriculum` ← Curriculum (many:1)
- `itemProgress` → StudentItemProgress[] (1:many)

**Unique Constraint:** `[studentId, curriculumId]` - One progress per curriculum per student

**Cascade:** DELETE Student/Curriculum → DELETE Progress

**Notes:**
- Auto-calculates progress percentage
- `completedAt` set when 100% complete

---

### `StudentItemProgress`
**Purpose:** Individual item progress tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Progress identifier |
| `curriculumProgressId` | String | FK → StudentCurriculumProgress.id, INDEXED | Parent progress |
| `itemId` | String | FK → CurriculumItem.id, INDEXED | Curriculum item |
| `status` | ProgressStatus | DEFAULT: NOT_STARTED, INDEXED | Status enum |
| `startedAt` | DateTime? | NULLABLE | Start timestamp |
| `completedAt` | DateTime? | NULLABLE | Completion timestamp |
| `teacherNotes` | String? | NULLABLE | Teacher feedback |
| `studentNotes` | String? | NULLABLE | Student notes |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `curriculumProgress` ← StudentCurriculumProgress (many:1)
- `item` ← CurriculumItem (many:1)

**Unique Constraint:** `[curriculumProgressId, itemId]`

**Cascade:** DELETE StudentCurriculumProgress → DELETE ItemProgress
**Cascade:** DELETE CurriculumItem → DELETE ItemProgress

**Notes:**
- Status: NOT_STARTED → IN_PROGRESS → COMPLETED or NEEDS_REVIEW
- Both teacher and student can add notes

---

### `StudentChecklist`
**Purpose:** Practice to-do lists for students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Checklist identifier |
| `studentId` | String | FK → StudentProfile.id, INDEXED | Student |
| `title` | String | REQUIRED | Checklist title (e.g., "Week of Mar 10") |
| `isActive` | Boolean | DEFAULT: true, INDEXED | Active status |
| `isArchived` | Boolean | DEFAULT: false | Archived status |
| `createdBy` | String? | NULLABLE, FK → User.id, INDEXED | Creator user ID |
| `createdByRole` | String? | NULLABLE | Creator role (TEACHER or STUDENT) |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `student` ← StudentProfile (many:1)
- `creator` ← User (many:1, NULLABLE)
- `items` → StudentChecklistItem[] (1:many)

**Cascade:** DELETE StudentProfile → DELETE Checklists

**Notes:**
- Teachers or students can create checklists
- Email sent when 100% items completed
- Can be archived when no longer relevant

---

### `StudentChecklistItem`
**Purpose:** Individual checklist to-do items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Item identifier |
| `checklistId` | String | FK → StudentChecklist.id, INDEXED | Parent checklist |
| `title` | String | REQUIRED | Item title (e.g., "Practice G-C-D transitions") |
| `description` | String? | NULLABLE | Item description |
| `isCompleted` | Boolean | DEFAULT: false, INDEXED | Completion status |
| `completedAt` | DateTime? | NULLABLE | Completion timestamp |
| `dueDate` | DateTime? | NULLABLE | Due date |
| `notes` | String? | NULLABLE | Additional notes |
| `resourceUrl` | String? | NULLABLE | Resource link |
| `estimatedMinutes` | Int? | NULLABLE | Estimated practice time |
| `sortOrder` | Int | DEFAULT: 0 | Display order |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `checklist` ← StudentChecklist (many:1)

**Composite Index:** `[checklistId, sortOrder]`

**Cascade:** DELETE StudentChecklist → DELETE Items

---

### `LibraryItem`
**Purpose:** Teacher's file library (PDFs, tabs, sheet music, etc.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Item identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Uploading teacher |
| `title` | String | REQUIRED | Item title |
| `description` | String? | NULLABLE | Item description |
| `fileUrl` | String | REQUIRED | Vercel Blob storage URL |
| `fileName` | String | REQUIRED | Stored filename |
| `fileSize` | Int | REQUIRED | File size in bytes |
| `category` | LibraryCategory? | DEFAULT: TABLATURE, INDEXED | Category enum |
| `instrument` | Instrument | DEFAULT: GUITAR, INDEXED | Instrument |
| `isPublic` | Boolean | DEFAULT: false, INDEXED | Public/private flag |
| `tags` | String? | NULLABLE | Search tags (comma-separated) |
| `downloadCount` | Int | DEFAULT: 0 | Download counter |
| `createdAt` | DateTime | DEFAULT: now() | Upload timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)

**Cascade:** DELETE TeacherProfile → DELETE LibraryItems

**Notes:**
- Files stored in Vercel Blob (not database)
- Categories: TABLATURE, SHEET_MUSIC, CHORD_CHARTS, SCALES, etc.
- `isPublic` controls visibility to students

---

### `Recommendation`
**Purpose:** Teacher recommendations for gear, books, courses, etc.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Recommendation identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Recommending teacher |
| `title` | String | REQUIRED | Item title |
| `description` | String | REQUIRED | Item description |
| `link` | String? | NULLABLE | Purchase/info URL |
| `category` | RecommendationCategory | REQUIRED, INDEXED | Category enum |
| `price` | String? | NULLABLE | Price as string (e.g., "$699") |
| `priority` | Int | DEFAULT: 1 | Priority/rating (1-5 stars) |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)

**Cascade:** DELETE TeacherProfile → DELETE Recommendations

**Notes:**
- Categories: GEAR, BOOKS, SOFTWARE, ONLINE_COURSES, APPS, OTHER
- Priority 1-5 displayed as star rating
- Students see their teacher's recommendations

---

## System & Configuration

### `SystemSettings`
**Purpose:** Global platform configuration (singleton)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, DEFAULT: "system" | Always "system" (singleton) |
| `platformFeePercentage` | Float | DEFAULT: 10.0 | Platform fee % (unused) |
| `maxFileSize` | Int | DEFAULT: 10485760 | Max upload size (10MB) |
| `allowedFileTypes` | String | DEFAULT: "pdf,doc,docx,jpg,png" | Allowed file extensions |
| `paymentsEnabled` | Boolean | DEFAULT: true | Enable payment features |
| `libraryEnabled` | Boolean | DEFAULT: true | Enable library feature |
| `recommendationsEnabled` | Boolean | DEFAULT: true | Enable recommendations |
| `cancellationPolicyText` | String | DEFAULT: "Please cancel..." | Cancellation policy |
| `defaultAdvanceBookingDays` | Int | DEFAULT: 14 | Default booking advance days |
| `defaultInvoiceDueDays` | Int | DEFAULT: 14 | Default invoice due days |
| `defaultLessonDuration30` | Boolean | DEFAULT: true | Enable 30-min by default |
| `defaultLessonDuration60` | Boolean | DEFAULT: true | Enable 60-min by default |
| `emailFooterText` | String | DEFAULT: "Thank you..." | Email footer text |
| `emailSenderAddress` | String | DEFAULT: "onboarding@resend.dev" | From email address |
| `emailSenderName` | String | DEFAULT: "Guitar Strategies" | From name |
| `enableBookingConfirmations` | Boolean | DEFAULT: true | Send booking emails |
| `enableInvoiceNotifications` | Boolean | DEFAULT: true | Send invoice emails |
| `enableReminderEmails` | Boolean | DEFAULT: true | Send reminder emails |
| `invoiceNumberFormat` | String | DEFAULT: "INV-{YEAR}-{NUMBER}" | Invoice number template |
| `latePaymentReminderDays` | Int | DEFAULT: 7 | Days before sending overdue reminder |
| `updatedAt` | DateTime | AUTO | Last update |

**Notes:**
- Only ONE record exists (singleton pattern)
- ID is always "system"
- Accessed via `getSystemSettings()` helper

---

### `EmailPreference`
**Purpose:** User-specific email notification preferences

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Preference identifier |
| `userId` | String | FK → User.id, INDEXED | User |
| `type` | EmailType | REQUIRED | Email type enum |
| `enabled` | Boolean | DEFAULT: true | Enabled status |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Relationships:**
- `user` ← User (many:1)

**Unique Constraint:** `[userId, type]` - One preference per type per user

**Cascade:** DELETE User → DELETE Preferences

**Notes:**
- Users can disable specific email types
- Email types: LESSON_BOOKING, INVOICE_GENERATED, LESSON_REMINDER, etc.

---

### `EmailTemplate`
**Purpose:** Customizable email templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Template identifier |
| `type` | EmailType | UNIQUE, INDEXED | Email type enum |
| `subject` | String | REQUIRED | Email subject line |
| `htmlBody` | String | REQUIRED | HTML email body |
| `variables` | String | REQUIRED | Available variables (JSON) |
| `description` | String? | NULLABLE | Template description |
| `isActive` | Boolean | DEFAULT: true, INDEXED | Active status |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |
| `updatedAt` | DateTime | AUTO | Last update |

**Notes:**
- One template per email type
- Variables example: `["studentName", "lessonDate", "teacherName"]`
- HTML body uses variable substitution

---

### `BackgroundJobLog`
**Purpose:** Audit log for background job executions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Log identifier |
| `jobName` | String | REQUIRED, INDEXED | Job name (e.g., "generate-future-lessons") |
| `executedAt` | DateTime | DEFAULT: now(), INDEXED | Execution timestamp |
| `success` | Boolean | REQUIRED | Success status |
| `lessonsGenerated` | Int | DEFAULT: 0 | Number of lessons created |
| `teachersProcessed` | Int | DEFAULT: 0 | Number of teachers processed |
| `errors` | String? | NULLABLE | Error messages (if any) |

**Composite Index:** `[jobName, executedAt]`

**Notes:**
- Logs lesson generation cron jobs
- Keeps last 30 days (auto-cleanup)
- Viewable in admin dashboard

---

### `StudentInvitation`
**Purpose:** Student invitation tokens for registration

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Invitation identifier |
| `teacherId` | String | FK → TeacherProfile.id, INDEXED | Inviting teacher |
| `studentId` | String | UNIQUE, FK → StudentProfile.id | Student account |
| `token` | String | UNIQUE, INDEXED | Invitation token |
| `expires` | DateTime | REQUIRED | Token expiration |
| `createdAt` | DateTime | DEFAULT: now() | Creation timestamp |

**Relationships:**
- `teacher` ← TeacherProfile (many:1)
- `student` ← StudentProfile (1:1)

**Cascade:** DELETE TeacherProfile → DELETE Invitations
**Cascade:** DELETE StudentProfile → DELETE Invitation

**Notes:**
- Teachers create invitations for students to register
- Token expires after set period
- One invitation per student

---

## Enums Reference

### `Role`
User roles in the system
```
STUDENT   - Student user
TEACHER   - Teacher user
ADMIN     - Administrator user
```

---

### `LessonStatus`
Lesson lifecycle status
```
SCHEDULED - Lesson scheduled (future)
COMPLETED - Lesson completed
CANCELLED - Lesson cancelled by teacher/student
MISSED    - Student didn't attend
NO_SHOW   - Student no-show without notice
```

---

### `InvoiceStatus`
Invoice payment status
```
PENDING   - Invoice created, not sent
SENT      - Invoice sent to student
VIEWED    - Student viewed invoice
PAID      - Payment received
OVERDUE   - Past due date
CANCELLED - Invoice cancelled
```

---

### `SlotStatus`
Recurring slot status
```
ACTIVE    - Generating lessons
CANCELLED - Stopped, no new lessons
SUSPENDED - Temporarily paused
EXPIRED   - Past end date
```

---

### `SubscriptionStatus`
Subscription billing status
```
ACTIVE    - Active subscription
PAUSED    - Temporarily paused
CANCELLED - Cancelled by user
EXPIRED   - Past end date
```

---

### `BillingStatus`
Monthly billing status
```
PENDING   - Not yet billed
BILLED    - Invoice generated
PAID      - Payment received
OVERDUE   - Past due
CANCELLED - Billing cancelled
```

---

### `ProgressStatus`
Learning progress status
```
NOT_STARTED  - Item not started
IN_PROGRESS  - Currently working on
COMPLETED    - Item completed
NEEDS_REVIEW - Needs teacher review
```

---

### `LibraryCategory`
Library file categories
```
TABLATURE    - Guitar tabs
SHEET_MUSIC  - Sheet music
CHORD_CHARTS - Chord diagrams
SCALES       - Scale patterns
ETUDES       - Musical studies
EXERCISES    - Practice exercises
THEORY       - Music theory
OTHER        - Uncategorized
```

---

### `RecommendationCategory`
Recommendation types
```
GEAR           - Instruments, amps, pedals
BOOKS          - Educational books
SOFTWARE       - DAWs, notation software
ONLINE_COURSES - Online learning
APPS           - Mobile apps (tuners, metronomes)
OTHER          - Miscellaneous
```

---

### `CurriculumCategory`
Curriculum section categories
```
CHORDS          - Chord study
SCALES          - Scale study
ARPEGGIOS       - Arpeggio study
THEORY          - Music theory
RHYTHM          - Rhythm study
LEAD_GUITAR     - Lead guitar techniques
FINGERSTYLE     - Fingerstyle techniques
SONGS           - Song learning
RIFFS           - Riff study
SOLOS           - Solo study
TECHNIQUE       - Technical exercises
SIGHT_READING   - Reading music
EAR_TRAINING    - Ear training
IMPROVISATION   - Improvisation
OTHER           - Uncategorized
```

---

### `Instrument`
Supported instruments
```
GUITAR  - Guitar
BASS    - Bass guitar
UKULELE - Ukulele
```

---

### `LinkType`
External link types
```
WEBSITE - General website
YOUTUBE - YouTube video
VIMEO   - Vimeo video
SPOTIFY - Spotify track/playlist
OTHER   - Other link type
```

---

### `EmailType`
Email notification types
```
LESSON_BOOKING            - Single lesson booked
LESSON_BOOKING_RECURRING  - Recurring lessons booked
LESSON_CANCELLATION       - Lesson cancelled
LESSON_REMINDER           - Lesson reminder (24h before)
LESSON_COMPLETED          - Lesson marked complete
INVOICE_GENERATED         - New invoice created
INVOICE_OVERDUE           - Invoice past due
CHECKLIST_COMPLETION      - Checklist 100% complete
STUDENT_WELCOME           - Student welcome email
STUDENT_INVITATION        - Student invitation
SYSTEM_UPDATES            - System announcements
```

---

## Relationship Diagrams

### Authentication Flow
```
User (email, password, role)
  ├─ role = TEACHER → TeacherProfile (1:1)
  │                      └─ students → StudentProfile[] (1:many)
  │
  └─ role = STUDENT → StudentProfile (1:1)
                         └─ teacher ← TeacherProfile (many:1)
```

---

### Teaching Core
```
TeacherProfile
  ├─ availability → TeacherAvailability[] (weekly schedule)
  ├─ lessonSettings → TeacherLessonSettings (pricing)
  │
  ├─ students → StudentProfile[]
  │                 └─ lessons ← Lesson[]
  │
  └─ recurringSlots → RecurringSlot[]
                         └─ lessons → Lesson[] (auto-generated)
```

---

### Billing Flow
```
RecurringSlot (weekly time)
  ├─ lessons → Lesson[] (generated 12 weeks ahead)
  │               └─ invoiceItems → InvoiceItem[]
  │
  ├─ subscriptions → SlotSubscription[]
  │                     └─ billingRecords → MonthlyBilling[]
  │
  └─ teacher → TeacherProfile
                 └─ invoices → Invoice[]
                                  └─ items → InvoiceItem[]
```

---

### Learning Path
```
Curriculum
  └─ sections → CurriculumSection[]
                   └─ items → CurriculumItem[]
                                 └─ progress → StudentItemProgress[]
                                                  └─ curriculumProgress ← StudentCurriculumProgress
                                                                            └─ student ← StudentProfile
```

---

## Data Storage Notes

### Money Values
All monetary amounts stored as **integers in cents**:
- `hourlyRate`: 6000 = $60.00
- `price`: 3000 = $30.00
- `total`: 12000 = $120.00

**Rationale:** Avoid floating-point precision errors

---

### Rich Text Content
Rich text stored as **Tiptap HTML**:
- `Lesson.notes`
- `Lesson.homework`
- `Lesson.progress`
- `Lesson.nextSteps`

**Max Length:** 5000 characters (includes HTML markup)

---

### Time Representation
Times stored as **strings in HH:MM format**:
- `TeacherAvailability.startTime`: "09:00"
- `TeacherAvailability.endTime`: "17:00"
- `RecurringSlot.startTime`: "14:30"

**Timezone:** Stored separately in `timezone` field (default: "America/Chicago")

---

### Days of Week
Stored as **integers 0-6**:
```
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

---

### File Storage
Files stored in **Vercel Blob**, database contains:
- `fileUrl`: Full Blob URL
- `fileName`: Stored filename
- `fileSize`: Size in bytes
- `mimeType`: MIME type

**Max Size:** 10MB (configurable in SystemSettings)

---

### Cascade Delete Chains

**Delete User:**
```
User (DELETE)
  ├─→ TeacherProfile (CASCADE)
  │     ├─→ Students (CASCADE)
  │     ├─→ Lessons (CASCADE)
  │     ├─→ Invoices (CASCADE)
  │     ├─→ Library Items (CASCADE)
  │     └─→ ... (all teacher content)
  │
  └─→ StudentProfile (CASCADE)
        ├─→ Lessons (CASCADE)
        ├─→ Progress (CASCADE)
        ├─→ Checklists (CASCADE)
        └─→ ... (all student data)
```

**Delete Teacher:**
```
TeacherProfile (DELETE)
  ├─→ StudentProfiles (CASCADE)
  │     └─→ All student lessons, progress, etc.
  │
  ├─→ RecurringSlots (CASCADE)
  │     └─→ Generated Lessons (CASCADE)
  │
  ├─→ Invoices (CASCADE)
  │     └─→ InvoiceItems (CASCADE)
  │
  └─→ All teacher-created content (CASCADE)
```

---

## Performance Indexes

### High-Traffic Query Patterns

**Teacher's students:**
```sql
WHERE teacherId = ? AND isActive = true
INDEX: [teacherId], [isActive]
```

**Student's lessons by date:**
```sql
WHERE studentId = ? AND date >= ? AND date <= ?
INDEX: [studentId, date]
```

**Pending invoices:**
```sql
WHERE teacherId = ? AND status = 'PENDING'
INDEX: [teacherId, month], [status]
```

**Active recurring slots:**
```sql
WHERE teacherId = ? AND status = 'ACTIVE'
INDEX: [teacherId, status]
```

**Curriculum progress:**
```sql
WHERE studentId = ? AND curriculumId = ?
INDEX: [studentId, curriculumId]
UNIQUE: [studentId, curriculumId]
```

---

## Security Considerations

### Password Storage
- Passwords hashed with **bcrypt** (10 rounds)
- Stored in `User.password`
- Reset tokens also bcrypt hashed

### Sensitive Data
- Payment info (Venmo/PayPal/Zelle) on TeacherProfile
- Parent emails on StudentProfile
- Emergency contacts on StudentProfile

### Ownership Constraints
- Students **must** belong to a teacher (`teacherId` required)
- Teachers can only access their own students
- CASCADE deletes enforce data integrity

### Session Management
- **JWT strategy** (stateless)
- Sessions stored in HTTP-only cookies
- 7-day expiry, 24-hour refresh
- **No revocation mechanism** (security gap)

---

## Migration History

Key schema changes:
- **Add Curriculum System** - Jan 2025
- **Add Recurring Slots** - Aug 2024
- **Add Password Reset Tokens** - Jan 2026
- **Add Optimistic Locking** - Version fields added
- **Add Email Preferences** - Granular notification control

---

## Database Connection

**Provider:** PostgreSQL
**Connection:** `DATABASE_URL` environment variable
**Pool:** Prisma connection pooling (default settings)
**Migrations:** Stored in `prisma/migrations/`

---

*This reference document is auto-generated from `prisma/schema.prisma`. For the authoritative schema, always refer to the Prisma schema file.*

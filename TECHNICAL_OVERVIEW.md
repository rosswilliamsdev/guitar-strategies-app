# Guitar Strategies - Technical Deep Dive

A comprehensive technical guide for discussing the architecture, implementation, and design decisions of the Guitar Strategies lesson management platform with other software engineers.

---

## Executive Summary

Full-stack Next.js 15 application with App Router, PostgreSQL + Prisma ORM, NextAuth.js authentication, and a custom internal scheduling system. Built with TypeScript, TailwindCSS, shadcn/ui, and structured logging. Handles multi-role authentication, real-time availability management, recurring lesson generation, and timezone-aware booking logic.

**Tech Highlights:**
- Next.js 15.4.6 App Router with Server Components
- PostgreSQL + Prisma ORM 6.13.0
- NextAuth.js v4 (not v5) with Prisma Adapter
- Tiptap rich text editor for lesson notes
- Winston structured logging with domain-specific loggers
- Vercel Blob for file storage (future)
- Resend for transactional emails

---

## Architecture Overview

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Server Components│  │ Client Comps │  │ API Routes     │ │
│  │ (Default)        │  │ ('use client')│  │ /api/*         │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼─────┐ ┌────▼────┐ ┌─────▼──────┐
         │ NextAuth.js│ │ Prisma  │ │   Winston  │
         │    Auth    │ │   ORM   │ │  Logging   │
         └────────────┘ └────┬────┘ └────────────┘
                             │
                     ┌───────▼────────┐
                     │   PostgreSQL   │
                     │    Database    │
                     └────────────────┘
```

### Directory Structure

```
guitar-strategies-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (login, register, error)
│   ├── (dashboard)/              # Protected routes with layout
│   │   ├── dashboard/            # Role-based dashboards
│   │   ├── students/             # Student management (teacher-only)
│   │   ├── lessons/              # Lesson CRUD
│   │   ├── library/              # File library (teacher-only)
│   │   ├── recommendations/      # Recommendations system
│   │   ├── invoices/             # Invoice generation & tracking
│   │   ├── settings/             # User settings
│   │   └── book-lesson/          # Booking interface
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   ├── lessons/              # Lesson CRUD endpoints
│   │   ├── students/             # Student CRUD endpoints
│   │   ├── library/              # Library file management
│   │   ├── recommendations/      # Recommendations CRUD
│   │   ├── invoices/             # Invoice generation
│   │   ├── settings/             # Settings update endpoints
│   │   └── availability/         # Availability slot generation
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui primitives (Radix-based)
│   ├── auth/                     # Login/register forms
│   ├── dashboard/                # Dashboard components
│   ├── lessons/                  # Lesson forms & displays
│   ├── library/                  # File upload & browsing
│   ├── recommendations/          # Recommendations UI
│   └── settings/                 # Settings forms
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Prisma client singleton
│   ├── logger.ts                 # Winston structured logging
│   ├── email.ts                  # Resend email service
│   ├── validations.ts            # Zod schemas
│   └── utils.ts                  # Utility functions (cn helper)
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Test data seeding
├── types/
│   └── index.ts                  # TypeScript type definitions
├── middleware.ts                 # Route protection middleware
└── tailwind.config.js            # Design system config
```

---

## Core Technologies & Design Decisions

### 1. Next.js 15 App Router

**Why App Router over Pages Router?**
- Server Components by default → better performance, smaller client bundles
- Native support for streaming SSR and React Server Components
- Simplified data fetching with async/await in components
- Built-in route groups for layout organization

**Key Patterns:**
```typescript
// Server Component (default)
export default async function LessonsPage() {
  const session = await getServerSession(authOptions);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: session.user.teacherProfile.id }
  });
  return <LessonsList lessons={lessons} />;
}

// Client Component (when needed)
'use client';
export function LessonForm() {
  const [notes, setNotes] = useState('');
  // ... interactive logic
}
```

**Server vs Client Component Decision Tree:**
- Need interactivity (useState, useEffect)? → Client Component
- Just rendering data from DB? → Server Component (default)
- Forms with validation? → Client Component
- Static UI with no state? → Server Component

### 2. Authentication: NextAuth.js v4

**Why NextAuth.js v4 (not v5)?**
- Stable, production-ready (v5 still in beta during development)
- Excellent Prisma Adapter for database sessions
- Built-in CSRF protection and secure session handling
- Customizable callbacks for role-based access

**Session Structure:**
```typescript
// Augmented session type (types/next-auth.d.ts)
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    teacherProfile?: TeacherProfile;
    studentProfile?: StudentProfile;
  }
}

// Usage in Server Components
const session = await getServerSession(authOptions);

// Usage in Client Components
const { data: session } = useSession();
```

**Key Configuration (lib/auth.ts):**
- Credentials provider with bcrypt password hashing
- Custom JWT callbacks to include role + profile data
- Prisma Adapter for database session persistence
- Custom pages: `/login`, `/register`, `/error`

**Route Protection (middleware.ts):**
```typescript
// Protect routes by role
if (pathname.startsWith('/students') && role !== 'TEACHER') {
  return NextResponse.redirect('/dashboard');
}
```

### 3. Database: PostgreSQL + Prisma ORM

**Why Prisma?**
- Type-safe database client with auto-generated types
- Excellent migration tooling with `prisma migrate`
- Built-in relation handling with eager loading
- Clean, declarative schema syntax

**Schema Highlights:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String
  role          Role      @default(STUDENT)
  teacherProfile TeacherProfile?
  studentProfile StudentProfile?

  @@index([email])
  @@index([role])
}

model Lesson {
  id          String    @id @default(cuid())
  teacherId   String
  studentId   String
  date        DateTime  @default(now())
  duration    Int       @default(30)
  notes       String?   @db.Text
  status      LessonStatus @default(COMPLETED)

  teacher     TeacherProfile @relation(...)
  student     StudentProfile @relation(...)

  @@index([teacherId, date])
  @@index([studentId, date])
}
```

**Key Design Decisions:**
- `cuid()` for IDs (collision-resistant, URL-safe)
- Indexes on frequently queried columns (email, teacherId + date)
- Cascading deletes for data integrity
- `@db.Text` for long-form content (lesson notes, bio)
- DateTime stored in UTC, converted in application layer

**Common Query Patterns:**
```typescript
// Eager loading with relations
const lessons = await prisma.lesson.findMany({
  where: { teacherId },
  include: {
    student: { include: { user: true } }
  },
  orderBy: { date: 'desc' }
});

// Transaction for data integrity
await prisma.$transaction([
  prisma.lesson.create({ data: lessonData }),
  prisma.invoice.update({ where: { id }, data: { total: newTotal } })
]);
```

### 4. Styling: TailwindCSS + shadcn/ui

**Why This Stack?**
- TailwindCSS: Utility-first CSS with excellent DX and small bundle sizes
- shadcn/ui: Unstyled Radix UI primitives with accessible components
- No runtime JS for styling (unlike CSS-in-JS)
- Full design system control (copy components into codebase)

**Design System (tailwind.config.js):**
```javascript
// OpenAI-inspired neutral palette + turquoise accents
colors: {
  neutral: { /* 50-950 shades */ },
  turquoise: { /* 50-900 shades */ },
  primary: '#14b8b3',      // turquoise-500
  accent: '#73eedc',       // original turquoise
  background: '#fafafa',   // neutral-50
  foreground: '#0a0a0a',   // neutral-950
}

// Typography
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['Menlo', 'Monaco', 'Courier New', 'monospace']
}
```

**shadcn/ui Component Pattern:**
```typescript
// Button component (components/ui/button.tsx)
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-turquoise-600",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      }
    }
  }
);
```

**Key Utilities:**
```typescript
// cn helper (lib/utils.ts)
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage: Merge conflicting Tailwind classes intelligently
<div className={cn("px-4 py-2", props.className)} />
```

### 5. Logging: Winston Structured Logging

**Why Winston?**
- Production-grade logging with multiple transports
- Structured logging with JSON output for log aggregation
- Domain-specific loggers for better organization
- File rotation and error separation

**Architecture (lib/logger.ts):**
```typescript
// Base logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Domain-specific loggers
export const apiLog = logger.child({ domain: 'api' });
export const dbLog = logger.child({ domain: 'database' });
export const emailLog = logger.child({ domain: 'email' });
export const schedulerLog = logger.child({ domain: 'scheduler' });
export const invoiceLog = logger.child({ domain: 'invoice' });
export const authLog = logger.child({ domain: 'auth' });
```

**Usage Pattern:**
```typescript
// Structured logging with context
apiLog.info('Lesson booking completed', {
  studentId: student.id,
  teacherId: teacher.id,
  lessonDate: lesson.date.toISOString(),
  duration: lesson.duration,
  bookingType: 'recurring'
});

// Error logging with stack traces
dbLog.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: 'SELECT * FROM lessons WHERE teacherId = ?',
  params: { teacherId }
});
```

**Log Levels:**
- `error`: Exceptions, critical failures
- `warn`: Recoverable errors, deprecations
- `info`: Business events, API requests
- `http`: HTTP request/response details
- `debug`: Detailed debugging (dev only)

---

## Complex Features: Technical Deep Dive

### 1. Internal Scheduling System

**Problem:** Teachers need flexible availability management with recurring bookings, timezone support, and conflict detection.

**Solution:** Custom scheduling system with:
- Weekly availability templates
- Real-time slot generation algorithm
- Recurring lesson support (2-52 weeks)
- Timezone-aware datetime handling

#### Availability Schema

```prisma
model TeacherAvailability {
  id          String   @id @default(cuid())
  teacherId   String
  dayOfWeek   Int      // 0-6 (Sunday-Saturday)
  startTime   String   // "HH:MM" format (e.g., "14:00")
  endTime     String   // "HH:MM" format (e.g., "18:00")
  isActive    Boolean  @default(true)

  teacher     TeacherProfile @relation(...)

  @@index([teacherId, dayOfWeek])
}

model TeacherLessonSettings {
  id                  String   @id @default(cuid())
  teacherId           String   @unique
  allow30Min          Boolean  @default(true)
  allow60Min          Boolean  @default(true)
  price30Min          Int?     // cents
  price60Min          Int?     // cents
  advanceBookingDays  Int      @default(30)

  teacher             TeacherProfile @relation(...)
}

model RecurringSlot {
  id          String   @id @default(cuid())
  teacherId   String
  studentId   String
  dayOfWeek   Int      // 0-6
  startTime   String   // "HH:MM"
  duration    Int      // 30 or 60 minutes
  status      String   @default("ACTIVE")

  teacher     TeacherProfile @relation(...)
  student     StudentProfile @relation(...)

  @@index([teacherId, dayOfWeek])
  @@index([studentId])
}
```

#### Slot Generation Algorithm

```typescript
// /api/availability/slots - Generate available time slots
async function generateAvailableSlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  timezone: string
): Promise<TimeSlot[]> {
  // 1. Fetch teacher availability template
  const availability = await prisma.teacherAvailability.findMany({
    where: { teacherId, isActive: true }
  });

  // 2. Fetch existing lessons (blocked slots)
  const existingLessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      date: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' }
    }
  });

  // 3. Fetch recurring slots (also blocked)
  const recurringSlots = await prisma.recurringSlot.findMany({
    where: { teacherId, status: 'ACTIVE' }
  });

  // 4. Generate 30-minute slots for each day in range
  const slots: TimeSlot[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.filter(a => a.dayOfWeek === dayOfWeek);

    for (const avail of dayAvailability) {
      let currentTime = parseTime(avail.startTime);
      const endTime = parseTime(avail.endTime);

      // Generate 30-min slots within availability window
      while (currentTime < endTime) {
        const slotStart = setTime(date, currentTime);
        const slotEnd = addMinutes(slotStart, 30);

        // Check if slot conflicts with existing lessons or recurring slots
        const isBooked = existingLessons.some(lesson =>
          lesson.date >= slotStart && lesson.date < slotEnd
        ) || recurringSlots.some(slot =>
          slot.dayOfWeek === dayOfWeek &&
          parseTime(slot.startTime) <= currentTime &&
          parseTime(slot.startTime) + slot.duration > currentTime
        );

        if (!isBooked) {
          slots.push({
            start: convertToTimezone(slotStart, timezone),
            end: convertToTimezone(slotEnd, timezone),
            available: true
          });
        }

        currentTime = addMinutes(currentTime, 30);
      }
    }
  }

  return slots;
}
```

#### Recurring Lesson Generation

**Challenge:** Generate recurring lessons immediately at booking (not on-demand) to prevent double-bookings and ensure data integrity.

**Implementation:**
```typescript
// /api/lessons/book - Booking endpoint
async function createRecurringLessons(
  teacherId: string,
  studentId: string,
  firstLessonDate: Date,
  duration: 30 | 60,
  numWeeks: number
) {
  const lessons = [];

  // Generate all lessons upfront
  for (let week = 0; week < numWeeks; week++) {
    const lessonDate = addWeeks(firstLessonDate, week);

    // Check for conflicts before creating
    const conflict = await prisma.lesson.findFirst({
      where: {
        teacherId,
        date: lessonDate,
        status: { not: 'CANCELLED' }
      }
    });

    if (conflict) {
      throw new Error(`Conflict detected on ${lessonDate.toISOString()}`);
    }

    lessons.push({
      teacherId,
      studentId,
      date: lessonDate,
      duration,
      status: 'SCHEDULED'
    });
  }

  // Create all lessons in a transaction
  return await prisma.$transaction(
    lessons.map(lesson => prisma.lesson.create({ data: lesson }))
  );
}
```

#### Timezone Handling

**Strategy:** Store all datetimes in UTC, convert to user timezone in application layer.

```typescript
// lib/timezone.ts
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

// Convert user input (in their timezone) to UTC for storage
export function userTimeToUTC(dateTime: Date, timezone: string): Date {
  return zonedTimeToUtc(dateTime, timezone);
}

// Convert stored UTC datetime to user's timezone for display
export function utcToUserTime(utcDateTime: Date, timezone: string): Date {
  return utcToZonedTime(utcDateTime, timezone);
}

// Display with timezone abbreviation
export function formatWithTimezone(utcDateTime: Date, timezone: string): string {
  return format(utcToZonedTime(utcDateTime, timezone), 'MMM d, yyyy h:mm a zzz', { timeZone: timezone });
}

// Usage in booking flow
const userSelectedTime = new Date('2025-09-15T14:00:00'); // User's local time
const utcTime = userTimeToUTC(userSelectedTime, session.user.teacherProfile.timezone);
await prisma.lesson.create({ data: { date: utcTime, ... } });

// Usage in display
const lesson = await prisma.lesson.findUnique({ where: { id } });
const displayTime = formatWithTimezone(lesson.date, session.user.teacherProfile.timezone);
// Output: "Sep 15, 2025 2:00 PM CDT"
```

### 2. Rich Text Editor (Tiptap)

**Use Case:** Lesson notes with formatting (bold, italic, lists, blockquotes).

**Why Tiptap?**
- Built on ProseMirror (robust, extensible)
- React integration with hooks
- Modular extensions (only include what you need)
- Outputs clean HTML (no bloat)

**Implementation:**
```typescript
// components/lessons/RichTextEditor.tsx
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Lesson notes...' })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  return (
    <div className="border rounded-md">
      <div className="border-b p-2 flex gap-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          List
        </button>
      </div>
      <EditorContent editor={editor} className="prose p-4" />
    </div>
  );
}
```

**Storage:** HTML stored as `Text` in PostgreSQL (up to 5000 chars including markup).

**Sanitization:** Tiptap only allows configured extensions, preventing XSS attacks.

### 3. Invoice System

**Business Model:** Teachers collect payments directly (Venmo/PayPal/Zelle), app tracks invoices and payment status.

**Schema:**
```prisma
model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String   @unique  // "INV-2025-001"
  teacherId     String
  studentId     String
  month         String             // "2025-09"
  dueDate       DateTime
  status        InvoiceStatus      // PENDING, SENT, PAID, OVERDUE
  subtotal      Int                // cents
  total         Int                // cents
  paidAt        DateTime?
  paymentMethod String?            // "Venmo", "PayPal", etc.
  paymentNotes  String?

  teacher       TeacherProfile @relation(...)
  student       StudentProfile @relation(...)
  items         InvoiceItem[]

  @@index([teacherId, month])
  @@index([studentId, status])
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  description String   // "Guitar Lesson - Sep 15, 2025"
  quantity    Int      @default(1)
  rate        Int      // cents (teacher's hourly rate)
  amount      Int      // cents (quantity × rate)
  lessonDate  DateTime?
  lessonId    String?

  invoice     Invoice @relation(...)

  @@index([invoiceId])
}
```

**Generation Logic:**
```typescript
// /api/invoices/generate - Monthly invoice generation
async function generateMonthlyInvoice(teacherId: string, studentId: string, month: string) {
  // 1. Find all scheduled lessons for the month
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      studentId,
      date: {
        gte: new Date(`${month}-01`),
        lt: new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)
      },
      status: { not: 'CANCELLED' }
    }
  });

  // 2. Get teacher's pricing
  const settings = await prisma.teacherLessonSettings.findUnique({
    where: { teacherId }
  });

  // 3. Create invoice items
  const items = lessons.map(lesson => ({
    description: `Guitar Lesson - ${format(lesson.date, 'MMM d, yyyy')}`,
    quantity: 1,
    rate: lesson.duration === 30 ? settings.price30Min : settings.price60Min,
    amount: lesson.duration === 30 ? settings.price30Min : settings.price60Min,
    lessonDate: lesson.date,
    lessonId: lesson.id
  }));

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  // 4. Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await generateInvoiceNumber(teacherId),
      teacherId,
      studentId,
      month,
      dueDate: addDays(new Date(), 14), // 2 weeks
      status: 'PENDING',
      subtotal,
      total: subtotal,
      items: { create: items }
    },
    include: { items: true }
  });

  return invoice;
}
```

**Payment Method Display:**
```typescript
// Display teacher's payment methods on invoice
const teacher = await prisma.teacherProfile.findUnique({
  where: { id: teacherId },
  select: { venmoHandle, paypalEmail, zelleEmail }
});

// Render payment options
{teacher.venmoHandle && <p>Venmo: @{teacher.venmoHandle}</p>}
{teacher.paypalEmail && <p>PayPal: {teacher.paypalEmail}</p>}
{teacher.zelleEmail && <p>Zelle: {teacher.zelleEmail}</p>}
```

### 4. Email System (Resend)

**Architecture:**
```typescript
// lib/email.ts - Centralized email service
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'Guitar Strategies <onboarding@resend.dev>',
      to,
      subject,
      html
    });
    emailLog.info('Email sent successfully', { to, subject });
    return true;
  } catch (error) {
    emailLog.error('Email send failed', { to, subject, error: error.message });
    return false;
  }
}
```

**Template Pattern:**
```typescript
// lib/email-templates.ts
export function lessonCancellationEmail(lesson: Lesson, perspective: 'student' | 'teacher') {
  const recipient = perspective === 'student' ? lesson.teacher : lesson.student;
  const subject = `Lesson Cancelled - ${format(lesson.date, 'MMM d, yyyy')}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Inter, sans-serif; color: #0a0a0a; }
          .header { background: #14b8b3; color: white; padding: 20px; }
          .content { padding: 20px; }
          .button { background: #14b8b3; color: white; padding: 10px 20px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lesson Cancelled</h1>
        </div>
        <div class="content">
          <p>Your lesson on ${format(lesson.date, 'MMMM d, yyyy')} at ${format(lesson.date, 'h:mm a')} has been cancelled.</p>
          <p><strong>Duration:</strong> ${lesson.duration} minutes</p>
          <p><strong>${perspective === 'student' ? 'Teacher' : 'Student'}:</strong> ${recipient.user.name}</p>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}
```

**Usage in API Routes:**
```typescript
// /api/lessons/[id]/cancel
async function cancelLesson(lessonId: string) {
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: 'CANCELLED' },
    include: { teacher: { include: { user: true } }, student: { include: { user: true } } }
  });

  // Send emails to both parties
  const studentEmail = lessonCancellationEmail(lesson, 'student');
  const teacherEmail = lessonCancellationEmail(lesson, 'teacher');

  await Promise.all([
    sendEmail(lesson.student.user.email, studentEmail.subject, studentEmail.html),
    sendEmail(lesson.teacher.user.email, teacherEmail.subject, teacherEmail.html)
  ]);

  return lesson;
}
```

---

## Performance Optimizations

### 1. Server Components by Default

**Strategy:** Use Server Components unless interactivity is required.

**Benefits:**
- Zero JavaScript sent to client for static content
- Direct database queries without API routes
- Automatic code splitting per route

**Example:**
```typescript
// app/(dashboard)/lessons/page.tsx - Server Component
export default async function LessonsPage() {
  const session = await getServerSession(authOptions);

  // Direct database query (no API route needed)
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: session.user.teacherProfile.id },
    include: { student: { include: { user: true } } },
    orderBy: { date: 'desc' }
  });

  return <LessonsList lessons={lessons} />; // Client Component for interactivity
}
```

### 2. Database Query Optimization

**Indexes:**
```prisma
// Frequently queried columns
@@index([teacherId, date])  // Lessons by teacher + date range
@@index([studentId, date])  // Student lesson history
@@index([email])            // User login lookups
@@index([teacherId, dayOfWeek]) // Availability queries
```

**Eager Loading:**
```typescript
// Avoid N+1 queries with includes
const lessons = await prisma.lesson.findMany({
  include: {
    student: {
      include: { user: true } // Load student + user in single query
    }
  }
});
```

**Pagination (Future):**
```typescript
// Cursor-based pagination for large datasets
const lessons = await prisma.lesson.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastLessonId },
  orderBy: { date: 'desc' }
});
```

### 3. Caching Strategy (Future)

**React Cache:**
```typescript
import { cache } from 'react';

// Deduplicate requests within single render pass
export const getTeacherProfile = cache(async (userId: string) => {
  return await prisma.teacherProfile.findUnique({ where: { userId } });
});
```

**Next.js Route Cache:**
```typescript
// Static page with revalidation
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage() {
  const stats = await getTeacherStats();
  return <Dashboard stats={stats} />;
}
```

---

## Security Considerations

### 1. Authentication & Authorization

**Session Security:**
- NextAuth.js handles CSRF protection automatically
- Secure cookies with `httpOnly`, `sameSite`, `secure` flags
- Session expiration with automatic refresh

**Role-Based Access Control:**
```typescript
// middleware.ts - Route protection
export function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect('/login');
  }

  const { pathname } = request.nextUrl;

  // Teacher-only routes
  if (pathname.startsWith('/students') && token.role !== 'TEACHER') {
    return NextResponse.redirect('/dashboard');
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect('/dashboard');
  }

  return NextResponse.next();
}

// API route authorization
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... proceed with request
}
```

### 2. Input Validation

**Zod Schemas:**
```typescript
// lib/validations.ts
export const createLessonSchema = z.object({
  studentId: z.string().cuid(),
  date: z.string().datetime(),
  duration: z.number().int().min(30).max(120),
  notes: z.string().max(5000).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'])
});

// API route validation
export async function POST(request: Request) {
  const body = await request.json();
  const result = createLessonSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Proceed with validated data
  const lesson = await prisma.lesson.create({ data: result.data });
  return NextResponse.json(lesson);
}
```

### 3. SQL Injection Prevention

**Prisma Parameterization:**
Prisma automatically parameterizes all queries, preventing SQL injection:

```typescript
// Safe - Prisma handles parameterization
await prisma.user.findUnique({ where: { email: userInput } });

// Avoid raw queries, but if necessary:
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;
// Prisma still parameterizes tagged template literals
```

### 4. XSS Prevention

**Rich Text Sanitization:**
Tiptap only allows configured extensions, preventing arbitrary HTML injection:

```typescript
// Only these elements allowed
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // Only bold, italic, lists, blockquotes
      heading: false, // Disable headings
      codeBlock: false // Disable code blocks
    })
  ]
});
```

**Output Escaping:**
React automatically escapes JSX content, preventing XSS:

```typescript
// Safe - React escapes by default
<div>{lesson.notes}</div>

// Dangerous - Only use for trusted content
<div dangerouslySetInnerHTML={{ __html: lesson.notes }} />
```

### 5. CSRF Protection

**NextAuth.js Built-In:**
NextAuth automatically includes CSRF tokens in all state-changing requests (POST, PUT, DELETE).

**Manual Protection (if needed):**
```typescript
// middleware.ts - Custom CSRF check
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  if (request.method !== 'GET') {
    const csrfToken = request.headers.get('x-csrf-token');
    const expectedToken = await getToken({ req: request });

    if (csrfToken !== expectedToken?.csrfToken) {
      return new NextResponse('Invalid CSRF token', { status: 403 });
    }
  }

  return NextResponse.next();
}
```

---

## Testing Strategy (Future Implementation)

### Unit Tests

**Framework:** Jest + React Testing Library

```typescript
// __tests__/lib/timezone.test.ts
import { userTimeToUTC, utcToUserTime } from '@/lib/timezone';

describe('Timezone utilities', () => {
  test('converts user time to UTC correctly', () => {
    const userTime = new Date('2025-09-15T14:00:00');
    const utc = userTimeToUTC(userTime, 'America/Chicago');
    expect(utc.toISOString()).toBe('2025-09-15T19:00:00.000Z');
  });
});

// __tests__/components/LessonForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LessonForm } from '@/components/lessons/LessonForm';

describe('LessonForm', () => {
  test('validates required fields', async () => {
    render(<LessonForm />);
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('Student is required')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Framework:** Playwright

```typescript
// e2e/lesson-booking.spec.ts
import { test, expect } from '@playwright/test';

test('teacher can book a lesson', async ({ page }) => {
  // Login as teacher
  await page.goto('/login');
  await page.fill('input[name="email"]', 'teacher@guitarstrategies.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');

  // Navigate to booking page
  await page.goto('/book-lesson');

  // Select student
  await page.click('button[role="combobox"]');
  await page.click('text=John Student');

  // Select date and time
  await page.click('input[type="date"]');
  await page.fill('input[type="date"]', '2025-09-15');
  await page.click('button:has-text("2:00 PM")');

  // Submit booking
  await page.click('button:has-text("Book Lesson")');

  // Verify success
  await expect(page.locator('text=Lesson booked successfully')).toBeVisible();
});
```

### API Tests

**Framework:** Jest + Supertest

```typescript
// __tests__/api/lessons.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/lessons/route';

describe('/api/lessons', () => {
  test('POST creates a lesson', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        studentId: 'student123',
        date: '2025-09-15T14:00:00Z',
        duration: 30,
        status: 'SCHEDULED'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toMatchObject({
      studentId: 'student123',
      duration: 30
    });
  });
});
```

---

## Deployment & DevOps

### Development Environment

```bash
# Setup
npm install
npx prisma generate
npx prisma migrate dev
npm run seed

# Run dev server
npm run dev  # localhost:3000
```

### Production Build

```bash
# Build
npm run build

# Start production server
npm start
```

### Environment Variables

```bash
# .env (committed)
DATABASE_URL="postgresql://user@localhost:5432/guitar_strategies"
NEXTAUTH_URL="http://localhost:3000"

# .env.local (gitignored)
NEXTAUTH_SECRET="production-secret-key-here"
RESEND_API_KEY="re_xxxxxxxxxxxx"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxx"
```

### Deployment Platform: Vercel

**Why Vercel?**
- Native Next.js support (built by same team)
- Automatic deployments from GitHub
- Edge network with global CDN
- Built-in environment variable management
- Zero-config SSL

**Configuration:**
```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url",
    "RESEND_API_KEY": "@resend_api_key"
  }
}
```

### Database Hosting

**Options:**
- **Vercel Postgres**: Integrated with Vercel, serverless
- **Supabase**: Open-source, generous free tier
- **Railway**: Simple setup, pay-as-you-go
- **Neon**: Serverless Postgres with auto-scaling

**Migration Strategy:**
```bash
# In CI/CD pipeline
npx prisma migrate deploy  # Apply migrations without prompts
npx prisma generate        # Generate client
```

---

## Monitoring & Observability (Future)

### Logging

**Production Setup:**
- Winston file transport → `/var/log/guitar-strategies/`
- Log rotation: 5MB max, 10 files retained
- JSON format for log aggregation (Datadog, Loggly, etc.)

**Integration Example (Datadog):**
```typescript
// lib/logger.ts
import { transports } from 'winston';
import DatadogTransport from 'winston-datadog-logs';

if (process.env.NODE_ENV === 'production') {
  logger.add(new DatadogTransport({
    apiKey: process.env.DATADOG_API_KEY,
    hostname: process.env.HOSTNAME,
    service: 'guitar-strategies',
    tags: ['env:production']
  }));
}
```

### Error Tracking

**Option: Sentry**
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

// Global error boundary
export function handleError(error: Error, context: Record<string, any>) {
  Sentry.captureException(error, { extra: context });
  log.error('Unhandled error', { error: error.message, stack: error.stack, context });
}
```

### Performance Monitoring

**Option: Vercel Analytics**
- Automatic Core Web Vitals tracking
- Real User Monitoring (RUM)
- API route performance metrics

---

## Interesting Technical Challenges Solved

### 1. Recurring Lesson Double-Booking Prevention

**Problem:** When generating recurring lessons, how do you prevent double-bookings without race conditions?

**Solution:**
- Generate all lessons upfront in a single transaction
- Check for conflicts before creating (within transaction)
- Use database-level unique constraints as final safeguard

```typescript
// Unique constraint on (teacherId, date)
@@unique([teacherId, date])

// Transaction ensures atomicity
await prisma.$transaction(async (tx) => {
  for (const lessonData of lessons) {
    const conflict = await tx.lesson.findFirst({
      where: { teacherId: lessonData.teacherId, date: lessonData.date }
    });
    if (conflict) throw new Error('Conflict detected');
    await tx.lesson.create({ data: lessonData });
  }
});
```

### 2. Timezone-Aware Slot Generation

**Problem:** Teacher's availability is in their local timezone, but slots must be stored in UTC and displayed correctly to students in different timezones.

**Solution:**
- Store availability template as "HH:MM" strings (timezone-agnostic)
- Convert to UTC when generating specific dates
- Convert back to user timezone for display

```typescript
// Availability: "14:00" (2 PM in teacher's timezone)
const availabilityTime = "14:00";

// Generate slot for specific date
const teacherTimezone = "America/Chicago";
const slotDate = new Date('2025-09-15');
const slotDateTime = parseTime(slotDate, availabilityTime, teacherTimezone);
const utcDateTime = zonedTimeToUtc(slotDateTime, teacherTimezone);

// Store in database (UTC)
await prisma.lesson.create({ data: { date: utcDateTime } });

// Display to student in their timezone
const studentTimezone = "America/New_York";
const displayTime = format(
  utcToZonedTime(lesson.date, studentTimezone),
  'h:mm a zzz',
  { timeZone: studentTimezone }
);
// Output: "3:00 PM EDT"
```

### 3. Rich Text Storage Optimization

**Problem:** Tiptap outputs HTML, but we want to limit database size and prevent bloat.

**Solution:**
- Strip unnecessary whitespace and attributes
- Limit to 5000 characters (including HTML tags)
- Use PostgreSQL `Text` type (unlimited, but we validate in app)

```typescript
// Clean HTML before storage
function cleanHTML(html: string): string {
  return html
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .replace(/<p>\s*<\/p>/g, '')       // Remove empty paragraphs
    .replace(/style="[^"]*"/g, '')     // Strip inline styles
    .trim()
    .slice(0, 5000);                   // Enforce max length
}

// Validate before saving
const lessonSchema = z.object({
  notes: z.string().max(5000).transform(cleanHTML).optional()
});
```

### 4. Efficient Student-Teacher Relationship Queries

**Problem:** Many queries require checking "Does this student belong to this teacher?"

**Solution:**
- Database-level foreign key constraints
- Composite indexes for fast lookups
- Helper functions for authorization checks

```typescript
// Helper function
async function verifyStudentAccess(teacherId: string, studentId: string): Promise<boolean> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { teacherId: true }
  });
  return student?.teacherId === teacherId;
}

// Usage in API routes
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const hasAccess = await verifyStudentAccess(session.user.teacherProfile.id, params.id);

  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... proceed with request
}
```

---

## Future Technical Enhancements

### 1. Real-Time Features with WebSockets

**Use Case:** Live lesson updates, chat between teacher/student

**Technology:** Socket.io or Pusher

```typescript
// lib/socket.ts
import { Server } from 'socket.io';

export function initSocket(server: HttpServer) {
  const io = new Server(server);

  io.on('connection', (socket) => {
    socket.on('join-lesson', (lessonId) => {
      socket.join(`lesson-${lessonId}`);
    });

    socket.on('lesson-update', (lessonId, data) => {
      io.to(`lesson-${lessonId}`).emit('update', data);
    });
  });

  return io;
}
```

### 2. Background Jobs with BullMQ

**Use Cases:**
- Send overdue invoice reminders
- Generate monthly invoices automatically
- Cleanup cancelled lessons

**Technology:** BullMQ + Redis

```typescript
// lib/jobs/invoice-reminders.ts
import { Queue, Worker } from 'bullmq';

const invoiceQueue = new Queue('invoices', {
  connection: { host: 'localhost', port: 6379 }
});

// Add job
await invoiceQueue.add('send-reminder', {
  invoiceId: 'inv123',
  studentEmail: 'student@example.com'
}, {
  delay: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Process jobs
const worker = new Worker('invoices', async (job) => {
  if (job.name === 'send-reminder') {
    const { invoiceId, studentEmail } = job.data;
    await sendOverdueInvoiceEmail(invoiceId, studentEmail);
  }
});
```

### 3. Full-Text Search with Algolia

**Use Case:** Search lesson notes, student names, library files

**Technology:** Algolia

```typescript
// lib/search.ts
import algoliasearch from 'algoliasearch';

const client = algoliasearch('APP_ID', 'API_KEY');
const lessonsIndex = client.initIndex('lessons');

// Index lesson on create/update
export async function indexLesson(lesson: Lesson) {
  await lessonsIndex.saveObject({
    objectID: lesson.id,
    studentName: lesson.student.user.name,
    notes: lesson.notes,
    date: lesson.date.toISOString()
  });
}

// Search
export async function searchLessons(query: string) {
  const { hits } = await lessonsIndex.search(query);
  return hits;
}
```

### 4. PDF Invoice Generation

**Technology:** Puppeteer or @react-pdf/renderer

```typescript
// lib/pdf.ts
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoices/InvoicePDF';

export async function generateInvoicePDF(invoice: Invoice) {
  const stream = await renderToStream(<InvoicePDF invoice={invoice} />);
  return stream;
}

// Usage in API route
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  const pdfStream = await generateInvoicePDF(invoice);

  return new Response(pdfStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
    }
  });
}
```

---

## Lessons Learned & Best Practices

### 1. Server Components First

**Lesson:** Default to Server Components, only use Client Components when necessary.

**Why:** Reduces JavaScript bundle size, improves initial load time, simplifies data fetching.

**Pattern:**
```typescript
// Server Component (data fetching)
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Client Component (interactivity)
'use client';
export function ClientComponent({ data }) {
  const [state, setState] = useState(data);
  // ... interactive logic
}
```

### 2. Structured Logging from Day One

**Lesson:** Console.log is not enough for production debugging. Implement structured logging early.

**Why:** Enables log aggregation, filtering, and correlation across requests.

**Pattern:**
```typescript
// Bad
console.log('Lesson created:', lessonId);

// Good
log.info('Lesson created', {
  lessonId,
  teacherId,
  studentId,
  duration,
  timestamp: new Date().toISOString()
});
```

### 3. Validate Everything with Zod

**Lesson:** Runtime validation prevents bugs and improves error messages.

**Why:** TypeScript only validates at compile time. Zod validates at runtime (API inputs, forms).

**Pattern:**
```typescript
// Define schema once
const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18)
});

// Use in API routes
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

// Use in forms
const form = useForm({ resolver: zodResolver(schema) });
```

### 4. Database Indexes for Common Queries

**Lesson:** Add indexes early for frequently queried columns.

**Why:** Prevents slow queries as data grows.

**Pattern:**
```prisma
// Identify common query patterns
// "Get lessons for teacher ordered by date"
// "Get student's lesson history"
// "Find user by email"

// Add indexes
@@index([teacherId, date])
@@index([studentId, date])
@@index([email])
```

### 5. Error Handling with Context

**Lesson:** Always include relevant context when logging errors.

**Why:** Makes debugging production issues much easier.

**Pattern:**
```typescript
try {
  await prisma.lesson.create({ data: lessonData });
} catch (error) {
  log.error('Lesson creation failed', {
    error: error.message,
    stack: error.stack,
    teacherId: lessonData.teacherId,
    studentId: lessonData.studentId,
    date: lessonData.date
  });
  throw error;
}
```

---

## Common Questions from Engineers

### Q: Why Next.js over other frameworks?

**A:** Next.js 15 with App Router provides:
- Server Components by default (better performance)
- File-based routing (simple, intuitive)
- API routes in same codebase (full-stack simplicity)
- Excellent TypeScript support
- Vercel deployment integration

**Alternatives considered:**
- Remix: Great, but smaller ecosystem
- SvelteKit: Excellent DX, but React has larger talent pool
- Astro: Best for content sites, not SPAs

### Q: Why Prisma over other ORMs?

**A:** Prisma offers:
- Best-in-class TypeScript support (auto-generated types)
- Excellent migration tooling
- Query introspection and debugging
- Clean, declarative schema syntax

**Alternatives considered:**
- Drizzle: Lighter, but less mature tooling
- TypeORM: More complex, verbose
- Raw SQL: Too low-level, no type safety

### Q: Why shadcn/ui over component libraries?

**A:** shadcn/ui provides:
- Copy components into codebase (full control, no library lock-in)
- Built on Radix UI (accessible primitives)
- TailwindCSS styling (consistent with design system)
- No runtime library to update/break

**Alternatives considered:**
- Material-UI: Too opinionated, harder to customize
- Chakra UI: Good, but adds runtime JS
- Radix UI directly: More work to style

### Q: How does the scheduling system handle edge cases?

**A:** Key edge cases handled:
- **Timezone differences:** Store UTC, convert to user timezone
- **Double bookings:** Transaction + unique constraints
- **Recurring conflicts:** Generate all lessons upfront, check conflicts
- **Daylight Saving Time:** date-fns-tz handles DST transitions
- **Leap years/dates:** Native Date object handles correctly

### Q: What's the scalability limit?

**Current architecture supports:**
- ~1000 teachers (single database instance)
- ~10,000 students
- ~100,000 lessons/month

**Bottlenecks:**
- Database connection pool (mitigated with connection pooling)
- Slot generation queries (mitigated with indexes)

**Future scaling:**
- Read replicas for lesson history queries
- Redis cache for frequently accessed data
- Background jobs for async processing

### Q: How do you handle database migrations in production?

**A:** Prisma migration workflow:
1. Develop migration locally: `npx prisma migrate dev`
2. Commit migration files to git
3. CI/CD runs: `npx prisma migrate deploy` (no prompts)
4. Generate Prisma Client: `npx prisma generate`
5. Deploy application with new schema

**Rollback strategy:**
- Prisma doesn't have built-in rollback
- Manual: `prisma migrate resolve --rolled-back <migration>`
- Best practice: Test migrations in staging first

### Q: What's the testing coverage?

**Current state:** Manual testing during development

**Future:**
- Unit tests: Jest + React Testing Library (targeting 80% coverage)
- Integration tests: Playwright (critical user flows)
- API tests: Supertest (all API routes)

---

## Code Review Checklist

When reviewing PRs for this project, check:

- [ ] TypeScript: No `any` types, all types properly defined
- [ ] Validation: All inputs validated with Zod schemas
- [ ] Authorization: Role-based access control enforced
- [ ] Logging: Structured logs with context (not console.log)
- [ ] Error Handling: Try/catch with proper error logging
- [ ] Database: Indexes for new query patterns
- [ ] Security: XSS/CSRF/SQL injection prevention
- [ ] Performance: Server Components used where possible
- [ ] Styling: Follows design system (no arbitrary colors/fonts)
- [ ] Accessibility: Proper ARIA labels, focus states, keyboard nav

---

## Additional Resources

### Documentation
- [Next.js App Router Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Internal Docs
- [CLAUDE.md](./CLAUDE.md) - Project instructions and style guide
- [README.md](./README.md) - Setup and getting started
- [prisma/schema.prisma](./prisma/schema.prisma) - Complete database schema

### Architecture Diagrams
(Future: Add Mermaid diagrams or draw.io files)

---

## Contact & Contribution

**Maintainer:** Ross Williams

**Contribution Guidelines:**
- Follow TypeScript strict mode
- Use structured logging (Winston)
- Write Zod schemas for all inputs
- Follow design system (OpenAI-inspired)
- Add tests for new features

**Pull Request Template:**
```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] TypeScript errors resolved
- [ ] Zod validation added
- [ ] Structured logging implemented
- [ ] Authorization checks added
- [ ] Design system followed
```

---

**End of Technical Deep Dive**

This document should provide everything another software engineer needs to understand the architecture, design decisions, and implementation details of Guitar Strategies. Use this as a reference during technical discussions, architecture reviews, or onboarding new developers.

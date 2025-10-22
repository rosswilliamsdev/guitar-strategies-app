# Guitar Strategies - Claude Code Reference Guide

## Project Overview

Guitar lesson management platform with a complete internal scheduling system. Teachers manage their availability directly in the app, students book time slots through our booking interface, and completed lessons are logged for progress tracking. The app generates invoices and tracks payments, with teachers collecting payments via Venmo/PayPal/Zelle and marking them as paid.

### Core Philosophy: Booking Time, Not Lessons

**Important**: Students are booking and paying for the teacher's TIME, not lessons. This means:

- Use "Book a Time" or "Book Time" instead of "Book a Lesson"
- Students pay for reserved time slots whether they attend or cancel
- The teacher's time has value regardless of student attendance
- Language should reflect time reservation: "Reserve your time", "Book additional time", etc.
- This applies to both individual bookings and recurring weekly slots

## Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: TailwindCSS 3.4.17 with custom design system + Typography plugin
- **Database**: PostgreSQL with Prisma ORM 6.13.0
- **Authentication**: NextAuth.js v4.24.11 with Prisma Adapter
- **Rich Text Editor**: Tiptap with React integration
- **File Storage**: Vercel Blob 1.1.1
- **Invoicing**: Simple invoice generation and payment tracking (no external payment processor)
- **Scheduling**: Internal availability management and booking system
- **Validation**: Zod 4.0.15
- **Styling Utils**: clsx + tailwind-merge (cn utility)
- **Logging**: Winston 3.x with structured logging and domain-specific loggers

## Design System Colors (OpenAI-Inspired)

```css
/* Neutral Palette (OpenAI Style) */
--neutral-50: #fafafa
--neutral-100: #f5f5f5
--neutral-200: #e5e5e5
--neutral-300: #d4d4d4
--neutral-400: #a3a3a3
--neutral-500: #737373
--neutral-600: #525252
--neutral-700: #404040
--neutral-800: #262626
--neutral-900: #171717
--neutral-950: #0a0a0a

/* Turquoise Accent System */
--turquoise-50: #f0fdfc
--turquoise-100: #ccfbf7
--turquoise-200: #99f6ef
--turquoise-300: #5eebe4
--turquoise-400: #2dd4cc
--turquoise-500: #14b8b3   /* Primary turquoise */
--turquoise-600: #0d9289
--turquoise-700: #0f766e
--turquoise-800: #115e59
--turquoise-900: #134e4a



/* Semantic Colors */
--primary: #14b8b3        /* turquoise-500 */
--accent: #73EEDC         /* Original turquoise as accent */
--background: #fafafa     /* neutral-50 */
--foreground: #0a0a0a     /* neutral-950 */
--muted: #f5f5f5          /* neutral-100 */
--muted-foreground: #737373 /* neutral-500 */
--border: #e5e5e5         /* neutral-200 */
--input: #ffffff
--ring: #14b8b3           /* Primary focus ring */
```

#4c5b6e
#417685
#417d8c
#e4e9ec
#c4d1d6
#a5b7bf

## Typography System (OpenAI-Inspired)

```css
/* Font Families */
font-sans: Inter, system-ui, sans-serif    /* Primary font (OpenAI standard) */
font-serif: Charter, Georgia, serif        /* Serif fallback */
font-mono: Menlo, Monaco, 'Courier New', monospace

/* Font Scale (OpenAI Style) */
text-xs: 0.75rem (12px)     /* Small captions */
text-sm: 0.875rem (14px)    /* Small text, buttons */
text-base: 1rem (16px)      /* Body text */
text-lg: 1.125rem (18px)    /* Large body */
text-xl: 1.25rem (20px)     /* Small headings */
text-2xl: 1.5rem (24px)     /* Medium headings */
text-3xl: 1.875rem (30px)   /* Large headings */
text-4xl: 2.25rem (36px)    /* Extra large headings */
text-5xl: 3rem (48px)       /* Display text */
text-6xl: 3.75rem (60px)    /* Hero text */
```

## Design Patterns (OpenAI-Inspired)

- **Clean Minimalism**: Use neutral grays as primary palette
- **Turquoise Accent**: Use turquoise system for CTAs, highlights, and interactive elements
- **Consistent Typography**: Inter font family throughout
- **Subtle Shadows**: Minimal shadows for depth (`shadow-sm`, `shadow-md`)
- **Focus States**: Clean `focus-visible` rings using turquoise
- **All Roles**: Unified design with turquoise as primary accent (no role-specific colors)
- **No Icon Underlines**: Icons and icon buttons should never have underlines or decorative lines

## Component Patterns (Updated for OpenAI Style)

```css
/* Buttons */
.btn-primary     /* Turquoise primary button (bg-primary text-white hover:bg-turquoise-600) */
/* Turquoise primary button (bg-primary text-white hover:bg-turquoise-600) */
.btn-secondary   /* Neutral button with border (bg-background border text-foreground hover:bg-muted) */

/* Cards */
.card           /* Clean card (rounded-lg border bg-background p-6 shadow-sm) */
.card-hover     /* Hoverable card (hover:shadow-md cursor-pointer transition-shadow) */

/* Form Elements */
.input-field    /* Clean input styling with neutral colors */
.label          /* Form labels using text-sm font-medium */

/* Status Badges */
.badge; /* Subtle badges with borders (bg-*-50 text-*-700 border border-*-200) */
```

## Database Schema Key Models

### User Model

```typescript
{
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  teacherProfile?: TeacherProfile
  studentProfile?: StudentProfile
}
```

### TeacherProfile Model

```typescript
{
  id: string
  userId: string
  bio?: string
  hourlyRate?: number         // In cents
  isActive: boolean
  isAdmin: boolean            // Solo teachers automatically get admin privileges

  // Organization settings (set at signup, cannot be changed)
  organizationId?: string     // Reference to Organization (null for solo teachers)
  organizationName?: string   // Cached org name for display
  isSoloTeacher: boolean      // Default: false - independent teachers
  isOrgFounder: boolean       // Default: false - organization founders

  // Payment methods for invoice generation
  venmoHandle?: string        // @username
  paypalEmail?: string        // email@example.com
  zelleEmail?: string         // email@example.com or phone number

  // Profile settings
  timezone?: string           // Default: "America/New_York"
  phoneNumber?: string
  profileImageUrl?: string
}
```

**Important Notes:**

- **Three Types**: Teachers choose at signup: Solo, Found Organization, or Join Organization
- **Permanent Choice**: Teacher type and organization affiliation cannot be changed after signup
- **Admin Privileges**:
  - Solo teachers: `isSoloTeacher: true, isAdmin: true`
  - Organization founders: `isOrgFounder: true, isAdmin: true, organizationId: <org>`
  - Organization members: `isOrgFounder: false, isAdmin: false, organizationId: <org>`
- **Display Only**: Organization information shown in settings but is read-only

### StudentProfile Model

````typescript
{
  id: string
  userId: string
  teacherId: string
  joinedAt: DateTime

  // Student preferences
  skill_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL'
  goals?: string
  instrument: string              // Default: "guitar"
  phoneNumber?: string
  parentEmail?: string           // For minor students
  emergencyContact?: string
  isActive: boolean
}
``` .

### Lesson Model

```typescript
{
  id: string
  teacherId: string
  studentId: string
  date: DateTime
  duration: number              // minutes (default: 30)
  notes?: string                // Rich HTML content (up to 5000 chars)
  homework?: string             // assignments for next lesson
  progress?: string             // skill progression notes
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED'

  // Lesson details (optional fields)
  focusAreas?: string           // Comma-separated focus areas
  songsPracticed?: string       // Comma-separated songs
  nextSteps?: string
  studentRating?: number        // 1-5 scale, student feedback
  teacherRating?: number        // 1-5 scale, teacher assessment
}
````

### Scheduling Models

```typescript
// Teacher Availability
{
  id: string
  teacherId: string
  dayOfWeek: number            // 0 (Sunday) to 6 (Saturday)
  startTime: string            // "HH:MM" format (e.g., "14:00")
  endTime: string              // "HH:MM" format (e.g., "18:00")
  isActive: boolean            // Enable/disable specific slots
}

// Teacher Lesson Settings
{
  id: string
  teacherId: string
  allow30Min: boolean          // Enable 30-minute lessons
  allow60Min: boolean          // Enable 60-minute lessons
  price30Min?: number          // Price in cents for 30-min lessons
  price60Min?: number          // Price in cents for 60-min lessons
  advanceBookingDays: number   // How far in advance students can book (1-90)
}

// Recurring Slots (for indefinite weekly lessons)
{
  id: string
  teacherId: string
  studentId: string
  dayOfWeek: number            // 0-6 for Sunday-Saturday
  startTime: string            // "HH:MM" format
  duration: number             // 30 or 60 minutes
  status: 'ACTIVE'             // Only active slots stored
}

// Teacher Blocked Time
{
  id: string
  teacherId: string
  startDate: DateTime
  endDate: DateTime
  reason?: string              // "Vacation", "Personal", etc.
}
```

## Authentication Patterns

### Route Protection

```typescript
// Use middleware.ts for route protection
// Teacher-only: /students, /lessons/new
// Student access: /dashboard/student, /lessons (view only)
// Admin access: /admin/*
```

### Auth Configuration

```typescript
// In lib/auth.ts - NextAuth pages config
pages: {
  signIn: "/login",        // Maps to app/(auth)/login/page.tsx
  error: "/error",         // Maps to app/(auth)/error/page.tsx
},
```

### Session Structure

```typescript
session.user = {
  id: string
  email: string
  name: string
  role: Role
  teacherProfile?: { id, bio, hourlyRate }
  studentProfile?: { id, teacherId, skillLevel }
}
```

## Email Notification System Architecture

### Overview

The Guitar Strategies app implements a comprehensive email notification system using Resend as the service provider. The architecture prioritizes reliability, maintainability, and professional presentation.

### Core Components

#### 1. Email Service Library (`lib/email.ts`)

- **Provider**: Resend API with environment-stored API key
- **Central Function**: `sendEmail()` handles all email operations
- **Error Handling**: Returns boolean success/failure with comprehensive error logging
- **Configuration**: Default sender "Guitar Strategies <onboarding@resend.dev>"
- **Reliability**: Graceful failure handling - email failures don't break main operations

#### 2. Email Templates

- **Design System**: Professional HTML templates with responsive design
- **Styling**: Consistent turquoise accent colors (#14b8b3), OpenAI-inspired design
- **Structure**: Base template wrapper (header, content area, footer)
- **Responsive**: Mobile-optimized with clean typography

### Email Types & Triggers

#### Lesson Management

- **Cancellation Emails**: Dual perspective (student/teacher) with lesson details
  - Triggered: `/api/lessons/[id]/cancel` endpoint
  - Data: Date, time, duration, participant names
- **Booking Confirmations**: Single vs recurring lesson messaging
  - Triggered: `/api/lessons/book` endpoint
  - Content: Lesson details, reminders, booking-specific messaging

#### Student Engagement

- **Checklist Completion**: Achievement celebration emails
  - Triggered: `/api/student-checklists/items/[id]` at 100% completion
  - Content: Achievement summary, encouragement, emoji support

#### Business Operations

- **Invoice Overdue Reminders**: Payment reminder system
  - Triggered: Manual/automated job execution
  - Content: Invoice details, payment methods (Venmo/PayPal/Zelle), professional CTAs

### Development & Testing

#### Admin Interface

- **Testing Route**: `/admin/email-test` (admin-only access)
- **Features**: Template preview, delivery testing, configuration verification
- **Purpose**: Debug templates without triggering real events

#### Configuration

```env
RESEND_API_KEY=your_resend_api_key_here
```

### Production Considerations

- **Domain Verification**: Required for custom sender addresses
- **Error Resilience**: Email failures logged but don't break primary operations
- **Scalability**: Centralized service pattern supports easy template additions

### Reusable Pattern

This architecture provides a template for implementing email notifications in any application:

1. Single service abstraction (`lib/email.ts`)
2. Template-based design system
3. Event-driven triggers
4. Admin testing interface
5. Graceful error handling

## Structured Logging System

The application uses Winston-based structured logging with comprehensive context tracking and domain-specific loggers for production-ready observability.

### Logging Architecture

```typescript
// Basic usage
import { log } from "@/lib/logger";
log.info("User action completed", { userId, action: "profile_update" });
log.error("Database connection failed", {
  error: error.message,
  stack: error.stack,
});

// Domain-specific loggers
import {
  apiLog,
  dbLog,
  emailLog,
  schedulerLog,
  invoiceLog,
} from "@/lib/logger";
apiLog.info("API request completed", {
  method: "POST",
  endpoint: "/api/lessons",
  statusCode: 200,
});
dbLog.error("Query timeout", {
  query: "SELECT * FROM lessons",
  duration: 5000,
});
```

### Log Levels & Usage

- **`error`**: Errors, exceptions, critical failures that need immediate attention
- **`warn`**: Warnings, deprecated usage, recoverable errors
- **`info`**: General application flow, business events, API requests/responses
- **`http`**: HTTP request/response details (middleware, API routes)
- **`debug`**: Detailed debugging information, development-only logs

### Domain-Specific Loggers

- **`apiLog`**: API routes, HTTP requests/responses, middleware events
- **`dbLog`**: Database operations, query performance, connection issues
- **`emailLog`**: Email sending, delivery status, email service events
- **`schedulerLog`**: Lesson scheduling, background jobs, recurring tasks
- **`invoiceLog`**: Invoice generation, payment tracking, billing events
- **`authLog`**: Authentication events, login/logout, session management

### Structured Context Pattern

Always include relevant structured data for better searchability and debugging:

```typescript
// Good - Structured context
log.info("Lesson booking completed", {
  studentId: student.id,
  teacherId: teacher.id,
  lessonDate: lesson.date.toISOString(),
  duration: lesson.duration,
  bookingType: "single", // or 'recurring'
});

// Avoid - Unstructured string interpolation
console.log(`Lesson booked for ${student.name} with ${teacher.name}`);
```

### Production Configuration

- **Development**: Colorized console output with debug level
- **Production**: JSON structured logs with info level, file rotation
- **File Output**: `/logs/error.log` (errors only), `/logs/combined.log` (all levels)
- **Log Rotation**: 5MB max file size, 5 error logs, 10 combined logs

### Utility Functions

```typescript
import { logAPIRequest, logAPIResponse, logAPIError } from "@/lib/logger";

// API request logging
logAPIRequest("POST", "/api/lessons", { userId, teacherId });
logAPIResponse("POST", "/api/lessons", 201, 150, { lessonId });
logAPIError("POST", "/api/lessons", error, { userId });
```

### Migration from console.log

1. **Import the logger**: `import { log } from '@/lib/logger';`
2. **Replace console methods**:
   - `console.log()` → `log.info()`
   - `console.error()` → `log.error()`
   - `console.warn()` → `log.warn()`
3. **Add structured context**: Include relevant data objects
4. **Use appropriate levels**: Choose error/warn/info/debug based on severity
5. **Use domain loggers**: Import `apiLog`, `dbLog`, etc. for specific domains

### Testing & Debugging

- **Test Endpoint**: `/api/test/logger` - Demonstrates all logging features
- **Migration Tool**: `node scripts/migrate-logging.js` - Analyze console.log usage
- **Log Analysis**: Use structured data for filtering and searching in production

## Key File Locations

### Configuration Files

- `tailwind.config.js` - Complete design system configuration
- `lib/auth.ts` - NextAuth.js configuration
- `lib/db.ts` - Prisma client
- `lib/logger.ts` - Structured logging system with Winston
- `middleware.ts` - Route protection
- `types/index.ts` - All TypeScript definitions

### Core Components Path

- `components/ui/` - shadcn/ui components (Button, Dialog, Select, etc.) with custom styling
- `components/auth/` - Login/register forms
- `components/layout/` - Headers, sidebars, navigation
- `components/dashboard/` - Role-specific dashboards
- `components/lessons/` - Lesson forms and management
- `components/library/` - File upload and library management
- `components/recommendations/` - Recommendations system
- `components/settings/` - User settings forms

### Validation Schemas

- `lib/validations.ts` - All Zod schemas for forms and API validation

## Environment Variables Required

```bash
# Database (working configuration in .env file)
DATABASE_URL="postgresql://rosswilliams@localhost:5432/guitar_strategies_dev"

# Auth (NextAuth v4) - in .env file
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"  # ⚠️ SHOULD UPDATE
NEXTAUTH_URL="http://localhost:3000"

# Additional configs in .env.local (for future features)
# File Storage (when implementing uploads)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxxxxxx"  # ⚠️ NEEDS REAL VALUE

# No payment processor needed - using simple invoice generation
```

## Environment Setup Notes

- **Database**: Using Postgres.app with `rosswilliams` user (working ✅)
- **Auth**: Basic setup working, should generate proper secret for security
- **File Structure**: `.env` for core app, `.env.local` for additional services
- **Development Ready**: Auth and database fully functional
- **Admin User**: Seeded for development and testing (see below)
- **Future Services**: Vercel Blob token needed when implementing file storage features
- **Invoicing**: No payment processor setup required - teachers collect payments directly

## Development Test Users

Test users are created automatically for development and testing:

```bash
# Create all test users (safe to run multiple times)
npm run seed

# Test user credentials
Admin:
  Email: admin@guitarstrategies.com
  Password: admin123
  Role: ADMIN

Teacher:
  Email: teacher@guitarstrategies.com
  Password: teacher123
  Role: TEACHER
  Features: Bio, hourly rate ($60/hr), availability schedule

Student:
  Email: student@guitarstrategies.com
  Password: student123
  Role: STUDENT
  Features: Assigned to test teacher, intermediate skill level
```

**Note**: These are for development only. Production should use proper user creation flows.

## Generate Secure Auth Secret

```bash
# Replace the placeholder with a real secret
openssl rand -base64 32
# Then update NEXTAUTH_SECRET in .env file
```

### Invoice Model

````typescript
{
  id: string
  teacherId: string
  studentId: string

  // Invoice details
  invoiceNumber: string             // "INV-2025-001" format
  month: string                     // "2025-09" format
  dueDate: DateTime
  status: 'PENDING' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED'

  // Totals (calculated from items)
  subtotal: number                  // cents
  total: number                     // cents

  // Payment tracking
  paidAt?: DateTime
  paymentMethod?: string            // "Venmo", "PayPal", "Zelle", "Cash", "Check"
  paymentNotes?: string             // Reference number, etc.

  items: InvoiceItem[]              // Individual lesson charges
}

### InvoiceItem Model

```typescript
{
  id: string
  invoiceId: string

  // Item details
  description: string               // "Guitar Lesson - Sep 15, 2025"
  quantity: number                  // Default: 1
  rate: number                      // cents (teacher's hourly rate)
  amount: number                    // cents (quantity × rate)
  lessonDate?: DateTime
  lessonId?: string                 // Optional reference to actual lesson
}
````

**Invoice Workflow:**

1. Teacher schedules lessons for students (recurring weekly slots)
2. App generates monthly invoices with all scheduled lesson items
3. Invoice includes teacher's payment methods (Venmo, PayPal, Zelle)
4. Teacher sends invoice to student/parent via email
5. Student pays directly using preferred method
6. Teacher marks invoice as paid in the app

### Current Lesson Workflow

1. **Availability Setup**: Teachers configure weekly availability in settings (`/settings`)
   - Set available time slots for each day of the week
   - Configure lesson durations (30 or 60 minutes) and pricing
   - Set advance booking limits and blocked time periods
2. **Booking**: Students book time slots directly in the app (`/book-lesson`)
   - View real-time availability calendar
   - Select single lessons or recurring weekly series
   - Receive confirmation with time reservation details
3. **Teaching**: Lesson happens in person/online
4. **Logging**: Teacher quickly logs lesson in app (`/lessons/new`):
   - Select student from dropdown
   - Add rich text notes (optional but recommended)
   - Date/time auto-recorded (current timestamp)
   - Duration defaults to 30 minutes
   - Status automatically set to "Completed"
5. **Tracking**: All lesson data stored for progress tracking and billing

### User Flow Patterns

- **Teacher Registration**: Create account → **Choose solo teacher or organization (permanent)** → Set up availability schedule → Configure lesson settings → Invite students
- **Student Registration**: Need teacher invitation or teacher ID during signup
- **Lesson Flow**: Student books time slot in app → Lesson happens → Teacher logs in our app
- **Payment Flow**: Monthly billing based on number of lessons scheduled/completed in that month

### Organization & Solo Teacher System

**Three Teacher Types at Registration:**

1. **Solo Teacher**

   - Independent teachers managing their own business
   - Automatically receive `isAdmin: true` for full admin privileges
   - No organization affiliation

2. **Organization Founder** ✨

   - Creates a new organization during signup
   - Becomes the organization's founder and admin
   - Automatically receives `isAdmin: true` and `isOrgFounder: true`
   - Can manage organization teachers, students, and settings
   - Organization name must be unique system-wide

3. **Organization Member**
   - Joins an existing organization by entering its exact name
   - Standard teacher permissions only
   - Must enter exact organization name that already exists
   - Linked to organization via `organizationId`

**Important Rules:**

1. Teacher type is **permanent** - set at signup and cannot be changed
2. Organization founders automatically get full admin access
3. Organization names must be unique (enforced at database level)
4. Teachers joining an organization must enter the exact organization name
5. Organization status is displayed in settings but read-only after registration
6. If a teacher needs to change organization status, they must contact support

**Admin Access Hierarchy:**

- Users with role `ADMIN` have full system access
- Solo teachers (`isSoloTeacher: true`) get admin access
- Organization founders (`isOrgFounder: true`) get admin access for their org
- Middleware checks: `role === 'ADMIN'` OR `isAdmin === true`

**Organization Model:**

```typescript
{
  id: string
  name: string              // Unique organization name
  slug: string              // URL-friendly identifier (unique)
  founderId: string         // User who created the organization
  isActive: boolean
  description?: string
  website?: string
  logoUrl?: string
  teachers: TeacherProfile[] // All teachers in this organization
}
```

## API Route Patterns

```typescript
// Use Server Actions for forms when possible
// API routes for:
GET / api / lessons; // List lessons with filters
POST / api / lessons; // Create new lesson
GET / api / lessons / [id]; // Get lesson details
PUT / api / lessons / [id]; // Update lesson
DELETE / api / lessons / [id]; // Delete lesson

// Similar patterns for students, library, recommendations
```

## Form Validation Patterns

Always use Zod schemas from `lib/validations.ts`:

- `loginSchema` - Login form
- `registerSchema` - Registration with role-specific fields
- `createLessonSchema` - Lesson logging
- `teacherProfileSchema` - Teacher settings
- `studentProfileSchema` - Student settings

## Component Naming Conventions

- **Pages**: `page.tsx` (App Router requirement)
- **Layouts**: `layout.tsx` (App Router requirement)
- **Components**: PascalCase with descriptive names
  - `TeacherDashboard` not `Dashboard`
  - `LessonForm` not `Form`
  - `StudentCard` not `Card`

## Dependencies In Use

```json
{
  "dependencies": {
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^6.13.0",
    // Radix UI primitives (used by shadcn/ui components)
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-dialog": "^1.x.x",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.x.x",
    "@radix-ui/react-switch": "^1.x.x",
    "@radix-ui/react-toast": "^1.x.x",
    // Tiptap rich text editor
    "@tiptap/react": "^2.x.x",
    "@tiptap/starter-kit": "^2.x.x",
    "@tiptap/extension-placeholder": "^2.x.x",
    "@tiptap/extension-text-style": "^2.x.x",
    "@tiptap/extension-color": "^2.x.x",
    "@vercel/blob": "^1.1.1",
    "autoprefixer": "^10.4.21",
    "bcrypt": "^6.0.0",
    "class-variance-authority": "^0.7.x", // For component variants
    "clsx": "^2.1.1",
    "lucide-react": "^0.x.x", // Icon library
    "next": "15.4.6",
    "next-auth": "^4.24.11",
    "prisma": "^6.13.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "tailwind-merge": "^3.3.1",
    "winston": "^3.x.x",
    "zod": "^4.0.15"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/typography": "^0.5.16",
    "@types/bcrypt": "^6.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.4.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5"
  }
}
```

```typescript
// Use absolute imports with @ alias
import { Button } from "@/components/ui/button"; // shadcn/ui component
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import type { TeacherProfile } from "@/types";

// NextAuth v4 patterns (not v5)
import { getServerSession } from "next-auth/next";
import { useSession, signIn, signOut } from "next-auth/react";

// Utility imports
import { cn } from "@/lib/utils"; // Class name utility from shadcn/ui
import { z } from "zod";
```

## Error Handling Patterns

- Use Next.js error boundaries (`error.tsx` files)
- Validate all inputs with Zod schemas
- Return proper HTTP status codes from API routes
- Show user-friendly error messages with toast notifications

## Performance Considerations

- Use Server Components by default
- Add 'use client' only when needed (forms, interactivity)
- Implement proper loading states
- Use Prisma with proper relations and includes
- Cache API responses where appropriate

## Accessibility Requirements

- All interactive elements minimum 44px touch target
- Proper focus management with `focus-visible` class
- ARIA labels for complex components
- Color contrast meets WCAG AA standards
- Keyboard navigation support

## Mobile Responsiveness

- Mobile-first approach with TailwindCSS
- Responsive navigation (hamburger menu on mobile)
- Touch-friendly button sizes
- Readable typography on all screen sizes

## Completed Features ✅

### Complete Internal Scheduling System (Aug 13, 2025)

11. **Custom Scheduling System** ✅

- Replaced Calendly with complete internal availability management
- Teachers set weekly availability schedules with drag-and-drop interface
- Support for multiple time slots per day with customizable hours
- Lesson duration configuration (30-minute and 60-minute options)
- Dynamic pricing per lesson duration
- Advance booking limits (configurable 1-90 days)
- Blocked time management for vacations and personal time
- Timezone-aware scheduling with automatic UTC conversion
- Real-time slot generation with conflict detection
- Recurring lesson support (2-52 weeks)

12. **Refined Booking System** ✅

- 30-minute slot standardization for all bookings
- Consecutive slot selection (1-2 slots) for 30 or 60-minute lessons
- Simplified interface without pricing display per user request
- Student-accessible booking API endpoint (`/api/availability/[teacherId]`)
- Smart duration calculation based on selected slots
- Clear instructional text for slot selection

13. **UI/UX Improvements** ✅

- Left-aligned daily schedule view for better readability and cleaner appearance
- Removed duplicate "Book a Lesson" titles from booking interface
- Fixed hanging "8:30 PM" time slot display issue in weekly view
- Timezone-corrected availability display (fixed day-of-week mapping)
- Improved schedule alignment and visual organization

14. **Navigation Consolidation** ✅

- Integrated "My Checklists" as section within main Checklists page
- Created unified route structure: `/curriculums/my/*` for personal checklists
- Updated all student checklist navigation links consistently
- Removed redundant "My Checklists" sidebar menu item
- Simplified dashboard quick actions for students

### Core Authentication & Dashboards

1. **Authentication System** ✅

   - NextAuth.js integration with database sessions
   - Role-based authentication (Student/Teacher/Admin)
   - Secure login/logout with proper redirects
   - Password hashing with bcrypt

2. **Role-Based Dashboards** ✅

   - Teacher Dashboard: Stats, recent lessons, student overview
   - Student Dashboard: Assigned teacher, lesson history, progress
   - Admin Dashboard: System overview
   - Responsive design with OpenAI-inspired styling

3. **Settings Management** ✅
   - Student Settings: Profile info, skill level, goals, parent contact
   - Teacher Settings: Bio, hourly rate, availability schedule, lesson settings, contact info
   - Password change functionality with validation
   - Tabbed interface for better UX

### Lesson Management System

4. **Streamlined Lesson Logging** ✅

   - Simple form: Student selection + rich text notes
   - Auto-populated date/time (current timestamp)
   - Default 30-minute duration
   - Rich text editor with formatting (bold, italic, lists, quotes)
   - Full CRUD API with validation
   - Teacher-student relationship verification

5. **Rich Text Notes** ✅
   - Tiptap editor integration
   - Formatting toolbar (bold, italic, lists, blockquotes)
   - Up to 5000 character limit (includes HTML)
   - Undo/redo functionality
   - Professional styling with proper focus states

### Content Management

6. **Library System** ✅

   - File upload for lesson materials (sheet music, exercises, etc.)
   - Category system (Sheet Music, TAB, Chord Charts, etc.)
   - Search and filtering capabilities
   - Teacher-only access with role-based security
   - File download tracking

7. **Recommendations System** ✅
   - Teacher interface: Add/edit/archive recommendations
   - Student interface: View teacher's recommendations
   - Category system (Gear, Books, Software, Apps, etc.)
   - Priority system (1-5 stars) with visual indicators
   - Purchase links and price information
   - Search and filtering by category/priority

### Database & API Layer

8. **Complete Database Schema** ✅

   - Users, TeacherProfiles, StudentProfiles
   - Lessons, LibraryItems, Recommendations
   - Proper relationships and constraints
   - Seeded test data for development

9. **RESTful API Endpoints** ✅
   - `/api/lessons` - Lesson CRUD operations
   - `/api/students` - Student management
   - `/api/library` - File management
   - `/api/recommendations` - Recommendations CRUD
   - `/api/settings` - Profile updates
   - Full validation with Zod schemas

### Invoice & Payment System ✅

8. **Simple Invoice Generation** ✅

   - Generate monthly invoices based on scheduled lessons
   - Include teacher payment methods (Venmo, PayPal, Zelle)
   - Calculate totals from hourly rate × lesson duration
   - Professional invoice formatting and numbering

9. **Payment Tracking Dashboard** ✅

   - Track invoice status (Pending, Sent, Paid, Overdue)
   - Monthly earnings summaries
   - Student payment history
   - Mark payments as received with method and notes

10. **Teacher Payment Methods** ✅

- Add Venmo handle, PayPal email, Zelle info in settings
- Automatically include payment options on invoices
- No complex payment processor setup required
- Teachers collect payments directly from students

## Remaining Features (Future)

1. **Advanced Invoice Features** (PDF generation, email automation)
2. **Advanced Scheduling** (Calendar sync, drag-and-drop rescheduling)
3. **Student Progress Tracking** (Visual charts, milestones)
4. **Communication Tools** (In-app messaging)
5. **Mobile App** (React Native or PWA)

## Development Notes

- Always test with different user roles
- Use TypeScript strictly - no `any` types
- Follow the established design system exactly
- Keep components small and focused
- Write self-documenting code with clear names

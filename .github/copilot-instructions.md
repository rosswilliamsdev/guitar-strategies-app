# Guitar Strategies - Copilot Code Guidelines

## Project Overview

Guitar lesson management platform with internal scheduling, lesson logging, invoicing, and progress tracking. **Core philosophy**: Teachers book TIME for students, not lessons—use "Book Time" not "Book Lesson." **Only teachers can book lessons**—students view their schedule and can cancel recurring time.

## Tech Stack

- **Framework**: Next.js 15.4.6 (App Router), TypeScript 5
- **UI**: shadcn/ui (Radix primitives) + TailwindCSS 3.4.17
- **Database**: PostgreSQL + Prisma ORM 6.13.0
- **Auth**: NextAuth.js v4.24.11 with Prisma Adapter
- **Rich Text**: Tiptap with React
- **Validation**: Zod 4.0.15
- **Logging**: Winston 3.x with structured logging

## Code Style & Patterns

### Component Conventions

- **Absolute imports**: `@/components/ui/button`, `@/lib/db`, `@/types`
- **'use client'** only for interactive components, forms, hooks
- **File naming**: PascalCase components, lowercase pages/utils
- **shadcn/ui**: Use existing components from `components/ui/`; extend with ClassVariance for variants
- **Utilities**: Use `cn()` from `@/lib/utils` for className merging

### Form & Validation

```typescript
// Always use Zod schemas from lib/validations.ts
import { z } from "zod";
import { loginSchema, createLessonSchema } from "@/lib/validations";

const data = loginSchema.parse(formInput); // Validate before submit
```

### Authentication

- **Session pattern**: `const session = await getServerSession(authOptions)`
- **Client hooks**: `const { data: session } = useSession()`
- **Route protection**: Middleware in `middleware.ts` (teacher: `/students`, `/lessons/new`; admin: `/admin/*`)
- **NextAuth v4**: Use v4 imports—`next-auth/next`, `next-auth/react` (NOT v5)

### Database & API

- **Server Actions preferred** for forms when possible
- **API routes** for GET/POST/PUT/DELETE collections
- **Pattern**: `/api/lessons` (list), `/api/lessons/[id]` (CRUD)
- **Prisma**: Include relations eagerly; use `prisma.model.findUnique()` not raw SQL
- **Validation**: Validate all inputs with Zod before DB operations

### Logging

Use structured logging (see [lib/logger.ts](lib/logger.ts)):

```typescript
import { log, apiLog, dbLog } from "@/lib/logger";

log.info("User action", { userId, action: "profile_update" });
apiLog.error("API failed", { method, endpoint, statusCode, error });
```

Domain-specific loggers: `apiLog`, `dbLog`, `emailLog`, `schedulerLog`, `invoiceLog`, `authLog`

## Design System

### Colors (OpenAI-Inspired)

- **Primary**: Turquoise (`#14b8b3` / `turquoise-500`)
- **Neutral**: Gray palette (`neutral-50` to `neutral-950`)
- **Semantic**: Use turquoise for CTAs, accents, highlights across ALL roles
- **No role-specific colors**—unified design

### Styling Rules

- **Typography**: Inter font family (default)
- **Buttons**: Primary (turquoise bg), Secondary (bordered)
- **Cards**: `rounded-lg border bg-background p-6 shadow-sm`
- **Focus states**: Clean `focus-visible` rings with turquoise
- **No icon underlines**: Icons/icon buttons never have decorative lines

## Architecture Highlights

### User Roles

- **TEACHER**: Manages students, availability, lesson logging, invoices, payments, books lessons for students
- **STUDENT**: Views lessons, tracks progress, can cancel recurring weekly time (cannot book new lessons)
- **ADMIN**: System overview (teachers have admin access by default)

### Complete Internal Scheduling

- Teachers set weekly availability + configure lesson durations (30/60 min) + pricing
- Dynamic slot generation (30-min increments) with conflict detection
- Advance booking limits configurable (1-90 days)
- Recurring lessons: 2-52 week series support

### Lesson Workflow

1. Teacher sets availability (`/settings`)
2. Teacher books time for students (`/book-lesson`)
3. Lesson occurs
4. Teacher logs lesson (`/lessons/new`): Student + Notes + optional attachments/links
5. Checklist items auto-marked as completed when selected
6. Monthly invoices generated from scheduled lessons

### Invoice System

- Simple generation (no payment processor)
- Includes teacher payment methods (Venmo/PayPal/Zelle)
- Track status: PENDING, SENT, VIEWED, PAID, OVERDUE, CANCELLED
- Teachers collect payments directly

## Key File Locations

| Purpose            | Path                 |
| ------------------ | -------------------- |
| Auth config        | `lib/auth.ts`        |
| Database client    | `lib/db.ts`          |
| Validation schemas | `lib/validations.ts` |
| Logger + domains   | `lib/logger.ts`      |
| Route protection   | `middleware.ts`      |
| UI components      | `components/ui/*`    |
| Type definitions   | `types/index.ts`     |

## Build & Test Commands

```bash
# Setup
npm install
npm run seed  # Create test users in dev database

# Development
npm run dev   # Start Next.js dev server (http://localhost:3000)

# Prisma
npx prisma migrate dev --name {migration_name}
npx prisma db push  # Push schema changes

# Testing
npm run build  # Production build check
npm run lint   # ESLint check
```

## Environment Variables

```bash
# Required - Core App
DATABASE_URL="postgresql://rosswilliams@localhost:5432/guitar_strategies_dev"
NEXTAUTH_SECRET="use `openssl rand -base64 32` for production"
NEXTAUTH_URL="http://localhost:3000"

# Optional - Future Services
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."  # For file storage features
RESEND_API_KEY="..."                         # Email service
```

## Important Patterns

### Error Handling

- Use Next.js error boundaries (`error.tsx`)
- Return proper HTTP status codes from API routes
- Show user-friendly toast notifications, not raw errors
- Always log structured context, never just the error message

### Performance

- Default to Server Components
- Use 'use client' only when needed
- Implement proper loading states
- Cache API responses where appropriate (check `lib/cache.ts`)
- Prisma: eager load relations with `include`

### Database Transactions

See [lib/database-transactions.ts](lib/database-transactions.ts) for transaction patterns. Use explicit transactions for multi-step operations (lesson logging + checklist updates).

### Email Notifications

Use `sendEmail()` from `lib/email.ts`—handles all email operations centrally. Failures logged but don't break main flow. Test templates at `/admin/email-test` (admin-only).

## Dependencies In Use

**Key packages**: `@next-auth/prisma-adapter`, `@prisma/client`, `@radix-ui/*`, `@tiptap/react`, `@vercel/blob`, `lucide-react`, `winston`, `zod`

## Security Notes

- **No `any` types**—strict TypeScript throughout
- CSRF protection: `lib/csrf.ts` (validate token in protected routes)
- Sanitize user input: Use `lib/sanitize.ts` for rich text
- Role-based access: Check `session.user.role` in API routes and middleware
- Database transactions: Use for payment/invoice state consistency
- Secure headers: Handled by `lib/security-headers.ts` in middleware

## Test Users (Development Only)

```
Admin: admin@guitarstrategies.com / Admin123!
Teacher: teacher@guitarstrategies.com / Admin123!
Student: student@guitarstrategies.com / Admin123!
```

Run `npm run seed` to recreate test users.

## Notes for Agents

- Don't commit/push changes—user handles git operations
- Always include 3+ lines of context in replacements
- Prefer multi-file edits over sequential changes
- Ask clarifying questions if requirements are ambiguous
- Reference attachments like `[lesson-form.tsx](components/lessons/lesson-form.tsx)`
- Use semantic search for patterns you're unsure about

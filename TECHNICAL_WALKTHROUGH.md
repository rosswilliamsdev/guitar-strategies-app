# Guitar Strategies - Technical Walkthrough

*A conversational guide for technical presentations*

---

## Flow 1: Teacher Saving Lesson Notes

Let me walk you through how a teacher logs lesson notes after teaching a student. This flow demonstrates our full-stack architecture from UI to database.

### The User Experience

When a teacher finishes a lesson, they navigate to `/lessons/new`. They see a clean form with just two fields:
- A student selector dropdown
- A rich text editor for notes

Date, time, and duration are auto-populated. It's intentionally minimal - we want teachers logging lessons quickly, not fighting with forms.

### Frontend Architecture (React Server Components)

The page component lives at `app/(dashboard)/lessons/new/page.tsx`. Here's what's interesting:

**We use Next.js 15's App Router with Server Components by default.** The page starts as a Server Component that fetches the teacher's students from the database before rendering. This means the student dropdown is populated server-side with zero client-side data fetching.

```typescript
// Server Component - runs on server, fetches data before render
const session = await getServerSession(authOptions);
const students = await prisma.studentProfile.findMany({
  where: { teacherId: session.user.teacherProfile.id },
  include: { user: true }
});
```

We only mark the actual form as a Client Component with `'use client'` because it needs interactivity. This hybrid approach keeps our initial page load fast while enabling rich interactions.

### Rich Text Editor (Tiptap)

For the notes field, we integrated **Tiptap** - a headless editor built on ProseMirror. It gives us:
- Document structure (headings, paragraphs, lists)
- Formatting (bold, italic, code blocks)
- Full programmatic control
- HTML output that we store directly in the database

The editor component lives in `components/lessons/LessonNotesEditor.tsx`. We render a formatting toolbar with buttons that trigger Tiptap commands:

```typescript
editor.chain().focus().toggleBold().run()
editor.chain().focus().toggleBulletList().run()
```

Under the hood, Tiptap maintains the document as a structured tree and serializes to HTML when we need to save.

### Form Validation (Zod)

Before hitting the API, we validate on the client with **Zod schemas** defined in `lib/validations.ts`:

```typescript
const createLessonSchema = z.object({
  studentId: z.string().uuid(),
  notes: z.string().max(5000).optional(),
  date: z.date(),
  duration: z.number().int().positive(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'])
});
```

Zod gives us:
- Runtime type safety (TypeScript types + runtime validation)
- Automatic error messages
- Type inference for TypeScript

The same schema validates on the server in the API route, so we have defense in depth.

### API Layer (Next.js Route Handlers)

The form submits to `POST /api/lessons`, which maps to `app/api/lessons/route.ts`.

**Route Handlers in Next.js 15 are just async functions** that receive a Request and return a Response:

```typescript
export async function POST(request: Request) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.teacherProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate
  const body = await request.json();
  const validated = createLessonSchema.parse(body);

  // 3. Database operation
  const lesson = await prisma.lesson.create({
    data: {
      teacherId: session.user.teacherProfile.id,
      studentId: validated.studentId,
      notes: validated.notes,
      date: validated.date,
      duration: validated.duration,
      status: validated.status
    }
  });

  return NextResponse.json(lesson, { status: 201 });
}
```

Notice the pattern: auth → validate → database → respond. Every API route follows this.

### Database Layer (Prisma ORM)

We use **Prisma** as our ORM with PostgreSQL. The Lesson model in `prisma/schema.prisma` looks like:

```prisma
model Lesson {
  id         String   @id @default(uuid())
  teacherId  String
  studentId  String
  date       DateTime
  duration   Int      @default(30)
  notes      String?  @db.Text
  status     LessonStatus @default(COMPLETED)

  teacher    TeacherProfile @relation(fields: [teacherId], references: [id])
  student    StudentProfile @relation(fields: [studentId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Prisma generates a type-safe client that gives us autocomplete and compile-time errors for invalid queries. When we write:

```typescript
await prisma.lesson.create({ data: { ... } })
```

TypeScript knows every field on the Lesson model and will error if we try to save invalid data.

### Data Flow Summary

Let's trace a lesson note from teacher's keyboard to database:

1. **Client**: Teacher types in Tiptap editor → HTML document structure maintained
2. **Validation**: Zod validates on form submit (client-side)
3. **API Route**: POST /api/lessons receives request
4. **Auth**: NextAuth verifies teacher session
5. **Validation**: Zod validates again (server-side)
6. **Database**: Prisma inserts row into PostgreSQL lessons table
7. **Response**: API returns created lesson as JSON
8. **UI**: Form resets, toast notification shows success

The entire flow takes ~200-300ms in development.

### Key Technical Decisions

**Why Server Components?**
We get automatic code splitting, smaller client bundles, and direct database access without API routes for read-only pages.

**Why Tiptap over a textarea?**
Teachers need formatting for lesson notes - bold for important points, lists for techniques practiced, etc. Tiptap gives us a professional editor without building one from scratch.

**Why Zod instead of just TypeScript types?**
TypeScript types disappear at runtime. Zod validates actual runtime data, protecting us from malicious or malformed requests.

**Why Prisma?**
Type safety, excellent migration system, and auto-generated client that prevents entire classes of SQL injection and type errors.

---

### What Makes This Architecture Scalable?

- **Server Components** - Zero JavaScript sent to client for static content
- **Structured logging** - Winston-based logging with domain-specific loggers for production observability
- **Validation layers** - Zod schemas prevent bad data from reaching database
- **Type safety** - End-to-end TypeScript from API to database
- **Stateless API** - Each request is independent, can scale horizontally

This same pattern (Server Component → Form → API Route → Prisma) powers our entire app: student registration, teacher availability, invoice generation, etc.

---

*End of Flow 1*

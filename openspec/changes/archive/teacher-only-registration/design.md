# Teacher-Only Registration - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   REGISTRATION ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────┘

    /register (Public Route)
         │
         ▼
  ┌──────────────────────┐
  │ RegisterForm         │
  │ (Client Component)   │
  │                      │
  │ State:               │
  │ • name               │
  │ • email              │
  │ • password           │
  │ • isLoading          │
  │ • error              │
  │                      │
  │ [Teacher hardcoded]  │
  └──────────┬───────────┘
             │
             │ POST request
             ▼
  ┌──────────────────────┐
  │ /api/auth/register   │
  │                      │
  │ Validation:          │
  │ • name (required)    │
  │ • email (valid)      │
  │ • password (min 8)   │
  │                      │
  │ Creates:             │
  │ • User (TEACHER)     │
  │ • TeacherProfile     │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │ Auto-login via       │
  │ signIn() from        │
  │ next-auth/react      │
  └──────────┬───────────┘
             │
             ▼
  Redirect to /dashboard
```

## Component Design

### RegisterForm Component

**Location:** `components/auth/register-form.tsx`

**State Management:**
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  // role and teacherId REMOVED
});
```

**Form Fields:**
1. Full Name (text input, required)
2. Email (email input, required)
3. Password (password input, required, min 8 chars)
4. Password strength meter (visual feedback)

**Post-Submit Section:**
```tsx
{/* After submit button */}
<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-button">
  <p className="text-sm text-blue-800">
    📧 Are you a student? Your teacher will send you an invitation email
  </p>
</div>
```

**Success Flow:**
```typescript
// After successful registration
const result = await signIn('credentials', {
  redirect: false,
  email: formData.email,
  password: formData.password,
});

if (result?.ok) {
  router.push('/dashboard');
} else {
  setError('Registration successful but login failed. Please try logging in manually.');
}
```

## API Design

### POST /api/auth/register

**Request Schema:**
```typescript
const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // role and teacherId REMOVED
});
```

**Database Transaction:**
```typescript
const user = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
    role: 'TEACHER', // Hardcoded
    teacherProfile: {
      create: {
        isActive: true,
        isAdmin: true, // All teachers are admins (per CLAUDE.md)
      },
    },
  },
  include: {
    teacherProfile: true,
  },
});
```

**Email Conflict Handling:**
```typescript
const existingUser = await prisma.user.findUnique({
  where: { email },
  include: {
    studentProfile: true,
  },
});

if (existingUser) {
  if (existingUser.role === 'STUDENT') {
    return NextResponse.json(
      {
        message: "This email is already registered as a student. Please use a different email for your teacher account."
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { message: "Email already registered" },
    { status: 400 }
  );
}
```

## User Experience Flow

### Happy Path
1. Teacher visits `/register`
2. Sees form with name, email, password
3. Fills in fields (password strength meter provides feedback)
4. Clicks "Create Account"
5. Account created → auto-logged in → redirected to `/dashboard`
6. Can immediately start inviting students

### Student Scenario
1. Student visits `/register` (maybe from word-of-mouth)
2. Fills out form
3. Sees message: "📧 Are you a student? Your teacher will send you an invitation email"
4. Realizes they shouldn't register here
5. Waits for teacher invitation instead

### Error Scenarios

| Error | User Action | System Response |
|-------|-------------|-----------------|
| Email already exists (teacher) | Teacher tries to register with existing teacher email | "Email already registered" |
| Email already exists (student) | Teacher tries to register with email used by a student | "This email is already registered as a student. Please use a different email for your teacher account." |
| Weak password | Teacher enters password < 8 chars | "Password must be at least 8 characters" (inline validation) |
| Invalid email | Teacher enters malformed email | "Invalid email address" (inline validation) |

## Visual Design

### Student Message Styling
```css
Background: bg-blue-50 (light blue)
Border: border-blue-200 (subtle blue)
Text: text-blue-800 (readable contrast)
Icon: 📧 (email emoji for visual clarity)
Spacing: mt-4 (margin-top after button)
Padding: p-3 (comfortable internal spacing)
Border radius: rounded-button (matches design system)
```

### Form Layout
```
┌────────────────────────────────────┐
│   Get started                      │
│   Create your account to start     │
│   your musical journey             │
│                                    │
│   Full Name                        │
│   [                         ]      │
│                                    │
│   Email                            │
│   [                         ]      │
│                                    │
│   Password                         │
│   [                         ]      │
│   [████████░░] Strong              │
│                                    │
│   [     Create Account      ]      │
│                                    │
│   ╭─────────────────────────────╮ │
│   │ 📧 Are you a student?       │ │
│   │ Your teacher will send you  │ │
│   │ an invitation email         │ │
│   ╰─────────────────────────────╯ │
│                                    │
│   Already have an account?         │
│   Sign in                          │
└────────────────────────────────────┘
```

## Security Considerations

1. **Password hashing:** bcrypt with 12 rounds (unchanged)
2. **Email validation:** Zod schema validation on both client and server
3. **Auto-login:** Uses NextAuth's `signIn()` - no credential exposure
4. **Role enforcement:** Server-side hardcoding prevents client manipulation

## Testing Checklist

- [ ] Teacher can register successfully
- [ ] Auto-login works after registration
- [ ] Redirects to `/dashboard` after auto-login
- [ ] Student message displays correctly
- [ ] Email conflict (teacher) shows generic message
- [ ] Email conflict (student) shows specific message
- [ ] Form validation works (name, email, password)
- [ ] Password strength meter displays correctly
- [ ] Loading states work during submission
- [ ] Error messages display clearly

# Teacher-Only Registration - Tasks

## Tasks

### 1. Update Registration Form Component
**File:** `components/auth/register-form.tsx`
**Status:** complete

**Changes:**
- [x] Remove `role` from formData state
- [x] Remove `teacherId` from formData state
- [x] Remove `teachers` state
- [x] Remove `useEffect` that fetches teachers list
- [x] Remove role selection dropdown JSX
- [x] Remove teacher selection dropdown JSX
- [x] Add student message after submit button
- [x] Update success handler to auto-login using `signIn()` from `next-auth/react`
- [x] Change redirect from `/login` to `/dashboard` after auto-login

**Student Message JSX:**
```tsx
<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-button">
  <p className="text-sm text-blue-800">
    📧 Are you a student? Your teacher will send you an invitation email
  </p>
</div>
```

**Auto-login Implementation:**
```typescript
// After successful registration API call
const signInResult = await signIn('credentials', {
  redirect: false,
  email: formData.email,
  password: formData.password,
});

if (signInResult?.ok) {
  router.push('/dashboard');
} else {
  setError('Registration successful but login failed. Please try logging in manually.');
  router.push('/login?message=Registration successful');
}
```

### 2. Update Registration API Endpoint
**File:** `app/api/auth/register/route.ts`
**Status:** complete

**Changes:**
- [x] Update `registerSchema` to remove `role` and `teacherId` fields
- [x] Remove student registration validation logic (lines 23-30)
- [x] Remove conditional profile creation - always create TeacherProfile
- [x] Simplify user creation to always use `role: 'TEACHER'`
- [x] Update email conflict check to detect student accounts
- [x] Add specific error message for student email conflicts
- [x] Update success response (no changes needed, but verify)
- [x] Remove `studentProfile` from include clause

**Updated Schema:**
```typescript
const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
```

**Email Conflict Check:**
```typescript
const existingUser = await dbQuery(() =>
  prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
    },
  })
);

if (existingUser) {
  if (existingUser.role === 'STUDENT' || existingUser.studentProfile) {
    apiLog.warn("Registration failed - email registered as student", { email });
    return NextResponse.json(
      {
        message: "This email is already registered as a student. Please use a different email for your teacher account."
      },
      { status: 400 }
    );
  }

  apiLog.warn("Registration failed - email already exists", { email });
  return NextResponse.json(
    { message: "Email already registered" },
    { status: 400 }
  );
}
```

**Simplified User Creation:**
```typescript
const user = await criticalDbQuery(() =>
  prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'TEACHER',
      teacherProfile: {
        create: {
          isActive: true,
          isAdmin: true,
        },
      },
    },
    include: {
      teacherProfile: true,
    },
  })
);
```

### 3. Testing
**Status:** complete

**Manual Testing:**
- [x] Teacher registration flow works end-to-end
- [x] Auto-login succeeds after registration
- [x] Redirects to `/dashboard` after auto-login
- [x] Student message displays correctly below submit button
- [x] Email conflict with teacher account shows generic message
- [x] Email conflict with student account shows specific message
- [x] Password strength meter still works
- [x] Form validation works (empty fields, invalid email, short password)
- [x] Loading spinner displays during submission
- [x] Error messages display clearly

**Edge Cases:**
- [x] Teacher registers with existing teacher email → blocked
- [x] Teacher registers with existing student email → blocked with specific message
- [x] Registration succeeds but auto-login fails → user directed to login page with success message
- [x] Network error during registration → error message displayed

### 4. Documentation Update (Optional)
**File:** `CLAUDE.md` or relevant docs
**Status:** complete

- [x] Update user flow documentation to reflect teacher-only registration
- [x] Note that students can only register via invitation
- [x] Update registration screenshots/examples if any exist

## Dependencies

- Task 1 depends on Task 2 (both should be done together)
- Task 3 depends on Tasks 1 & 2
- Task 4 can be done anytime after completion

## Rollback Plan

If issues arise:
1. Revert changes to `register-form.tsx` and `register/route.ts`
2. Restore role dropdown and teacher selector
3. Re-enable student self-registration

All changes are contained to 2 files, making rollback straightforward.

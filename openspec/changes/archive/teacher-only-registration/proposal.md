# Teacher-Only Registration

**Status:** Proposed
**Type:** Feature Refinement
**Estimated Effort:** Small (~2 hours)

## Problem

Currently, the registration page allows both teachers and students to sign up via a role dropdown. When students register, they must select their teacher from a dropdown list.

This self-service student signup doesn't align with the teacher-led onboarding model already implemented via the student invitation system.

## Proposed Solution

Convert the `/register` page to **teacher-only registration**, directing students to wait for invitation emails from their teachers.

### Changes Required

1. **Registration Form** (`components/auth/register-form.tsx`)
   - Remove role selection dropdown
   - Remove teacher selection dropdown
   - Remove teacher fetching logic
   - Hardcode role to `TEACHER`
   - Add student messaging after submit button:
     > "📧 Are you a student? Your teacher will send you an invitation email"
   - Auto-login after successful registration (instead of redirect to `/login`)
   - Redirect to teacher dashboard after auto-login

2. **Registration API** (`app/api/auth/register/route.ts`)
   - Remove `role` and `teacherId` from validation schema
   - Remove student registration logic
   - Always create TEACHER accounts
   - Improve email conflict error:
     - Check if existing email is a student account
     - Show: "This email is already registered as a student. Please use a different email for your teacher account."

### User Flow

```
Teacher visits /register
  → Fills: Name, Email, Password
  → Submits form
  → Account created (TEACHER role)
  → Auto-logged in
  → Redirected to /dashboard

Student needs account?
  → Sees message: "Are you a student? Your teacher will send you an invitation email"
  → Teacher invites via /students/invite
  → Student receives email → clicks token link → sets password → account created
```

## Risks & Considerations

- **Breaking change:** Students can no longer self-register
  - **Mitigation:** Invitation system is already fully functional
- **Messaging clarity:** Students might not understand they need to wait
  - **Mitigation:** Clear, friendly messaging on register page

## Success Criteria

- [ ] Teacher can register without selecting a role
- [ ] Registration auto-logs in teacher and redirects to dashboard
- [ ] Student message displays prominently after submit button
- [ ] Email conflict shows specific message for student accounts
- [ ] No broken functionality in existing invitation flow

## Out of Scope

- Changes to existing invitation system (already working)
- Student account upgrades to teacher (blocked entirely)
- Reverse scenario checking (invitation with teacher email)

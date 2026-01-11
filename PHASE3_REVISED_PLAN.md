# Phase 3: Backend API - Revised Architecture

## Two Invitation Flows

### Flow 1: Teacher Creates Account First
1. Teacher creates student account via existing `/api/students/invite` (with temporary password)
2. Teacher sends invite email via POST `/api/students/[id]/send-invite`
3. Email contains login link to `/login`
4. Student logs in with teacher-provided credentials
5. Student can change password in settings

### Flow 2: Student Self-Signup
1. Teacher sends invite email via POST `/api/students/[id]/send-invite` (no account exists yet)
2. System generates token and stores in StudentInvitation table
3. Email contains signup link to `/register?token=xxx`
4. Student clicks link, verifies token via GET `/api/students/invite/verify?token=xxx`
5. Student creates account via POST `/api/students/invite/accept`
6. Account is linked to existing StudentProfile

## API Endpoints Needed

### 1. POST /api/students/[id]/send-invite
**Smart invite endpoint** - checks if account exists and sends appropriate email

**Logic:**
```
if (student.user exists):
    // Flow 1: Account exists
    - Send "welcome/login" email with login link
    - No token needed
else:
    // Flow 2: No account yet
    - Generate secure token
    - Store in StudentInvitation table
    - Send "create account" email with signup link + token
    - Token expires in 7 days
```

### 2. GET /api/students/invite/verify?token=xxx
**For Flow 2 only** - validates token before showing signup form

Returns:
- Student name (pre-fill)
- Teacher name
- Email address
- Token validity status

### 3. POST /api/students/invite/accept
**For Flow 2 only** - creates user account and links to StudentProfile

Takes:
- token
- password (student chooses)

Does:
- Validates token
- Creates User record
- Links to StudentProfile (updates userId)
- Deletes StudentInvitation (one-time use)

## Database Schema

**StudentInvitation** (already created):
- Stores tokens for Flow 2 (self-signup)
- One-to-one with StudentProfile
- Deleted after account creation

**StudentProfile.userId**:
- NULL initially (before any account)
- Set when Flow 1 (teacher creates) or Flow 2 (student creates) completes

## Email Template Update Needed

The `createStudentInvitationEmail()` needs to handle both:
- **expirationDays = 0**: Account exists, login immediately (Flow 1)
- **expirationDays > 0**: No account, create one with token (Flow 2)

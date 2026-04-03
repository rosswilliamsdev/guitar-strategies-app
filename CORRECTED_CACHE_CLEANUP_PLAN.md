# Corrected Plan: Complete Cache Invalidation Migration

## Overview

Complete the Next.js cache invalidation work started in `ecf1c7e` and `8c4d897` by fixing remaining hard navigation instances in admin, library, and recommendations components.

This follows the **exact same patterns** established in `openspec/changes/archive/fix-nextjs-cache-invalidation`.

---

## Established Pattern (from archived change)

### API Route Pattern
```typescript
import { revalidatePath } from 'next/cache';

export async function DELETE(request: Request) {
  // 1. Perform mutation
  await prisma.resource.delete({ where: { id } });

  // 2. Invalidate Redis/Memory cache (if applicable)
  await invalidateResourceCache(id);

  // 3. Invalidate Next.js caches
  revalidatePath('/resource');        // List page
  revalidatePath('/dashboard');       // Dashboard (if shows data)
  revalidatePath(`/resource/${id}`);  // Detail page (if applicable)

  return Response.json({ success: true });
}
```

### Component Pattern
```typescript
'use client';
import { useRouter } from 'next/navigation';

export function ResourceComponent() {
  const router = useRouter();

  const handleDelete = async () => {
    const response = await fetch(`/api/resource/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // ✅ DO THIS: Remove window.location.reload() entirely
      // API route already called revalidatePath()
      // Next.js will auto-refresh the data

      // ONLY if navigating to a different page:
      // router.push('/resource');
    }
  };
}
```

**Key insight from commit 46b475f:**
> "Removed unnecessary router.refresh() calls from invoice-card"
> Comment: "No need for router.refresh() - API route handles revalidatePath()"

---

## Complete Audit

### Remaining Hard Navigation Instances

| File | Line | Operation | Type |
|------|------|-----------|------|
| `library-list.tsx` | 411 | DELETE (bulk) | window.location.reload() |
| `recommendations-list.tsx` | 129 | DELETE | window.location.reload() |
| `recommendations-list.tsx` | 289 | Navigation (edit) | window.location.href |
| `manage-lessons.tsx` | 209 | DELETE (single) | window.location.reload() |
| `manage-lessons.tsx` | 247 | DELETE (bulk) | window.location.reload() |
| `manage-students.tsx` | 107 | DELETE | window.location.reload() |
| `manage-students.tsx` | 235 | UPDATE (PUT) | window.location.reload() |
| `manage-students.tsx` | 270 | TOGGLE (POST) | window.location.reload() |
| `manage-teachers.tsx` | 92 | TOGGLE (POST) | window.location.reload() |
| `manage-teachers.tsx` | 132 | DELETE | window.location.reload() |
| `lesson-list.tsx` | 354 | Error recovery | window.location.reload() ✅ KEEP |

**Total:** 10 instances to fix, 1 acceptable to keep

---

## Tasks

### Task 1: API Route Updates (9 routes)

Add `revalidatePath()` calls to mutation endpoints following the established pattern.

#### 1.1 Library API
**File:** `app/api/library/[id]/route.ts`
**Method:** DELETE
**After line 53** (after `await prisma.libraryItem.delete()`):
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/library');
revalidatePath('/dashboard');
```

#### 1.2 Recommendations API
**File:** `app/api/recommendations/[id]/route.ts`
**Method:** DELETE (line 135-169)
**After line 166** (after `await prisma.recommendation.delete()`):
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/recommendations');
revalidatePath('/dashboard');
```

#### 1.3 Admin Lessons API
**File:** `app/api/admin/lessons/[id]/route.ts`
**Method:** DELETE (line 14-79)
**After line 60** (after `await prisma.lesson.delete()`):
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/lessons');
revalidatePath('/dashboard');
```

#### 1.4 Admin Lessons Bulk Delete API
**File:** `app/api/admin/lessons/bulk-delete/route.ts`
**Method:** POST
**After deletion loop:**
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/lessons');
revalidatePath('/dashboard');
```

#### 1.5 Admin Students API (DELETE)
**File:** `app/api/admin/students/[id]/route.ts`
**Method:** DELETE (line 14-177)
**After line 148** (after transaction completes):
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/students');
revalidatePath('/dashboard');
```

#### 1.6 Admin Students Toggle API
**File:** `app/api/admin/students/[id]/toggle/route.ts`
**Method:** POST
**After toggle update:**
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/students');
```

#### 1.7 Students API (UPDATE)
**File:** `app/api/students/[id]/route.ts`
**Method:** PUT (line 164+)
**After update:**
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');        // Admin may view student list
revalidatePath('/students');     // If students can view their profile
revalidatePath('/dashboard');    // Dashboard may show student info
```

#### 1.8 Admin Teachers API (DELETE)
**File:** `app/api/admin/teachers/[id]/route.ts`
**Method:** DELETE
**After deletion:**
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/dashboard');
```

#### 1.9 Admin Teachers Toggle API
**File:** `app/api/admin/teachers/[id]/toggle/route.ts`
**Method:** POST
**After toggle update:**
```typescript
// Invalidate Next.js router & route caches for soft navigation
revalidatePath('/admin');
revalidatePath('/dashboard');
```

**Acceptance Criteria:**
- All 9 API routes have `import { revalidatePath } from 'next/cache'` at top
- All mutation handlers call appropriate revalidatePath() after DB operations
- Comments follow established pattern: "Invalidate Next.js router & route caches for soft navigation"
- No breaking changes to request/response formats

**Estimate:** 1.5 hours

---

### Task 2: Component Updates (5 files)

Remove hard navigation following the established pattern.

#### 2.1 Library List Component
**File:** `components/library/library-list.tsx`

**Changes:**
1. Add at top (if not present):
```typescript
import { useRouter } from 'next/navigation';
```

2. Add inside component (if not present):
```typescript
const router = useRouter();
```

3. **Line 411** - Remove `window.location.reload()`:
```typescript
// BEFORE:
await Promise.all(deletePromises);
window.location.reload();

// AFTER:
await Promise.all(deletePromises);
// No need for reload - API route handles revalidatePath()
// Next.js will automatically refetch the library data
```

**Scenario:** User stays on `/library` page after deletion. Auto-refresh handles data update.

#### 2.2 Recommendations List Component
**File:** `components/recommendations/recommendations-list.tsx`

**Changes:**
1. Add at top (if not present):
```typescript
import { useRouter } from 'next/navigation';
```

2. Add inside component (if not present):
```typescript
const router = useRouter();
```

3. **Line 129** - Remove `window.location.reload()`:
```typescript
// BEFORE:
if (response.ok) {
  window.location.reload();
}

// AFTER:
if (response.ok) {
  // No need for reload - API route handles revalidatePath()
  // Next.js will automatically refetch the recommendations
}
```

4. **Line 289** - Replace `window.location.href` with `router.push()`:
```typescript
// BEFORE:
onClick={() => (window.location.href = `/recommendations/${item.id}/edit`)}

// AFTER:
onClick={() => router.push(`/recommendations/${item.id}/edit`)}
```

**Scenario:** User stays on `/recommendations` page after deletion (line 129), or navigates to edit page (line 289).

#### 2.3 Admin Manage Lessons Component
**File:** `components/admin/manage-lessons.tsx`

**Changes:**
1. Add at top (if not present):
```typescript
import { useRouter } from 'next/navigation';
```

2. Add inside component (if not present):
```typescript
const router = useRouter();
```

3. **Line 209** - Remove `window.location.reload()`:
```typescript
// BEFORE:
if (response.ok) {
  toast.success("Lesson has been successfully deleted.");
  window.location.reload();
}

// AFTER:
if (response.ok) {
  toast.success("Lesson has been successfully deleted.");
  // No need for reload - API route handles revalidatePath()
}
```

4. **Line 247** - Remove `window.location.reload()`:
```typescript
// BEFORE:
setSelectedLessons(new Set());
window.location.reload();

// AFTER:
setSelectedLessons(new Set());
// No need for reload - API route handles revalidatePath()
```

**Scenario:** User stays on `/admin` page after deleting lessons.

#### 2.4 Admin Manage Students Component
**File:** `components/admin/manage-students.tsx`

**Changes:**
1. Add at top (if not present):
```typescript
import { useRouter } from 'next/navigation';
```

2. Add inside component (if not present):
```typescript
const router = useRouter();
```

3. **Line 107** - Remove `window.location.reload()` (DELETE operation):
```typescript
// BEFORE:
if (response.ok) {
  window.location.reload();
}

// AFTER:
if (response.ok) {
  // No need for reload - API route handles revalidatePath()
}
```

4. **Line 235** - Remove `window.location.reload()` (UPDATE operation):
```typescript
// BEFORE:
toast({
  title: "Success",
  description: "Student profile updated successfully",
});
window.location.reload();

// AFTER:
toast({
  title: "Success",
  description: "Student profile updated successfully",
});
// No need for reload - API route handles revalidatePath()
```

5. **Line 270** - Remove `window.location.reload()` (TOGGLE operation):
```typescript
// BEFORE:
toast.success(`Student status updated successfully.`);
window.location.reload();

// AFTER:
toast.success(`Student status updated successfully.`);
// No need for reload - API route handles revalidatePath()
```

**Scenario:** User stays on `/admin` page after all operations.

#### 2.5 Admin Manage Teachers Component
**File:** `components/admin/manage-teachers.tsx`

**Changes:**
1. Add at top (if not present):
```typescript
import { useRouter } from 'next/navigation';
```

2. Add inside component (if not present):
```typescript
const router = useRouter();
```

3. **Line 92** - Remove `window.location.reload()` (TOGGLE operation):
```typescript
// BEFORE:
if (response.ok) {
  window.location.reload();
}

// AFTER:
if (response.ok) {
  // No need for reload - API route handles revalidatePath()
}
```

4. **Line 132** - Remove `window.location.reload()` (DELETE operation):
```typescript
// BEFORE:
toast.success(`${teacherToDelete.name} has been successfully removed.`);
window.location.reload();

// AFTER:
toast.success(`${teacherToDelete.name} has been successfully removed.`);
// No need for reload - API route handles revalidatePath()
```

**Scenario:** User stays on `/admin` page after all operations.

**Acceptance Criteria:**
- All 5 components import `useRouter` from `next/navigation`
- All 5 components initialize `const router = useRouter()`
- All `window.location.reload()` calls removed (10 instances)
- All `window.location.href` assignments replaced with `router.push()` (1 instance)
- Comments explain why reload is not needed
- No `router.refresh()` calls added (following 46b475f pattern)

**Estimate:** 1.5 hours

---

### Task 3: Testing

Following the testing pattern from the archived change.

#### 3.1 Manual Testing - Per Component

**Library:**
- [ ] Delete single library item → verify item disappears without reload
- [ ] Delete multiple library items → verify items disappear without reload
- [ ] Verify no page flash/flicker
- [ ] Verify fast operation (< 300ms perceived)

**Recommendations:**
- [ ] Delete recommendation → verify it disappears without reload
- [ ] Click edit button → verify soft navigation to edit page
- [ ] Verify no page flash/flicker

**Admin - Lessons:**
- [ ] Delete single lesson → verify it disappears without reload
- [ ] Bulk delete lessons → verify they disappear without reload
- [ ] Verify lesson count updates in admin dashboard

**Admin - Students:**
- [ ] Delete student → verify removal without reload
- [ ] Update student profile → verify changes visible without reload
- [ ] Toggle student status → verify status changes without reload

**Admin - Teachers:**
- [ ] Delete teacher → verify removal without reload
- [ ] Toggle teacher status → verify status changes without reload

#### 3.2 Cross-Component Testing

- [ ] Delete lesson from admin → verify dashboard stats update
- [ ] Delete student from admin → verify dashboard updates
- [ ] Delete library item → verify dashboard storage stats update (if applicable)

#### 3.3 Performance Testing

Using Chrome DevTools Network tab:
- [ ] Verify only data fetches occur (no full page resources)
- [ ] Verify redirects happen in < 300ms
- [ ] Compare to lesson-form behavior (established baseline)

**Acceptance Criteria:**
- All operations work without full page reload
- Data updates visible immediately after operation
- No stale data displayed
- Fast, smooth UX matching lesson/checklist flows
- React component state preserved where applicable

**Estimate:** 1.5 hours

---

## Summary

### Total Work
- **API routes:** 9 files, ~1.5 hours
- **Components:** 5 files, ~1.5 hours
- **Testing:** ~1.5 hours
- **Total:** ~4.5 hours (not 3-4, accounting for edge cases)

### Critical Differences from Original Plan

| Original Plan | Corrected Plan | Why |
|---------------|----------------|-----|
| "Replace with router.refresh()" | "Remove window.location entirely" | Follows commit 46b475f pattern |
| "8 instances" | "10 instances" | Found 2 more (manage-students.tsx line 235, manage-teachers.tsx line 92) |
| "3-4 hours" | "4.5 hours" | More accurate based on 9 API routes + 5 components |
| No router import step | Add useRouter import | Critical missing step |
| "Add revalidatePath" | "Add revalidatePath with specific paths" | Defined exact path strategy |

### Revalidation Path Strategy

Following the pattern from archived change:

| Resource | Always Revalidate | Sometimes Revalidate |
|----------|------------------|---------------------|
| Library | `/library`, `/dashboard` | - |
| Recommendations | `/recommendations`, `/dashboard` | - |
| Admin Lessons | `/admin`, `/lessons`, `/dashboard` | - |
| Admin Students | `/admin`, `/students`, `/dashboard` | - |
| Admin Teachers | `/admin`, `/dashboard` | - |

**Rule:** Revalidate any page that displays or aggregates the mutated data.

### Risk Mitigation

**Bulk Delete Race Condition (library-list.tsx):**
- Multiple parallel DELETE calls each call revalidatePath('/library')
- Next.js should dedupe these automatically
- Test carefully with 5+ items selected
- If issues arise, can debounce or batch the revalidation

**Error Handling:**
- Success toasts already present in most components
- Deletion modals already handle loading states
- No additional error handling needed beyond existing patterns

---

## What Makes This Plan "Corrected"

1. ✅ **Follows archived change pattern exactly** - No invention, pure consistency
2. ✅ **Complete instance count** - All 10 hard navigations found
3. ✅ **Complete API route list** - All 9 routes documented
4. ✅ **Router import step included** - Won't crash components
5. ✅ **No router.refresh()** - Learned from commit 46b475f
6. ✅ **Defined revalidation strategy** - Specific paths for each route
7. ✅ **Accurate time estimate** - 4.5 hours, not 3-4

---

## Validation Checklist

Before marking complete:
- [ ] Zero `window.location.reload()` in admin components (except lesson-list.tsx:354 error handler)
- [ ] Zero `window.location.href` for navigation in admin components
- [ ] All 9 API routes have revalidatePath() calls
- [ ] All 5 components import and use useRouter
- [ ] All manual tests pass
- [ ] Performance matches lesson-form baseline (< 300ms)
- [ ] No regressions in existing soft navigation (lessons, checklists)

---

## After Completion

This completes the cache invalidation migration started in:
- `ecf1c7e` - Fix: Replace hard navigation with Next.js cache revalidation
- `8c4d897` - Fix: Expand cache invalidation to checklists and curriculums
- `46b475f` - Fix: complete Next.js cache invalidation for all mutation routes

Entire codebase will use consistent soft navigation with proper cache invalidation.

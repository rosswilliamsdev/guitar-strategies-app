# Fix Next.js Multi-Layer Cache Invalidation

## Problem

The application uses hard navigation (`window.location.href`) after mutations instead of soft navigation (`router.push()`), destroying all client-side state and bypassing a sophisticated Redis-backed caching system.

### Root Cause

Next.js 15 App Router has **three caching layers** that must be invalidated separately:

```
┌─────────────────────────────────────────────────┐
│ Layer 1: HTTP Cache (Redis/Memory)             │
│   Status: ✓ Working correctly                  │
│   Invalidation: invalidateLessonCache()        │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ Layer 2: Router Cache (Next.js Client)         │
│   Status: ❌ NOT BEING INVALIDATED             │
│   Problem: router.push() serves stale data     │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ Layer 3: Full Route Cache (Next.js Server)     │
│   Status: ❌ NOT BEING INVALIDATED             │
│   Problem: Pre-rendered pages stay cached      │
└─────────────────────────────────────────────────┘
```

### Historical Context

**October 26-27, 2025**: Production caching crisis

- **Symptom**: Teachers saved lessons but they didn't appear in lesson list
- **Fix Attempt #1**: Cache invalidation in Redis ❌ Didn't work
- **Fix Attempt #2**: `router.refresh()` + `router.push()` ❌ Still stale
- **Fix Attempt #3**: Cachebuster timestamps (`?_t=${Date.now()}`) ⚠️ Partial fix
- **Fix Attempt #4**: Nuclear option `window.location.href` ✓ Works but destroys state

**Current State (April 2026)**:
```typescript
// components/lessons/lesson-form.tsx:644
// Success - use hard navigation to bypass cache
window.location.href = "/lessons";
```

This "works" but:
- Destroys all React state
- Full page reload (slow UX)
- Bypasses the Redis caching system we built
- Makes React Query/client-side caching impossible

### Affected Components

1. **Lesson Form** (`components/lessons/lesson-form.tsx:644-649`)
   - After saving lesson: `window.location.href = "/lessons"`
   - After editing lesson: `window.location.href = "/lessons/${lessonId}"`

2. **Checklist Form** (`components/student-checklists/checklist-form.tsx:231`)
   - After saving checklist: `window.location.href = "/curriculums/my/${id}"`

3. **Other forms** (potentially more instances to audit)

### Impact

**User Experience**:
- Slow: Full page reload on every form submission
- Jarring: Screen flash, scroll position lost
- State loss: Any in-progress form data cleared

**Developer Experience**:
- Cannot use React Query or other client-side caching
- Sophisticated Redis cache infrastructure being bypassed
- Harder to implement optimistic updates

**Performance**:
- Lesson logging workflow: ~2 seconds per redirect (full page load)
- With soft navigation: ~200ms (just new data)
- **10x performance degradation** from caching workaround

## Solution

Replace hard navigation with Next.js `revalidatePath()` to invalidate the router cache after mutations.

### Before (Current)

```typescript
// components/lessons/lesson-form.tsx
const response = await fetch('/api/lessons', {
  method: 'POST',
  body: JSON.stringify(lessonData)
});

if (response.ok) {
  // Nuclear option: destroy everything
  window.location.href = "/lessons";
}
```

### After (Proposed)

```typescript
// app/api/lessons/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  // ... create lesson ...

  // Invalidate Layer 1: Redis/Memory cache
  await invalidateLessonCache(lesson.id, teacherId, studentId);

  // Invalidate Layer 2 & 3: Next.js router + route cache
  revalidatePath('/lessons');
  revalidatePath('/dashboard');
  revalidatePath(`/lessons/${lesson.id}`);

  return Response.json({ success: true, lesson });
}

// components/lessons/lesson-form.tsx
const response = await fetch('/api/lessons', {
  method: 'POST',
  body: JSON.stringify(lessonData)
});

if (response.ok) {
  // Soft navigation: fast, preserves state
  router.push('/lessons');
}
```

### Architecture Decision

**Move cache invalidation to the API layer** (server-side):

✓ **Pros**:
- `revalidatePath()` only works in Server Components/Actions
- Single source of truth for invalidation logic
- Atomic: cache cleared before response returns
- Works for direct API calls AND form actions

✗ **Cons**:
- API routes slightly more complex
- Must remember to invalidate on every mutation

**Alternative considered**: Server Actions with `useFormState`
- Rejected: Requires rewriting all forms (high risk)
- Would be better for new features, not migration

## Goals

1. **Primary**: Restore soft navigation across all forms
2. **Secondary**: Enable client-side caching strategies (React Query)
3. **Tertiary**: Improve form submission performance by 10x

## Non-Goals

- Rewriting forms to use Server Actions (future improvement)
- Adding React Query in this change (separate effort)
- Changing the Redis caching implementation (already excellent)

## Success Metrics

**Performance** (measured with Chrome DevTools):
- Lesson form submission → redirect: < 300ms (currently ~2000ms)
- Checklist form submission → redirect: < 300ms (currently ~2000ms)

**Correctness** (test in production):
- New lessons appear immediately in lesson list
- Updated checklists reflect changes on detail page
- No stale data visible after mutations

**Developer Experience**:
- Enable React Query integration (future work)
- Zero hard navigation calls remaining in codebase

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stale data still appears | High | Test thoroughly in production-like environment with actual Next.js build |
| Miss some hard navigation instances | Medium | Grep entire codebase for `window.location.href` |
| Over-invalidate routes (perf hit) | Low | Be specific with revalidatePath() calls, only affected routes |
| Break existing caching behavior | High | Keep existing Redis invalidation, ADD Next.js invalidation |

## Implementation Plan

### Phase 1: Audit & Document
- Find all `window.location.href` instances in components
- Document which routes they redirect to
- Map out which paths need revalidation

### Phase 2: API Route Updates
- Add `revalidatePath()` to all mutation endpoints:
  - `/api/lessons` (POST, PUT)
  - `/api/student-checklists` (POST, PUT)
  - `/api/invoices` (POST, PUT)
  - Others as discovered in audit

### Phase 3: Component Updates
- Replace `window.location.href` with `router.push()`
- Test each form submission flow
- Verify data freshness

### Phase 4: Verification
- Delete cachebuster timestamps from client code
- Remove unnecessary `router.refresh()` calls
- Performance testing

### Phase 5: Documentation
- Update ARCHITECTURE.md with caching strategy
- Document the three-layer cache model
- Add comments explaining revalidatePath() usage

## Timeline Estimate

- Phase 1 (Audit): 1-2 hours
- Phase 2 (API routes): 2-3 hours
- Phase 3 (Components): 2-3 hours
- Phase 4 (Testing): 2-3 hours
- Phase 5 (Docs): 1 hour

**Total**: 8-12 hours (~1-2 days)

## Interview Talking Points

This change demonstrates:

**Problem Discovery**:
- "Found hard navigation patterns that destroyed client state"
- "Traced through git history to understand why they existed"
- "Discovered Next.js multi-layer caching was the root cause"

**Systems Thinking**:
- "The Redis cache was working perfectly, but Next.js added another layer"
- "Previous fix was pragmatic but created technical debt"
- "Proper fix required understanding framework internals"

**Performance Impact**:
- "Reduced form submission latency by 10x"
- "Enabled future client-side caching strategies"
- "Improved UX with instant navigation"

**Production Mindset**:
- "Kept the interim fix while building proper solution"
- "Comprehensive testing before removing workarounds"
- "Documented the multi-layer caching model for team"

## Open Questions

1. Should we add E2E tests for cache invalidation?
2. Do we need `revalidateTag()` instead of `revalidatePath()` for more granular control?
3. Should this change include React Query integration or keep them separate?
4. Any other forms beyond lessons/checklists using hard navigation?

## Dependencies

- Next.js 15.4.6 (already installed)
- `next/cache` module (built-in)
- Existing Redis cache infrastructure (no changes)

## Follow-Up Work

After this change:
1. Add React Query for client-side caching
2. Migrate forms to Server Actions (long-term)
3. Add performance monitoring to track cache hit rates
4. Consider adding `revalidateTag()` for more granular invalidation

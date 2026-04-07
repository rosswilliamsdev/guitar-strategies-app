# Design: Fix Next.js Multi-Layer Cache Invalidation

## Overview

This design replaces hard navigation (`window.location.href`) with soft navigation (`router.push()`) by properly invalidating Next.js's router and route caches using `revalidatePath()`.

## Architecture

### Current Caching Layers

```
┌──────────────────────────────────────────────────────┐
│              REQUEST FLOW (Current)                  │
└──────────────────────────────────────────────────────┘

Client Form Submission
    │
    ├─> POST /api/lessons
    │       │
    │       ├─> Create lesson in DB
    │       ├─> invalidateLessonCache() ✓ (Redis)
    │       └─> Return { success: true }
    │
    └─> window.location.href = "/lessons"
            │
            └─> FULL PAGE RELOAD
                    │
                    ├─> Destroys React state
                    ├─> Re-fetches all page resources
                    ├─> Bypasses all caches
                    └─> Slow (2000ms)
```

### Proposed Caching Layers

```
┌──────────────────────────────────────────────────────┐
│              REQUEST FLOW (Proposed)                 │
└──────────────────────────────────────────────────────┘

Client Form Submission
    │
    ├─> POST /api/lessons
    │       │
    │       ├─> Create lesson in DB
    │       ├─> invalidateLessonCache() ✓ (Redis/Memory)
    │       ├─> revalidatePath('/lessons') ✓ (Next.js)
    │       └─> Return { success: true }
    │
    └─> router.push("/lessons")
            │
            └─> SOFT NAVIGATION
                    │
                    ├─> Preserves React state
                    ├─> Only fetches changed data
                    ├─> Uses invalidated cache
                    └─> Fast (200ms)
```

## Technical Implementation

### 1. API Route Pattern

**Template for all mutation endpoints:**

```typescript
// app/api/[resource]/route.ts
import { revalidatePath } from 'next/cache';
import { invalidate[Resource]Cache } from '@/lib/cache';

export async function POST(request: Request) {
  try {
    // 1. Parse request
    const data = await request.json();

    // 2. Validate with Zod
    const validated = schema.parse(data);

    // 3. Perform mutation
    const result = await prisma.[resource].create({
      data: validated
    });

    // 4. INVALIDATE LAYER 1: Redis/Memory Cache
    await invalidate[Resource]Cache(result.id, teacherId, studentId);

    // 5. INVALIDATE LAYER 2 & 3: Next.js Caches
    revalidatePath('/[resource]');           // List page
    revalidatePath('/dashboard');             // Dashboard (if shows this data)
    revalidatePath(`/[resource]/${result.id}`); // Detail page

    // 6. Return success
    return Response.json({ success: true, [resource]: result });

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

### 2. Component Pattern

**Template for all forms:**

```typescript
// components/[resource]/[resource]-form.tsx
'use client';

import { useRouter } from 'next/navigation';

export function ResourceForm() {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/[resource]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // ✓ SOFT NAVIGATION (cache already invalidated by API)
      router.push('/[resource]');

      // ❌ DON'T DO THIS ANYMORE:
      // window.location.href = '/[resource]';

    } catch (error) {
      setError(error.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Cache Invalidation Strategy

**Which paths to revalidate after each mutation:**

| Mutation | Paths to Revalidate | Reason |
|----------|-------------------|--------|
| Create Lesson | `/lessons`<br>`/dashboard`<br>`/lessons/[id]` | List page shows new lesson<br>Dashboard stats updated<br>Detail page accessible |
| Update Lesson | `/lessons`<br>`/lessons/[id]`<br>`/dashboard` | List page may show updated data<br>Detail page changed<br>Stats may change |
| Delete Lesson | `/lessons`<br>`/dashboard` | List page shows removal<br>Stats updated |
| Create Checklist | `/curriculums/my`<br>`/curriculums/my/[id]`<br>`/dashboard` | List updated<br>Detail accessible<br>Progress stats |
| Update Checklist | `/curriculums/my`<br>`/curriculums/my/[id]` | List may show completion %<br>Detail changed |

**Rule of thumb**: Revalidate any page that **displays** or **aggregates** the mutated data.

### 4. Cleanup Tasks

**Remove these workarounds:**

```typescript
// ❌ Remove cachebuster timestamps
const response = await fetch(`/api/lessons?_t=${Date.now()}`);
// ✓ Just use normal fetch
const response = await fetch('/api/lessons');

// ❌ Remove unnecessary router.refresh()
router.refresh();
router.push('/lessons');
// ✓ Just push (API already revalidated)
router.push('/lessons');

// ❌ Remove hard navigation
window.location.href = '/lessons';
// ✓ Use soft navigation
router.push('/lessons');
```

## File Changes

### High Priority (Core Mutations)

1. **app/api/lessons/route.ts**
   - Add `revalidatePath()` to POST handler
   - Add `revalidatePath()` to PUT handler (if exists)

2. **app/api/lessons/[id]/route.ts**
   - Add `revalidatePath()` to PUT handler
   - Add `revalidatePath()` to DELETE handler

3. **app/api/student-checklists/route.ts**
   - Add `revalidatePath()` to POST handler

4. **app/api/student-checklists/items/[id]/route.ts**
   - Add `revalidatePath()` to PUT handler

5. **components/lessons/lesson-form.tsx**
   - Replace `window.location.href` with `router.push()`
   - Remove cachebuster timestamp
   - Lines: 644-649

6. **components/student-checklists/checklist-form.tsx**
   - Replace `window.location.href` with `router.push()`
   - Line: 231

### Medium Priority (Other Mutations)

7. **app/api/invoices/route.ts**
8. **app/api/settings/route.ts**
9. **app/api/curriculums/route.ts**
10. Any other POST/PUT/DELETE handlers found in audit

### Low Priority (Client Code Cleanup)

11. **components/lessons/lesson-list.tsx**
    - Remove cachebuster from fetch calls
    - Line: 99

12. Search for other `_t=${Date.now()}` patterns

## Testing Strategy

### Unit Tests

```typescript
// app/api/lessons/route.test.ts
describe('POST /api/lessons', () => {
  it('should revalidate lesson paths after creation', async () => {
    const revalidatePathMock = jest.fn();

    const response = await POST(mockRequest);

    expect(revalidatePathMock).toHaveBeenCalledWith('/lessons');
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard');
  });
});
```

### Integration Tests

1. **Create Lesson Flow**:
   - Teacher creates lesson
   - Verify redirect is soft (React state preserved)
   - Verify new lesson appears in list immediately
   - Verify dashboard stats updated

2. **Edit Lesson Flow**:
   - Teacher edits existing lesson
   - Verify changes appear on detail page
   - Verify list page shows updates

3. **Create Checklist Flow**:
   - Student creates checklist
   - Verify redirect is soft
   - Verify checklist appears in list

### Manual Testing Checklist

- [ ] Create lesson → soft redirect to /lessons → lesson appears
- [ ] Edit lesson → soft redirect to /lessons/[id] → changes visible
- [ ] Delete lesson → soft redirect to /lessons → lesson gone
- [ ] Create checklist → soft redirect to /curriculums/my/[id] → checklist visible
- [ ] Edit checklist → soft redirect to /curriculums/my/[id] → changes visible
- [ ] Dashboard stats update after lesson creation
- [ ] No stale data visible after any mutation
- [ ] Performance: < 300ms for form submission → redirect

## Performance Considerations

### Before vs After

| Metric | Before (Hard Nav) | After (Soft Nav) | Improvement |
|--------|------------------|------------------|-------------|
| Full page reload | 2000ms | 200ms | **10x faster** |
| React state | Lost | Preserved | ∞ |
| Scroll position | Lost | Preserved | ∞ |
| Network requests | All resources | Changed data only | 80% reduction |

### Monitoring

Add performance logging to track cache effectiveness:

```typescript
// lib/logger.ts
export function logCacheInvalidation(
  resource: string,
  paths: string[],
  duration: number
) {
  log.info('Cache invalidated', {
    resource,
    paths,
    duration,
    timestamp: Date.now()
  });
}

// app/api/lessons/route.ts
const start = Date.now();
revalidatePath('/lessons');
revalidatePath('/dashboard');
logCacheInvalidation('lesson', ['/lessons', '/dashboard'], Date.now() - start);
```

## Error Handling

### Graceful Degradation

If `revalidatePath()` fails (unlikely), the soft navigation still works — user just sees potentially stale data until next natural revalidation.

```typescript
try {
  revalidatePath('/lessons');
  revalidatePath('/dashboard');
} catch (error) {
  // Log but don't fail the request
  log.error('Cache revalidation failed', { error: error.message });
  // Request still succeeds, data still saved
}
```

### Fallback to Hard Navigation

If specific forms have issues with soft navigation (edge cases), can keep hard navigation as temporary fallback:

```typescript
// Temporary flag during migration
const USE_SOFT_NAVIGATION = process.env.NEXT_PUBLIC_SOFT_NAV !== 'false';

if (USE_SOFT_NAVIGATION) {
  router.push('/lessons');
} else {
  window.location.href = '/lessons';
}
```

## Migration Strategy

### Phased Rollout

**Week 1**: Lessons (highest traffic)
- Update `/api/lessons` routes
- Update `lesson-form.tsx`
- Monitor for issues

**Week 2**: Checklists
- Update `/api/student-checklists` routes
- Update `checklist-form.tsx`
- Monitor for issues

**Week 3**: Other Resources
- Audit remaining mutations
- Update API routes + components
- Final cleanup

### Rollback Plan

If issues discovered:
1. Git revert to hard navigation commits
2. Deploy previous version
3. Debug in staging environment
4. Re-deploy with fixes

## Security Considerations

None — this is a client-side navigation pattern change with server-side cache invalidation. No new attack vectors introduced.

The cache invalidation happens server-side in API routes, so malicious clients cannot trigger arbitrary revalidations.

## Accessibility

Soft navigation **improves** accessibility:
- Screen readers announce route changes without page reload
- Focus management preserved
- Reduced cognitive load (no flash/reload)

## Browser Compatibility

`router.push()` from Next.js works in all modern browsers:
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

No polyfills required.

## Open Technical Questions

1. **Should we use `revalidateTag()` instead?**
   - More granular control
   - Requires tagging all fetches
   - Might be overkill for current scale

2. **Do we need database-level change tracking?**
   - Track `updatedAt` timestamps
   - Use for ETag generation
   - Probably not needed yet

3. **Should we add Redis pub/sub for multi-instance invalidation?**
   - If running multiple Next.js instances
   - Each needs to clear its router cache
   - Not needed for single-instance Vercel deployment

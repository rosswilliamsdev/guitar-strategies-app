# Tasks: Fix Next.js Multi-Layer Cache Invalidation

## Phase 1: Audit & Discovery

### Task 1.1: Audit all hard navigation instances
- [x] Search codebase for `window.location.href` patterns
- [x] Search codebase for `window.location.replace()` patterns
- [x] Document each instance with:
  - File path and line number
  - What mutation triggers it
  - Where it redirects to
  - Which data needs revalidation
- [x] Create spreadsheet/table of findings

**Acceptance Criteria**:
- Complete list of all hard navigation calls
- Understanding of redirect destinations
- Map of cache invalidation requirements

**Estimate**: 1 hour

---

### Task 1.2: Audit all API mutation endpoints
- [x] List all API routes with POST/PUT/DELETE handlers
- [x] Check which ones already call `invalidate*Cache()` functions
- [x] Check which ones are missing cache invalidation
- [x] Document expected `revalidatePath()` calls for each

**Files to check**:
- `app/api/lessons/route.ts`
- `app/api/lessons/[id]/route.ts`
- `app/api/student-checklists/route.ts`
- `app/api/student-checklists/items/[id]/route.ts`
- `app/api/invoices/route.ts`
- `app/api/settings/*/route.ts`
- `app/api/curriculums/route.ts`
- Others discovered in grep

**Acceptance Criteria**:
- Complete list of mutation endpoints
- Documentation of current cache invalidation
- Plan for `revalidatePath()` additions

**Estimate**: 1-2 hours

---

## Phase 2: API Route Updates

### Task 2.1: Update lessons API routes
- [x] Add `import { revalidatePath } from 'next/cache'` to route files
- [x] Update `POST /api/lessons` handler:
  - [x] Add `revalidatePath('/lessons')` after creation
  - [x] Add `revalidatePath('/dashboard')`
  - [x] Keep existing `invalidateLessonCache()` call
- [x] Update `PUT /api/lessons/[id]` handler:
  - [x] Add `revalidatePath('/lessons')`
  - [x] Add `revalidatePath('/dashboard')`
  - [x] Add `revalidatePath(\`/lessons/${id}\`)`
- [x] Update `DELETE /api/lessons/[id]` handler (if exists):
  - [x] Add `revalidatePath('/lessons')`
  - [x] Add `revalidatePath('/dashboard')`
- [ ] Add structured logging for cache revalidations
- [x] Test API route with Postman/curl

**Files**:
- `app/api/lessons/route.ts`
- `app/api/lessons/[id]/route.ts`

**Acceptance Criteria**:
- All lesson mutations revalidate appropriate paths
- Logging shows revalidation activity
- API tests pass

**Estimate**: 1 hour

---

### Task 2.2: Update student checklists API routes
- [x] Update `POST /api/student-checklists` handler:
  - [x] Add `revalidatePath('/curriculums/my')`
  - [x] Add `revalidatePath('/dashboard')`
- [x] Update `PUT /api/student-checklists/items/[id]` handler:
  - [x] Add `revalidatePath('/curriculums/my')`
  - [x] Add `revalidatePath(\`/curriculums/my/${checklistId}\`)`
- [x] Test with Postman/curl

**Files**:
- `app/api/student-checklists/route.ts`
- `app/api/student-checklists/items/[id]/route.ts`

**Acceptance Criteria**:
- Checklist mutations revalidate appropriate paths
- API tests pass

**Estimate**: 45 minutes

---

### Task 2.3: Update other mutation API routes
- [x] Update invoice routes (if they exist)
- [x] Update curriculum routes (if they exist)
- [x] Update settings routes (if they exist)
- [x] Any other routes discovered in audit (Task 1.2)

**Acceptance Criteria**:
- All mutation endpoints have `revalidatePath()` calls
- No mutation endpoint missing cache invalidation

**Estimate**: 1-2 hours (depends on audit findings)

---

## Phase 3: Component Updates

### Task 3.1: Update lesson form component
- [x] Replace hard navigation with soft navigation:
  ```typescript
  // Before:
  window.location.href = "/lessons";

  // After:
  router.push("/lessons");
  ```
- [x] Update both success paths:
  - [x] After creating new lesson
  - [x] After editing existing lesson
- [x] Remove unnecessary `router.refresh()` calls (if present)
- [x] Test manually:
  - [x] Create lesson → verify redirect is instant
  - [x] Edit lesson → verify redirect is instant
  - [x] Verify lesson appears in list immediately
  - [x] Verify React state preserved (no flash/reload)

**File**:
- `components/lessons/lesson-form.tsx` (lines 644-649)

**Acceptance Criteria**:
- No `window.location.href` in lesson form
- Soft navigation works
- New lessons appear immediately
- Fast redirect (< 300ms)

**Estimate**: 30 minutes

---

### Task 3.2: Update checklist form component
- [x] Replace hard navigation with soft navigation
- [x] Test manually:
  - [x] Create checklist → soft redirect works
  - [x] Edit checklist → soft redirect works
  - [x] Changes visible immediately

**File**:
- `components/student-checklists/checklist-form.tsx` (line 231)

**Acceptance Criteria**:
- No `window.location.href` in checklist form
- Soft navigation works
- Changes visible immediately

**Estimate**: 30 minutes

---

### Task 3.3: Update remaining form components
- [x] Update each component found in audit (Task 1.1)
- [x] Replace hard navigation with soft navigation
- [x] Test each form manually

**Acceptance Criteria**:
- Zero `window.location.href` calls remaining in component files
- All forms use soft navigation
- All redirects work correctly

**Estimate**: 1-2 hours (depends on audit findings)

---

## Phase 4: Cleanup & Verification

### Task 4.1: Remove cachebuster timestamps
- [x] Search for `_t=${Date.now()}` pattern
- [x] Remove from fetch calls in:
  - [x] `components/lessons/lesson-list.tsx` (line 99)
  - [x] Any other components found in search
- [x] Test that data still loads correctly
- [x] Verify no stale data appears

**Acceptance Criteria**:
- No cachebuster timestamps in codebase
- Data loads correctly without timestamps
- Cache invalidation working properly

**Estimate**: 30 minutes

---

### Task 4.2: Remove unnecessary router.refresh() calls
- [ ] Search for `router.refresh()` patterns
- [ ] Evaluate each instance:
  - If followed by `router.push()`, remove it
  - If standalone, check if still needed
- [ ] Test affected components

**Acceptance Criteria**:
- No unnecessary `router.refresh()` calls
- Components still work correctly

**Estimate**: 30 minutes

---

### Task 4.3: Performance testing
- [ ] Measure form submission → redirect time (Chrome DevTools):
  - [ ] Lesson form: Target < 300ms
  - [ ] Checklist form: Target < 300ms
  - [ ] Invoice form: Target < 300ms
- [ ] Compare to baseline (before changes)
- [ ] Document performance improvements
- [ ] Check Network tab:
  - [ ] Verify only new data fetched
  - [ ] Verify full resources not reloaded

**Acceptance Criteria**:
- All form redirects < 300ms
- Network requests reduced by ~80%
- Performance gains documented

**Estimate**: 1 hour

---

### Task 4.4: Manual testing - complete workflow
- [ ] **Teacher Lesson Flow**:
  - [ ] Log new lesson for Student A
  - [ ] Verify redirect is fast/smooth
  - [ ] Verify lesson appears in list immediately
  - [ ] Check dashboard stats updated
  - [ ] Edit the lesson
  - [ ] Verify changes visible on detail page
  - [ ] Verify changes visible in list
  - [ ] Log another lesson for Student B
  - [ ] Verify both lessons visible
- [ ] **Student Checklist Flow**:
  - [ ] Create new checklist
  - [ ] Verify redirect is fast/smooth
  - [ ] Verify checklist appears in list
  - [ ] Edit checklist (add items)
  - [ ] Verify changes appear immediately
  - [ ] Complete checklist items
  - [ ] Verify completion status updates
- [ ] **Invoice Flow** (if applicable):
  - [ ] Create invoice
  - [ ] Verify redirect works
  - [ ] Verify invoice in list
  - [ ] Edit invoice
  - [ ] Verify changes visible

**Acceptance Criteria**:
- All workflows work end-to-end
- No stale data at any point
- Fast, smooth redirects throughout
- React state preserved where expected

**Estimate**: 1-2 hours

---

## Phase 5: Documentation

### Task 5.1: Update ARCHITECTURE.md
- [ ] Create or update `ARCHITECTURE.md` file
- [ ] Document the three-layer caching model:
  - Layer 1: Redis/Memory cache
  - Layer 2: Next.js Router cache
  - Layer 3: Next.js Full Route cache
- [ ] Explain invalidation strategy
- [ ] Provide code examples
- [ ] Explain when to use `revalidatePath()` vs `revalidateTag()`

**File**:
- `ARCHITECTURE.md` or `docs/caching.md`

**Acceptance Criteria**:
- Clear documentation of caching architecture
- Examples for future developers
- Explains the October 2025 issue and solution

**Estimate**: 1 hour

---

### Task 5.2: Add code comments
- [ ] Add explanatory comments to API routes:
  ```typescript
  // Invalidate Next.js router & route caches so soft navigation
  // shows fresh data without requiring window.location.href
  revalidatePath('/lessons');
  ```
- [ ] Add comments to form components:
  ```typescript
  // Use soft navigation - API route already revalidated caches
  router.push('/lessons');
  ```

**Acceptance Criteria**:
- Key code sections have clear comments
- Future developers understand why revalidatePath() is used

**Estimate**: 30 minutes

---

### Task 5.3: Update CLAUDE.md
- [ ] Add section on caching strategy
- [ ] Update "Performance Considerations" section
- [ ] Document the soft navigation pattern
- [ ] Add interview talking points about this fix

**File**:
- `CLAUDE.md`

**Acceptance Criteria**:
- CLAUDE.md reflects new caching approach
- Future AI assistance aware of pattern

**Estimate**: 30 minutes

---

## Phase 6: Deployment & Monitoring

### Task 6.1: Deploy to staging
- [ ] Deploy to staging environment
- [ ] Run full manual test suite
- [ ] Check for any production-specific caching issues
- [ ] Monitor logs for errors

**Acceptance Criteria**:
- Staging deployment successful
- All tests pass in staging
- No errors in logs

**Estimate**: 1 hour

---

### Task 6.2: Deploy to production
- [ ] Deploy to production
- [ ] Monitor for first 24 hours:
  - [ ] Check error logs
  - [ ] Watch for stale data reports
  - [ ] Monitor performance metrics
  - [ ] Check user feedback
- [ ] Have rollback plan ready

**Acceptance Criteria**:
- Production deployment successful
- No increase in error rates
- No user reports of stale data
- Performance improvements visible

**Estimate**: 2 hours (including monitoring)

---

### Task 6.3: Add monitoring/alerts
- [ ] Add logging for cache invalidation performance
- [ ] Create dashboard for cache hit/miss rates (optional)
- [ ] Set up alerts for cache-related errors (optional)

**Acceptance Criteria**:
- Visibility into caching behavior
- Ability to detect issues early

**Estimate**: 1-2 hours (optional)

---

## Summary

**Total Estimated Time**: 12-18 hours

**Critical Path**:
1. Phase 1 (Audit) → 2-3 hours
2. Phase 2 (API routes) → 3-4 hours
3. Phase 3 (Components) → 2-3 hours
4. Phase 4 (Testing) → 3-4 hours
5. Phase 5 (Docs) → 2 hours

**Risk Areas**:
- Discovery of many hard navigation instances (Task 1.1)
- Discovery of many mutation endpoints (Task 1.2)
- Edge cases in production caching behavior (Task 6.1)

**Quick Wins**:
- Task 2.1 + Task 3.1 alone fixes 80% of the problem (lesson forms)
- Can ship incrementally (lessons first, then checklists, etc.)

# Cache Invalidation Testing Checklist

## Overview

This checklist verifies that all hard navigation has been replaced with soft navigation using Next.js cache revalidation. All operations should update data **without full page reloads**.

**Expected Behavior:**
- ✅ No page flash/flicker after operations
- ✅ Data updates appear immediately
- ✅ React component state preserved where applicable
- ✅ Operations complete in < 300ms (perceived)
- ✅ No full resource reload in Network tab

---

## Pre-Testing Setup

- [ ] Start development server: `npm run dev`
- [ ] Open Chrome DevTools (F12)
- [ ] Go to **Network** tab
- [ ] Filter by **Doc** to see full page loads
- [ ] Enable **Disable cache** checkbox for accurate testing

---

## 1. Library Management (Teacher)

**Login as:** `teacher@guitarstrategies.com` / `Admin123!`

**Navigate to:** `/library`

### Test 1.1: Single File Delete
- [ ] Upload a test file (or use existing)
- [ ] Click delete icon on a single file
- [ ] Confirm deletion in modal
- [ ] **Verify:** File disappears from list immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** No page flash/flicker
- [ ] **Verify:** Operation feels fast (< 300ms)

### Test 1.2: Bulk File Delete
- [ ] Upload 3-5 test files
- [ ] Select multiple files using checkboxes
- [ ] Click "Delete Selected" button
- [ ] Confirm bulk deletion in modal
- [ ] **Verify:** All selected files disappear immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Selection state clears properly

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 2. Recommendations Management (Teacher)

**Login as:** `teacher@guitarstrategies.com` / `Admin123!`

**Navigate to:** `/recommendations`

### Test 2.1: Delete Recommendation
- [ ] Create a test recommendation (or use existing)
- [ ] Click delete icon
- [ ] Confirm deletion in modal
- [ ] **Verify:** Recommendation disappears immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** No page flash/flicker

### Test 2.2: Navigate to Edit Page
- [ ] Click "Edit" button on a recommendation
- [ ] **Verify:** Soft navigation to `/recommendations/[id]/edit`
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** URL changes smoothly without flash
- [ ] **Verify:** Back button works correctly

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 3. Admin - Lessons Management

**Login as:** `admin@guitarstrategies.com` / `Admin123!`

**Navigate to:** `/admin` → Platform Activity tab → Lessons section

### Test 3.1: Single Lesson Delete
- [ ] Locate a test lesson in the list
- [ ] Click delete icon
- [ ] Confirm deletion in modal
- [ ] **Verify:** Toast notification appears ("Lesson has been successfully deleted")
- [ ] **Verify:** Lesson disappears from list immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Lesson count updates if visible

### Test 3.2: Bulk Lesson Delete
- [ ] Select 2-3 lessons using checkboxes
- [ ] Click "Delete Selected" button (appears when items selected)
- [ ] Confirm bulk deletion in modal
- [ ] **Verify:** Toast notification shows count ("X lesson(s) have been successfully deleted")
- [ ] **Verify:** All selected lessons disappear immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Selection state clears

### Test 3.3: Cross-Component Update
- [ ] Note the lesson count in dashboard (if visible)
- [ ] Delete a lesson from admin panel
- [ ] Navigate to `/dashboard`
- [ ] **Verify:** Dashboard stats reflect the deletion
- [ ] **Verify:** No stale data visible

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 4. Admin - Students Management

**Login as:** `admin@guitarstrategies.com` / `Admin123!`

**Navigate to:** `/admin` → Platform Activity tab → Students section

### Test 4.1: Toggle Student Status
- [ ] Locate a student in the list
- [ ] Click the toggle switch (Active/Inactive)
- [ ] **Verify:** Status changes immediately (badge color updates)
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Switch position updates instantly

### Test 4.2: Edit Student Profile
- [ ] Click "View Details" on a student
- [ ] Click "Edit" button in modal
- [ ] Change student name or email
- [ ] Click "Save Changes"
- [ ] **Verify:** Toast notification appears ("Student profile updated successfully")
- [ ] **Verify:** Modal updates with new data immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Modal remains open (doesn't close unexpectedly)

### Test 4.3: Delete Student
- [ ] Click "View Details" on a test student
- [ ] Click "Delete Student" button
- [ ] Confirm deletion in modal
- [ ] **Verify:** Toast notification appears ("Student has been successfully removed")
- [ ] **Verify:** Student disappears from list immediately
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Details modal closes automatically

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 5. Admin - Teachers Management

**Login as:** `admin@guitarstrategies.com` / `Admin123!`

**Navigate to:** `/admin` → Platform Activity tab → Teachers section

### Test 5.1: Toggle Teacher Status
- [ ] Locate a teacher in the list
- [ ] Click the toggle switch (Active/Inactive)
- [ ] **Verify:** Status changes immediately (badge color updates)
- [ ] **Verify:** No full page reload in Network tab
- [ ] **Verify:** Switch position updates instantly

### Test 5.2: Delete Teacher (with no active students)
- [ ] Ensure teacher has no active students (or create test teacher)
- [ ] Click delete icon
- [ ] Confirm deletion in modal
- [ ] **Verify:** Toast notification appears ("Teacher has been successfully removed")
- [ ] **Verify:** Teacher disappears from list immediately
- [ ] **Verify:** No full page reload in Network tab

### Test 5.3: Delete Teacher (with active students - should fail)
- [ ] Locate a teacher with active students
- [ ] Click delete icon
- [ ] Confirm deletion attempt
- [ ] **Verify:** Error message appears ("Cannot delete teacher with active students")
- [ ] **Verify:** Teacher remains in list
- [ ] **Verify:** No full page reload

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 6. Performance Testing

Use Chrome DevTools Performance and Network tabs.

### Test 6.1: Operation Speed
For each operation type (delete, toggle, update):
- [ ] Open DevTools Network tab
- [ ] Perform the operation
- [ ] Check the timing of the DELETE/POST/PUT request
- [ ] **Verify:** Request completes in < 500ms
- [ ] **Verify:** UI updates in < 300ms perceived time
- [ ] **Verify:** No secondary requests triggered unexpectedly

### Test 6.2: Network Requests
For each operation:
- [ ] Open Network tab with "Doc" filter
- [ ] Perform operation (delete, update, toggle)
- [ ] **Verify:** NO full document requests appear
- [ ] **Verify:** Only API route requests (fetch/XHR) are made
- [ ] **Verify:** No unnecessary resource reloads (CSS, JS, images)

### Test 6.3: Bulk Operations Race Condition
**Library bulk delete stress test:**
- [ ] Select 10+ files in library
- [ ] Click "Delete Selected"
- [ ] Confirm deletion
- [ ] Watch Network tab closely
- [ ] **Verify:** Multiple parallel DELETE requests fire
- [ ] **Verify:** All files disappear when complete
- [ ] **Verify:** No errors in console
- [ ] **Verify:** revalidatePath() deduplication works (no visible issues)

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 7. Edge Cases & Error Handling

### Test 7.1: Network Error During Delete
- [ ] Open DevTools Network tab
- [ ] Set throttling to "Slow 3G" or "Offline"
- [ ] Attempt to delete a file/recommendation/lesson
- [ ] **Verify:** Error toast appears (not a full page crash)
- [ ] **Verify:** Item remains in list (operation failed gracefully)
- [ ] **Verify:** No partial state corruption

### Test 7.2: Rapid Sequential Operations
- [ ] Delete a library item
- [ ] Immediately delete another item (don't wait for UI update)
- [ ] Repeat 3-4 times quickly
- [ ] **Verify:** All operations complete successfully
- [ ] **Verify:** UI eventually settles to correct state
- [ ] **Verify:** No race condition errors in console

### Test 7.3: Browser Back Button
- [ ] Perform a delete operation (any type)
- [ ] Click browser back button
- [ ] **Verify:** Navigation works correctly
- [ ] **Verify:** Deleted item still gone (cache invalidation persists)
- [ ] **Verify:** No stale data appears

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 8. Cross-Component Cache Invalidation

These tests verify that revalidatePath() correctly invalidates caches across multiple pages.

### Test 8.1: Library → Dashboard
- [ ] Note current library stats on dashboard (if visible)
- [ ] Navigate to `/library`
- [ ] Delete a file
- [ ] Navigate to `/dashboard`
- [ ] **Verify:** Dashboard reflects updated library stats

### Test 8.2: Admin Lessons → Lessons Page
- [ ] Navigate to `/lessons` as teacher
- [ ] Note lesson count
- [ ] Navigate to `/admin`
- [ ] Delete a lesson as admin
- [ ] Navigate back to `/lessons`
- [ ] **Verify:** Deleted lesson is not in list
- [ ] **Verify:** No stale data visible

### Test 8.3: Admin Students → Dashboard
- [ ] View dashboard stats
- [ ] Navigate to `/admin`
- [ ] Delete a student or toggle status
- [ ] Navigate back to `/dashboard`
- [ ] **Verify:** Dashboard reflects changes (student count, active count)

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 9. Comparison with Baseline (Lessons)

**This verifies consistency with the already-fixed lesson forms.**

### Test 9.1: Lesson Form Behavior (Baseline)
- [ ] Navigate to `/lessons/new`
- [ ] Create a new lesson
- [ ] **Observe:** Soft redirect to `/lessons`
- [ ] **Observe:** No page flash
- [ ] **Observe:** Lesson appears immediately

### Test 9.2: Library Behavior (Should Match)
- [ ] Delete a library item
- [ ] **Compare:** Same behavior as lesson form?
- [ ] **Verify:** Similar speed and smoothness
- [ ] **Verify:** Consistent user experience

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## 10. Regression Testing

**Verify that existing functionality still works.**

### Test 10.1: Lesson Error Handler (KEPT window.location.reload)
- [ ] Navigate to `/lessons`
- [ ] Trigger an error (simulate by disconnecting network mid-load)
- [ ] Click "Try Again" button in error state
- [ ] **Verify:** Page reloads (this is the ONLY acceptable window.location.reload)
- [ ] **Verify:** Error handler still functional

### Test 10.2: Existing Lesson/Checklist Flows
- [ ] Create a new lesson (existing flow)
- [ ] **Verify:** Still works with soft navigation
- [ ] Create a new checklist (existing flow)
- [ ] **Verify:** Still works with soft navigation
- [ ] **Verify:** No regressions introduced

**Status:** ⬜ Pass / ⬜ Fail / ⬜ Not Tested

---

## Testing Summary

| Section | Status | Notes |
|---------|--------|-------|
| 1. Library Management | ⬜ | |
| 2. Recommendations | ⬜ | |
| 3. Admin Lessons | ⬜ | |
| 4. Admin Students | ⬜ | |
| 5. Admin Teachers | ⬜ | |
| 6. Performance | ⬜ | |
| 7. Edge Cases | ⬜ | |
| 8. Cross-Component | ⬜ | |
| 9. Baseline Comparison | ⬜ | |
| 10. Regression | ⬜ | |

---

## Issues Found

Document any issues discovered during testing:

### Issue Template
```
**Issue #:**
**Component:** (e.g., Library delete, Admin student toggle)
**Severity:** (Critical / High / Medium / Low)
**Description:**
**Steps to Reproduce:**
1.
2.
3.
**Expected:**
**Actual:**
**Console Errors:**
**Network Tab:**
```

---

## Final Validation

After all tests pass:

- [ ] Verify zero `window.location.reload()` in all 5 components (except lesson-list.tsx:354 error handler)
- [ ] Verify zero `window.location.href` assignments in all 5 components
- [ ] Verify all 9 API routes have `revalidatePath()` calls
- [ ] Verify all 5 components import and use `useRouter`
- [ ] Verify no TypeScript errors: `npm run build`
- [ ] Verify no console errors during any operation
- [ ] Verify consistent behavior across all operations

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Build/Commit:** ___________________
**Status:** ⬜ All Tests Pass / ⬜ Issues Found (see above)

**Notes:**

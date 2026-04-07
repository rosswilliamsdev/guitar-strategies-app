# Tasks: Folder-Based Library Organization

## Phase 1: Database Schema & Migration

### 1.1 Create LibraryFolder Model
- [ ] Add `LibraryFolder` model to Prisma schema
  - Fields: id, teacherId, name, parentId, path, sortOrder, timestamps
  - Relations: teacher, parent (self-ref), children, files
  - Indexes: teacherId, parentId, path, composite indexes
- [ ] Add `folderId` field to `LibraryItem` model
  - Nullable field (null = root level)
  - Relation to `LibraryFolder` with `onDelete: SetNull`
  - Index on folderId
- [ ] Generate Prisma migration
- [ ] Run migration on development database
- [ ] Verify schema in Prisma Studio

### 1.2 Update TypeScript Types
- [ ] Add `LibraryFolder` type to `types/index.ts`
- [ ] Add folder-related API types (FolderCreateInput, FolderUpdateInput, etc.)
- [ ] Update existing `LibraryItem` type to include optional folderId

---

## Phase 2: Folder Management API

### 2.1 Create Folder Endpoints
- [ ] Create `/api/library/folders/route.ts`
  - GET: List folders for teacher (with parentId filter)
  - POST: Create new folder with path calculation
- [ ] Create `/api/library/folders/[id]/route.ts`
  - GET: Get single folder details
  - PATCH: Rename folder (recalculate paths)
  - DELETE: Recursive folder deletion
- [ ] Add folder validation utilities
  - Name validation (required, no `/`, max 100 chars)
  - Unique name within parent check
  - Teacher ownership verification
- [ ] Add path calculation utility
  - `calculatePath(parentId, name)` → materialized path string
  - `recalculatePaths(folderId)` → update folder + all descendants

### 2.2 Enhanced File Upload API
- [ ] Update `POST /api/library` to accept folderId
  - Validate folderId exists and teacher owns it
  - Default to null (root) if not provided
  - Update file creation to include folderId
- [ ] Update `GET /api/library` to support folder filtering
  - Add `?folderId=xyz` query param
  - Return files in specific folder (null = root)
  - Include folder count aggregates

### 2.3 Search API
- [ ] Create `/api/library/search/route.ts`
  - Global search across all files (ignore folders)
  - Include folder path in results
  - Relevance-based sorting
  - Minimum 2 character query validation

---

## Phase 3: UI Components

### 3.1 Breadcrumb Navigation
- [ ] Create `components/library/breadcrumb-nav.tsx`
  - Parse folder path into breadcrumb segments
  - Render clickable breadcrumb trail
  - Navigate to any parent folder on click
  - Show "Library" for root level
  - Responsive: Scroll horizontally on mobile if too long

### 3.2 Folder Create Modal
- [ ] Create `components/library/folder-create-modal.tsx`
  - Modal with folder name input
  - Validation: required, no `/`, unique name check
  - Submit creates folder in current location
  - Auto-focus input on open
  - Close on success, show error on failure

### 3.3 Enhanced Library List
- [ ] Update `components/library/library-list.tsx`
  - Accept both `folders` and `files` props
  - Render folders first (📁 icon, folder name)
  - Render files after folders (existing file rendering)
  - Double-click folder navigates into it
  - Double-click file opens preview (existing)
  - Selection works across both types
  - Sort: folders alphabetically, then files alphabetically

### 3.4 Search Component
- [ ] Create `components/library/search-box.tsx`
  - Input with debounced onChange (300ms)
  - Clear button (X icon)
  - Escape key clears search
  - Loading state while searching
- [ ] Create `components/library/search-results.tsx`
  - Display search results with folder paths
  - Click folder path → navigate to that folder
  - Click file → preview modal
  - Empty state for no results

### 3.5 Folder Action Menu
- [ ] Create `components/library/folder-context-menu.tsx` (or use existing dropdown)
  - Rename folder action
  - Delete folder action
  - Appears on right-click or action button
  - Mobile: Long-press or action button

---

## Phase 4: Page Integration

### 4.1 Library Page Enhancement
- [ ] Update `app/(dashboard)/library/page.tsx`
  - Add `?folder=xyz` query param support
  - Fetch current folder (if param exists)
  - Fetch folders in current location
  - Fetch files in current location
  - Pass folder context to breadcrumb component
  - Pass folders + files to library list component
  - Handle search query param (optional: `?q=search`)

### 4.2 Upload Page Enhancement
- [ ] Update `app/(dashboard)/library/upload/page.tsx`
  - Accept `?folder=xyz` query param
  - Pre-select folder in form
  - Show "Uploading to: [breadcrumb path]"
  - Add folder selector dropdown (optional destination override)
  - Redirect to same folder after upload

### 4.3 Bulk Upload Enhancement
- [ ] Update `app/(dashboard)/library/bulk-upload/page.tsx`
  - Accept `?folder=xyz` query param
  - Show destination folder clearly
  - Add folder selector for batch destination
  - All files upload to selected folder

### 4.4 Navigation Actions
- [ ] Add [+ New] dropdown button to library page header
  - Options: "New Folder" | "Upload File"
  - New Folder → Opens folder create modal
  - Upload File → Navigates to upload page with folder context
- [ ] Update existing upload buttons to preserve folder context

---

## Phase 5: Deletion & Cleanup

### 5.1 Folder Deletion Flow
- [ ] Create deletion confirmation modal
  - Show folder name(s)
  - Show count of files in folder (recursive)
  - Show count of subfolders (recursive)
  - Warning: "Files will be moved to Library root"
  - Confirm button: "Delete X folders"
- [ ] Implement recursive folder deletion
  - Find all descendant folders (path LIKE '/parent/%')
  - Update all files to folderId = null (cascade handles this)
  - Delete all descendant folders
  - Delete target folder(s)
  - Return deletion summary (folders deleted, files moved)

### 5.2 File Deletion (Existing Enhancement)
- [ ] Update file deletion to work within folders
  - Files can be deleted from any folder view
  - After deletion, stay in current folder (don't navigate)

---

## Phase 6: Polish & UX

### 6.1 Empty States
- [ ] Library empty state (no folders, no files)
  - Helpful message: "Create folders to organize your library"
  - [+ Create First Folder] button
  - Suggested folder examples: "Songs", "Exercises", "Reference"
- [ ] Folder empty state (folder has no subfolders or files)
  - Message: "This folder is empty"
  - Actions: Upload file, create subfolder

### 6.2 Loading States
- [ ] Skeleton loader for folder/file list
- [ ] Loading spinner during folder navigation
- [ ] Search loading state (debounced, show spinner)

### 6.3 Error Handling
- [ ] Folder not found → Redirect to root with toast
- [ ] Folder deleted during navigation → Redirect to parent
- [ ] Duplicate folder name → Show clear validation error
- [ ] Permission errors → 403 with friendly message

### 6.4 Mobile Optimization
- [ ] Touch-friendly folder tap (single tap, not double)
- [ ] Breadcrumb horizontal scroll on mobile
- [ ] Folder context menu via long-press
- [ ] Responsive folder selector dropdown

---

## Phase 7: Testing & Validation

### 7.1 Database Testing
- [ ] Test folder creation with various names
- [ ] Test path calculation for deeply nested folders
- [ ] Test folder deletion (cascade behavior)
- [ ] Test folder rename with path recalculation
- [ ] Test file upload to folders

### 7.2 UI Testing
- [ ] Test navigation through multiple folder levels
- [ ] Test breadcrumb navigation (click any segment)
- [ ] Test search with various queries
- [ ] Test multi-select (folders + files mixed)
- [ ] Test bulk delete of multiple folders

### 7.3 Edge Case Testing
- [ ] Long folder names (truncation)
- [ ] Deep nesting (5+ levels)
- [ ] Folder with 50+ files (performance)
- [ ] Special characters in folder names
- [ ] Concurrent folder operations (two tabs)

### 7.4 Student View Testing
- [ ] Students see teacher's folder structure
- [ ] Students can navigate folders (read-only)
- [ ] Students can search and download files
- [ ] Students cannot create/delete folders

---

## Phase 8: Documentation & Deployment

### 8.1 Update Documentation
- [ ] Update CLAUDE.md with folder structure info
- [ ] Document folder API endpoints
- [ ] Document migration path (fresh start, no legacy data)

### 8.2 Deployment Preparation
- [ ] Run migration on staging database
- [ ] Test full flow on staging
- [ ] Performance test with realistic data volume
- [ ] Verify Vercel Blob integration works with folders

### 8.3 Release
- [ ] Deploy to production
- [ ] Run migration on production database
- [ ] Monitor for errors
- [ ] Gather initial teacher feedback

---

## Future Enhancements (Out of Scope for v1)

- [ ] Drag-and-drop file moving between folders
- [ ] Folder-level sharing permissions (students see only specific folders)
- [ ] Folder icons/colors for visual organization
- [ ] Zip download for entire folders
- [ ] Folder templates (pre-create suggested structure for new teachers)
- [ ] Recent files / Quick access shortcuts
- [ ] Folder size calculations (total MB in folder tree)

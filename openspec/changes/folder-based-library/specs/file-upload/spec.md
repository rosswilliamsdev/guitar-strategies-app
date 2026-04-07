# Capability: File Upload to Folders

## Overview

Teachers can upload files to specific folders, with files automatically associated with their current folder location.

## User Stories

### Upload File to Current Folder

**As a teacher**, I want to upload files to the folder I'm currently viewing so that files are organized immediately.

**Acceptance Criteria:**
- [+ New] dropdown includes "Upload File" option
- Clicking opens existing upload modal/page
- File is automatically associated with current folder
- If at root, `folderId` is null
- After upload, file appears in current folder view
- Breadcrumb context is preserved

**Context Awareness:**
- Upload modal shows: "Uploading to: Library / Songs / Blues"
- Clear visual indication of destination folder
- Teacher can cancel and navigate elsewhere if wrong location

### Upload to Different Folder

**As a teacher**, I want to select a different destination folder during upload so that I don't have to navigate first.

**Acceptance Criteria:**
- Upload modal includes folder selector dropdown
- Dropdown shows folder tree (nested with indentation)
- Default: Current folder (from breadcrumb)
- Teacher can change to any folder they own
- Selecting folder updates "Uploading to: [path]" display

**Folder Selector UI:**
```
📁 Library (root)
  📁 Songs
    📁 Blues
    📁 Jazz
  📁 Exercises
    📁 Warm-ups
```

### Bulk Upload to Folder

**As a teacher**, I want to bulk upload multiple files to a folder so that I can quickly populate a new folder.

**Acceptance Criteria:**
- Existing bulk upload page respects folder context
- URL: `/library/bulk-upload?folder=xyz`
- All files in batch upload to same folder
- Folder selector available to change destination
- Success message shows count + destination: "23 files uploaded to Songs/Blues"

### Upload from Root Level

**As a teacher**, I want to upload files to root if I'm not organizing into folders yet.

**Acceptance Criteria:**
- At root (`/library`, no folder param), upload to root works
- Files uploaded to root have `folderId = null`
- Files appear in root library view
- Teacher can move files to folders later (future feature)

## Edge Cases

### Upload While in Deep Folder

**Scenario:** Teacher is in `/library?folder=xyz` (4 levels deep), uploads file

**Behavior:**
- File uploads to that specific folder
- After upload, stays in same folder view
- File appears in list immediately
- No unexpected navigation

### Folder Deleted While Upload in Progress

**Scenario:** Teacher starts upload to folder, another tab deletes that folder

**Behavior:**
- Upload completes with `folderId = null` (SetNull cascade)
- File ends up in root
- Show warning toast: "Destination folder was deleted. File saved to Library root."

### Invalid Folder ID in URL

**Scenario:** Teacher bookmarks `/library?folder=invalid_id`

**Behavior:**
- Redirect to root (`/library`)
- Show error toast: "Folder not found"
- Upload still works (to root)

### Folder Permissions (Future-Proofing)

**Scenario:** Teacher tries to upload to folder they don't own (shouldn't be possible)

**Behavior:**
- Validate `teacherId` matches folder owner
- Return 403 Forbidden
- Clear error message: "You don't have permission to upload to this folder"

## Integration Points

### Existing Upload Flow

**Current:**
1. Teacher navigates to `/library/upload`
2. Fills form (title, description, category, file)
3. Submits to `POST /api/library`
4. Redirects to `/library`

**Enhanced:**
1. Teacher navigates to `/library/upload?folder=xyz`
2. Form pre-selects folder from query param
3. Submits to `POST /api/library` with `folderId` field
4. Redirects to `/library?folder=xyz` (same folder)

### API Changes

```typescript
// POST /api/library
// Add optional folderId field

interface UploadBody {
  title: string;
  description?: string;
  category: LibraryCategory;
  folderId?: string | null;  // NEW: null = root, undefined = root
  // ... existing fields
}

// Validation:
// - If folderId provided, verify teacher owns folder
// - If folderId invalid, reject with 400
// - If omitted, default to null (root)
```

### Bulk Upload Enhancement

**Current:**
- Upload multiple files with shared metadata
- All files use same category

**Enhanced:**
- All files uploaded to same destination folder
- Folder selector in bulk upload page
- URL param preserves context: `?folder=xyz`

## Non-Functional Requirements

### Performance

- Upload speed unchanged (folder association is cheap)
- Folder validation adds ~50ms max (single DB query)

### User Experience

- Clear visual feedback about destination folder
- No surprise uploads to wrong location
- Breadcrumb + "Uploading to:" label prevent confusion

### Mobile Experience

- Folder selector works on mobile (scrollable dropdown)
- Touch-friendly folder selection
- Breadcrumb visible during upload

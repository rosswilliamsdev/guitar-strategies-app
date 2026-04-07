# Capability: Folder Management

## Overview

Teachers can create, rename, delete, and navigate through a hierarchical folder structure to organize their resource library.

## User Stories

### Create Folder

**As a teacher**, I want to create new folders so that I can organize my library materials logically.

**Acceptance Criteria:**
- Click [+ New] button shows dropdown with "New Folder" option
- Modal prompts for folder name
- Folder is created in current location (breadcrumb context)
- New folder appears at top of folder list
- Empty folders are valid (can create structure before uploading files)

**Validation:**
- Folder name is required (1-100 characters)
- Folder name cannot contain `/` character (path separator)
- Folder name must be unique within parent folder
- Show clear error messages for validation failures

### Navigate Folders

**As a teacher**, I want to navigate through my folder structure so that I can access organized materials.

**Acceptance Criteria:**
- Double-click folder opens it (navigates into it)
- Breadcrumb shows current path (`Library / Songs / Blues`)
- Click any breadcrumb segment jumps to that level
- URL updates to reflect current folder (`/library?folder=xyz`)
- Back button works (browser history)

**Navigation States:**
- Root level: No folder query param, breadcrumb shows "Library"
- Nested level: `?folder=xyz` query param, breadcrumb shows full path
- Invalid folder ID: Redirect to root with error toast

### Rename Folder

**As a teacher**, I want to rename folders so that I can improve organization as my library evolves.

**Acceptance Criteria:**
- Right-click folder shows context menu with "Rename" option
- Modal prompts for new name (pre-filled with current name)
- Renaming updates folder and all descendant paths
- Breadcrumb updates to reflect new name
- Files in folder remain associated

**Validation:**
- Same validation as create folder
- Cannot rename to empty string
- Cannot rename to existing sibling folder name

### Delete Folder

**As a teacher**, I want to delete folders so that I can remove outdated organizational structures.

**Acceptance Criteria:**
- Select folder(s) and click [Delete] button
- Confirmation modal shows:
  - Folder name(s)
  - Count of files in folder(s)
  - Count of subfolders
  - Warning: "This action cannot be undone"
- Deletion removes folder + all subfolders recursively
- Files in deleted folders move to root level (not deleted)
- After deletion, navigate to parent folder

**Multi-Select Behavior:**
- Can select multiple folders (Cmd/Ctrl+click)
- Bulk delete shows combined counts
- All selected folders deleted in single operation

### Visual Organization

**As a teacher**, I want folders to appear organized so that I can quickly scan my library.

**Acceptance Criteria:**
- Folders always sort before files
- Folders sort alphabetically by name (case-insensitive)
- Files sort alphabetically after folders
- Folder icon (📁) visually distinct from file icons
- Empty folders show "(Empty)" badge or count: "0 items"

## Edge Cases

### Deeply Nested Folders

**Scenario:** Teacher creates very deep folder structure (5+ levels)

**Behavior:**
- No technical limit on nesting depth
- Breadcrumb may wrap on mobile (acceptable)
- UI hint if depth > 4: "Consider flattening your structure for easier navigation"

### Long Folder Names

**Scenario:** Folder name is 80+ characters

**Behavior:**
- Truncate in list view with ellipsis
- Show full name in breadcrumb (may wrap)
- Show full name on hover tooltip

### Name Conflicts

**Scenario:** Teacher tries to create "Blues" folder, but "Blues" already exists in current location

**Behavior:**
- Show error: "A folder named 'Blues' already exists here"
- Suggest alternative: "Blues (2)" or leave as-is for teacher to modify
- Do not auto-create with suffix

### Folder Deletion with Files

**Scenario:** Delete folder containing 20 files and 3 subfolders

**Behavior:**
- Confirmation modal clearly shows impact:
  - "This will delete 3 folders"
  - "23 files will be moved to Library root"
- Files preserve all metadata (tags, descriptions, etc.)
- Files remain accessible in root after deletion

## Non-Functional Requirements

### Performance

- Folder creation: < 500ms
- Navigation: < 300ms (server component re-render)
- Folder deletion: < 2s for folders with < 100 total files
- Path recalculation: Background job if > 50 descendants (unlikely)

### Accessibility

- Keyboard navigation: Arrow keys navigate folders/files, Enter opens
- Screen readers: Announce "Folder: [name], [count] items"
- Focus management: After delete, focus returns to parent folder list

### Mobile Experience

- Touch-friendly folder tap (no double-tap required on mobile)
- Breadcrumb scrolls horizontally if too long
- Context menu replaced with long-press or action buttons

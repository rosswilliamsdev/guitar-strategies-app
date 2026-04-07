# Design: Folder-Based Library Organization

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

DATABASE LAYER
══════════════
┌─────────────────┐         ┌─────────────────┐
│ LibraryFolder   │         │  LibraryItem    │
│                 │         │                 │
│ • id            │         │  • folderId ────┼───┐
│ • teacherId     │         │  • (existing)   │   │
│ • name          │         └─────────────────┘   │
│ • parentId ─────┼───┐                           │
│ • path          │   │                           │
│ • sortOrder     │   │                           │
└─────────────────┘   │                           │
         ▲            │                           │
         └────────────┘                           │
         (self-ref)                               │
                                                  │
                            ┌─────────────────────┘
                            │
                    (folder contains files)


API LAYER
═════════
/api/library/folders
  • GET /          → List folders for teacher
  • POST /         → Create new folder
  • DELETE /:id    → Recursive delete
  • PATCH /:id     → Rename folder

/api/library (existing, enhanced)
  • GET /?folderId=xxx    → List files in folder
  • POST / + folderId     → Upload to folder


UI LAYER
════════
app/(dashboard)/library/page.tsx
  • Breadcrumb component
  • Folder/file list (enhanced library-list.tsx)
  • Navigation state management (URL params)

components/library/
  • breadcrumb-nav.tsx      (NEW)
  • folder-create-modal.tsx (NEW)
  • library-list.tsx        (ENHANCED - render folders + files)
```

## Database Schema

### New Model: LibraryFolder

```prisma
model LibraryFolder {
  id          String         @id @default(cuid())
  teacherId   String
  name        String
  parentId    String?        // null = root level
  path        String         // Materialized path: "/songs/blues"
  sortOrder   Int            @default(0)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  teacher     TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  parent      LibraryFolder? @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    LibraryFolder[] @relation("FolderHierarchy")
  files       LibraryItem[]  @relation("FolderFiles")

  @@index([teacherId])
  @@index([parentId])
  @@index([teacherId, parentId]) // Query folders in specific parent
  @@index([path])                 // Search by path
}
```

### Enhanced Model: LibraryItem

```prisma
model LibraryItem {
  // ... existing fields ...
  folderId    String?        // null = root level

  // New relation
  folder      LibraryFolder? @relation("FolderFiles", fields: [folderId], references: [id], onDelete: SetNull)

  @@index([folderId])
}
```

### Path Calculation Strategy

**Materialized Path** - store full path string for performance:

```typescript
// Example paths:
"/"                    // Root
"/songs"               // Top-level folder
"/songs/blues"         // Nested folder
"/songs/blues/acoustic" // Deeply nested

// Benefits:
// - Fast breadcrumb rendering (split on "/")
// - Fast subtree queries (WHERE path LIKE '/songs/%')
// - No recursive joins needed for display
```

## API Design

### Folder Endpoints

#### `GET /api/library/folders`

Query folders for current teacher.

**Query Params:**
- `parentId` (optional) - Filter to specific parent folder (null = root)

**Response:**
```json
{
  "folders": [
    {
      "id": "folder_123",
      "name": "Songs",
      "parentId": null,
      "path": "/songs",
      "sortOrder": 0,
      "childCount": 3,
      "fileCount": 2,
      "createdAt": "2026-04-02T00:00:00Z"
    }
  ]
}
```

#### `POST /api/library/folders`

Create new folder.

**Body:**
```json
{
  "name": "Blues",
  "parentId": "folder_123" // or null for root
}
```

**Logic:**
1. Validate teacher owns parent folder (if parentId provided)
2. Calculate path based on parent
3. Create folder
4. Return created folder

#### `DELETE /api/library/folders/:id`

Delete folder recursively.

**Logic:**
1. Validate teacher owns folder
2. Find all descendant folders (WHERE path LIKE '/parent/path/%')
3. Delete all files in this folder + descendants
4. Delete all descendant folders
5. Delete this folder

**Response:**
```json
{
  "deleted": {
    "folders": 3,
    "files": 12
  }
}
```

#### `PATCH /api/library/folders/:id`

Rename folder.

**Body:**
```json
{
  "name": "New Name"
}
```

**Logic:**
1. Validate teacher owns folder
2. Update folder name
3. Recalculate path for this folder
4. Recalculate paths for all descendants
5. Return updated folder

### Enhanced File Endpoints

#### `GET /api/library`

**Enhanced Query Params:**
- `folderId` (optional) - Filter to specific folder (null = root, omit = all)

#### `POST /api/library`

**Enhanced Body:**
```json
{
  "folderId": "folder_123", // or null for root
  // ... existing upload fields
}
```

## UI Component Design

### Breadcrumb Navigation

```typescript
// components/library/breadcrumb-nav.tsx

interface Breadcrumb {
  id: string | null;  // null = root
  name: string;       // "Songs", "Blues", etc.
  path: string;       // "/songs/blues"
}

// Parse current folder's path into breadcrumbs
function parseBreadcrumbs(currentFolder: LibraryFolder | null): Breadcrumb[] {
  if (!currentFolder) {
    return [{ id: null, name: "Library", path: "/" }];
  }

  const segments = currentFolder.path.split('/').filter(Boolean);
  const breadcrumbs = [{ id: null, name: "Library", path: "/" }];

  // Build breadcrumbs from path
  // Need to query folders to get IDs (or store in path?)
  // ... implementation details

  return breadcrumbs;
}

// Component
export function BreadcrumbNav({ currentFolder, onNavigate }) {
  const breadcrumbs = parseBreadcrumbs(currentFolder);

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, i) => (
        <>
          <button onClick={() => onNavigate(crumb.id)}>
            {crumb.name}
          </button>
          {i < breadcrumbs.length - 1 && <span>/</span>}
        </>
      ))}
    </nav>
  );
}
```

### Enhanced Library List

```typescript
// components/library/library-list.tsx (enhanced)

interface LibraryListProps {
  folders: LibraryFolder[];
  files: LibraryItem[];
  currentFolderId: string | null;
  onNavigateFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  studentView?: boolean;
}

// Render folders first, then files
// Folders have folder icon, double-click navigates
// Files have existing behavior
```

### Navigation State Management

```typescript
// app/(dashboard)/library/page.tsx

// Use URL search params for navigation
// ?folder=folder_123
// No param = root

async function LibraryPage({ searchParams }) {
  const folderId = searchParams.folder || null;

  // Fetch current folder (if any)
  const currentFolder = folderId
    ? await prisma.libraryFolder.findUnique({ where: { id: folderId }})
    : null;

  // Fetch folders in current location
  const folders = await prisma.libraryFolder.findMany({
    where: {
      teacherId,
      parentId: folderId
    }
  });

  // Fetch files in current location
  const files = await prisma.libraryItem.findMany({
    where: {
      teacherId,
      folderId
    }
  });

  return (
    <>
      <BreadcrumbNav currentFolder={currentFolder} />
      <LibraryList
        folders={folders}
        files={files}
        currentFolderId={folderId}
      />
    </>
  );
}

// Client-side navigation
function navigateToFolder(folderId: string | null) {
  const url = folderId
    ? `/library?folder=${folderId}`
    : `/library`;

  router.push(url);
}
```

## Search Implementation

### Global Search with Folder Context

```typescript
// Search endpoint: GET /api/library/search?q=blues

// Query all files matching search
const results = await prisma.libraryItem.findMany({
  where: {
    teacherId,
    OR: [
      { title: { contains: query, mode: 'insensitive' }},
      { description: { contains: query, mode: 'insensitive' }},
    ]
  },
  include: {
    folder: true  // Include parent folder for breadcrumb
  }
});

// Return with folder context
{
  "results": [
    {
      "id": "file_123",
      "title": "12-bar-blues.pdf",
      "folderPath": "/songs/blues",  // From folder.path
      "folderId": "folder_123"
    }
  ]
}
```

### Search UI

```typescript
// Show folder path in search results
<SearchResult>
  <FileIcon /> 12-bar-blues.pdf
  <FolderPath>Library / Songs / Blues</FolderPath>
  <Button onClick={() => navigateToFolder(result.folderId)}>
    Go to folder
  </Button>
</SearchResult>
```

## Edge Cases & Error Handling

### Circular References (Prevention)

```typescript
// When moving/creating folder, validate parent is not descendant
async function validateNotCircular(folderId: string, newParentId: string) {
  const folder = await prisma.libraryFolder.findUnique({
    where: { id: folderId }
  });

  // Cannot move folder into its own subtree
  const parent = await prisma.libraryFolder.findUnique({
    where: { id: newParentId }
  });

  if (parent.path.startsWith(folder.path)) {
    throw new Error("Cannot move folder into its own subtree");
  }
}
```

### Orphaned Files (Folder Deletion)

```typescript
// When deleting folder, set files' folderId to null (root)
// Already handled by Prisma: onDelete: SetNull

// OR delete files with folder (cascade)
// Design decision: Keep files, move to root
```

### Name Conflicts

```typescript
// Prevent duplicate folder names in same parent
// Add unique constraint:
@@unique([teacherId, parentId, name])

// Show error: "A folder named 'Blues' already exists here"
```

### Path Recalculation Performance

When renaming folder, must update paths for entire subtree:

```sql
-- Find all descendants
SELECT * FROM LibraryFolder
WHERE path LIKE '/old/path/%';

-- Update each one (batch)
UPDATE LibraryFolder
SET path = REPLACE(path, '/old/path/', '/new/path/')
WHERE path LIKE '/old/path/%';
```

For very deep trees (unlikely in this use case), consider background job.

## Design Patterns

### Materialized Path Pattern

- **Pro**: Fast queries, no recursive joins
- **Con**: Path updates on rename (acceptable trade-off)
- **Alternative**: Adjacency list (parentId only) - simpler but slower queries

### URL-Based Navigation

- **Pro**: Bookmarkable, back button works
- **Con**: Server component re-renders (acceptable with RSC)
- **Alternative**: Client-side state - faster but not bookmarkable

## Performance Considerations

### Query Optimization

```sql
-- Get folder contents (fast with indexes)
SELECT * FROM LibraryFolder
WHERE teacherId = ? AND parentId = ?;

SELECT * FROM LibraryItem
WHERE teacherId = ? AND folderId = ?;

-- Get breadcrumb path (single query)
SELECT * FROM LibraryFolder
WHERE teacherId = ? AND path IN (?, ?, ?);
-- Paths: '/', '/songs', '/songs/blues'
```

### Folder Depth Limits

No hard limit, but practical limits:
- UI: Breadcrumb becomes cramped beyond 4-5 levels
- UX: Deep nesting indicates poor organization
- Performance: Path updates scale with depth (acceptable)

No enforcement needed - trust teachers to organize sensibly.

# Capability: Global Library Search

## Overview

Teachers and students can search across the entire library regardless of current folder location, with results showing folder context for easy navigation.

## User Stories

### Search All Files

**As a teacher/student**, I want to search my entire library so that I can find files quickly without remembering their location.

**Acceptance Criteria:**
- Search box visible at top of library page
- Placeholder: "Search entire library..."
- Search is always global (ignores current folder)
- Results appear as list below search box
- Empty search shows current folder contents (default view)

**Search Behavior:**
- Live search: Results update as teacher types (debounced 300ms)
- Searches: file title, description, tags
- Case-insensitive
- Partial match (contains, not exact)
- Minimum 2 characters to trigger search

### View Search Results with Context

**As a teacher/student**, I want to see where each search result is located so that I understand its context.

**Acceptance Criteria:**
- Each result shows:
  - File icon + title
  - Folder path breadcrumb (e.g., "Library / Songs / Blues")
  - File type badge
  - Preview/download actions
- Results sorted by relevance (title match > description match)
- No results message: "No files found matching '[query]'"

**Result Display:**
```
┌──────────────────────────────────────────┐
│ 🎵 12-bar-blues-progression.pdf         │
│ Library / Songs / Blues                  │
│ [Preview] [Download]                     │
└──────────────────────────────────────────┘
```

### Navigate to Search Result

**As a teacher/student**, I want to navigate to a file's folder from search results so that I can see related files.

**Acceptance Criteria:**
- Click folder path breadcrumb navigates to that folder
- After navigation, search is cleared
- File is visible in folder (may need to scroll if many files)
- Optionally: Highlight/flash the file briefly after navigation

**Alternative Actions:**
- Click file title → opens preview modal (existing behavior)
- Click [Download] → downloads file immediately
- Click folder path → navigates to folder

### Clear Search

**As a teacher/student**, I want to clear my search so that I can return to browsing folders.

**Acceptance Criteria:**
- [X] button in search box clears search
- Pressing Escape key clears search
- Clearing search returns to current folder view (breadcrumb context preserved)
- If in search mode and navigate to folder (breadcrumb), search is cleared

## Edge Cases

### No Results

**Scenario:** Search for "violin" but library only has guitar files

**Behavior:**
- Show empty state:
  - Icon: 🔍
  - Message: "No files found matching 'violin'"
  - Suggestion: "Try different keywords or browse folders"
- No error, just empty results
- Search box remains filled with query

### Search from Deep Folder

**Scenario:** Teacher is in `/library?folder=xyz` (nested), performs search

**Behavior:**
- Search still scans entire library (not just current folder)
- Results may include files from other folders
- Breadcrumb in results shows full path, making it clear files are elsewhere
- After clearing search, return to original folder (`?folder=xyz`)

### Very Common Search Term

**Scenario:** Search for "exercise" returns 50+ results

**Behavior:**
- Show all results (no arbitrary limit for v1)
- Optionally: Pagination or "Show more" if > 50 results (future)
- Results scroll within library view
- Consider showing count: "47 files found"

### Special Characters in Search

**Scenario:** Teacher searches for "C# major" or "blues/jazz"

**Behavior:**
- Treat special chars as literals (no regex parsing)
- `#` and `/` are valid search characters
- SQL injection prevention: Use parameterized queries
- Apostrophes escaped properly: "teacher's guide"

### Search While Loading

**Scenario:** Teacher types search query before page fully loads

**Behavior:**
- Debounce prevents premature searches
- Show loading spinner if search is pending
- Once loaded, execute search
- No race conditions (latest search wins)

## Student View

**As a student**, search works identically:
- Global search across teacher's entire library
- Same result display with folder paths
- Can navigate to folders (read-only)
- Can preview and download files

**Permissions:**
- Students search only their teacher's library
- Students cannot see files from other teachers
- Search respects existing `teacherId` filtering

## Technical Specifications

### Search Query

```sql
-- Global search (all folders)
SELECT * FROM LibraryItem
WHERE teacherId = ?
  AND (
    title ILIKE '%query%'
    OR description ILIKE '%query%'
    OR tags::text ILIKE '%query%'
  )
ORDER BY
  CASE
    WHEN title ILIKE 'query%' THEN 1  -- Title starts with query
    WHEN title ILIKE '%query%' THEN 2 -- Title contains query
    WHEN description ILIKE '%query%' THEN 3 -- Description contains
    ELSE 4
  END,
  title ASC;

-- Include folder for breadcrumb
INCLUDE folder { path }
```

### API Endpoint

```typescript
// GET /api/library/search?q=blues

{
  "query": "blues",
  "results": [
    {
      "id": "file_123",
      "title": "12-bar-blues.pdf",
      "description": "...",
      "fileUrl": "...",
      "folderId": "folder_xyz",
      "folderPath": "/songs/blues",  // From folder.path
      "category": "TABLATURE"
    }
  ],
  "count": 3
}
```

### Frontend Implementation

```typescript
// Debounced search hook
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedSearch.length >= 2) {
    performSearch(debouncedSearch);
  } else {
    clearSearch();
  }
}, [debouncedSearch]);

// Search results replace folder/file list
{isSearching ? (
  <SearchResults results={searchResults} />
) : (
  <FolderFileList folders={folders} files={files} />
)}
```

## Non-Functional Requirements

### Performance

- Search query execution: < 200ms for libraries with < 1000 files
- Database index on `title`, `description` for fast ILIKE queries
- Debounce prevents excessive API calls (300ms)

### User Experience

- Instant visual feedback (loading state)
- Clear indication when in search mode vs. browse mode
- Breadcrumb path readable and clickable in results
- Search preserves URL folder context (return to folder after clear)

### Accessibility

- Search input has proper label: "Search library files"
- Screen reader announces result count: "3 files found"
- Keyboard nav: Arrow keys navigate results, Enter opens file
- Clear button accessible via keyboard (Tab + Enter)

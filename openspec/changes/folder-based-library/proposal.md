# Proposal: Folder-Based Library Organization

## Problem Statement

The current Resource Library is a flat file list with category filtering. This design has significant usability issues:

1. **No Context**: Users must read every file title to understand what's available
2. **Cognitive Overload**: A list of 20+ files becomes overwhelming without structure
3. **No Organization**: Teachers can't group related materials logically (e.g., "Blues Songs" or "Beginner Exercises")
4. **Low Adoption**: The feature isn't being used, likely because it's difficult to understand its purpose

A flat list requires constant mental effort. Folders provide instant context through their names and hierarchy.

## Proposed Solution

Transform the Resource Library into a **hierarchical folder-based system** modeled after macOS Finder:

### Core Features

- **Unlimited Folder Nesting**: Teachers can organize materials however makes sense to them
- **Breadcrumb Navigation**: Clear visual path showing current location (`Library / Songs / Blues`)
- **Global Search**: Search always scans entire library, showing folder paths in results
- **Individual File Downloads**: No zip generation complexity - files download individually
- **Shared Structure**: Students see the same folder hierarchy as their teacher
- **Fresh Start**: No migration needed - current library usage is minimal

### User Experience

```
Before (Current):
═════════════════
[Category: Exercises ▼] [Search...]

• warm-up-exercise.pdf
• blues-scale.pdf
• finger-exercise.pdf
• jazz-chords.pdf
• ...

Problem: No context, no grouping, overwhelming


After (Proposed):
════════════════
Library / Technique Exercises / Warm-ups    [+ New ▼]

[Search entire library...]

📁 Finger Independence
📁 Speed Building
📄 chromatic-warm-up.pdf
📄 spider-exercise.pdf

Benefit: Context, purpose, organization
```

### Navigation Flow

1. **Breadcrumb Navigation**: Click any folder in path to jump directly to it
2. **Folder Actions**: Double-click folder to open, double-click file to preview
3. **Creation**: [+ New] button → "New Folder" or "Upload File"
4. **Selection**: Multi-select works across both folders and files (Finder-style)
5. **Search**: Global search shows results with folder paths, click to navigate to that folder

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Folder Depth | Unlimited nesting | Teachers need flexibility to organize their way |
| Search Scope | Always global | Small libraries, seeing "where things are" is valuable |
| Bulk Download | Individual files | Avoid backend zip complexity for v1 |
| Student Access | Full structure visible | Simple and predictable, add permissions later if needed |
| Migration | Fresh start | Current usage is minimal, no legacy data to preserve |

## Success Metrics

- **Adoption**: Teachers actively create folders and upload files
- **Organization**: Average folder depth > 0 (files not all in root)
- **Usage**: Students download resources more frequently (easier to find relevant materials)

## Out of Scope (Future Enhancements)

- Folder-level sharing permissions (students see everything for now)
- Zip download for entire folders
- Drag-and-drop file moving between folders
- Folder icons/colors
- Shared folders across teachers

## Impact

- **Teachers**: Easier to organize and maintain lesson materials
- **Students**: Easier to find relevant resources
- **System**: More valuable feature that actually gets used

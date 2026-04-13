## Why

Teachers need continuity when logging lessons. Currently, there's no quick reference to what happened in the previous lesson, forcing teachers to either rely on memory or navigate away from the form to check past notes. This breaks the lesson logging flow and reduces the quality of lesson notes.

## What Changes

- Add a summary card showing the last completed lesson when a student is selected on the new lesson form
- Display date (relative and absolute), notes preview (first 100 characters), and a link to view the full lesson
- Summary appears only if the student has previous completed lessons
- Link opens in a new tab to preserve form state

## Capabilities

### New Capabilities
- `last-lesson-context`: Display contextual information about a student's previous lesson when creating a new lesson entry

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

**Affected Code:**
- `components/lessons/lesson-form.tsx` - Add fetch logic and state for last lesson
- New component: `components/lessons/last-lesson-summary.tsx` - Display component
- `app/api/lessons/route.ts` - No changes needed (existing GET endpoint supports required filters)

**UI Changes:**
- New summary card appears between student selector and practice progress section
- Only visible when student has at least one completed lesson

**Data Flow:**
- Client-side fetch on student selection
- Queries existing API: `GET /api/lessons?studentId={id}&status=COMPLETED&limit=1`

## Non-goals

- Editing previous lesson from this view (link to full lesson handles this)
- Showing multiple past lessons (only most recent completed)
- Summary for cancelled/missed lessons (focus on completed only)
- Server-side rendering the summary (client fetch is simpler for this use case)

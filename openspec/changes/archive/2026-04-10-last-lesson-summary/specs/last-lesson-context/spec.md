## ADDED Requirements

### Requirement: Display last completed lesson summary
When a teacher selects a student on the new lesson form, the system SHALL fetch and display a summary of the student's most recent completed lesson to provide context for the new lesson entry.

#### Scenario: Student with completed lessons selected
- **WHEN** teacher selects a student who has at least one completed lesson
- **THEN** system displays a summary card showing the last completed lesson's date, relative time, and notes preview

#### Scenario: Student with no completed lessons selected
- **WHEN** teacher selects a student who has no completed lessons
- **THEN** system does not display any summary card (component hidden)

#### Scenario: Student with only cancelled/missed lessons
- **WHEN** teacher selects a student who has lessons but none with status COMPLETED
- **THEN** system does not display any summary card (skips non-completed lessons)

### Requirement: Summary displays essential lesson information
The last lesson summary SHALL display the lesson date in both absolute and relative formats, and a preview of the lesson notes limited to 100 characters.

#### Scenario: Lesson has notes
- **WHEN** last completed lesson contains notes with more than 100 characters
- **THEN** summary shows first 100 characters followed by ellipsis ("...")

#### Scenario: Lesson has no notes
- **WHEN** last completed lesson has null or empty notes field
- **THEN** summary shows placeholder text "No notes recorded"

#### Scenario: Date display
- **WHEN** last completed lesson is displayed
- **THEN** summary shows both absolute date (e.g., "March 15, 2026") and relative time (e.g., "3 days ago")

### Requirement: Summary provides navigation to full lesson
The last lesson summary SHALL include a link to view the complete lesson details, opening in a new browser tab to preserve the new lesson form state.

#### Scenario: Teacher clicks view lesson link
- **WHEN** teacher clicks "View full lesson" link
- **THEN** system opens the lesson detail page in a new tab (target="_blank" with rel="noopener noreferrer")

#### Scenario: Form state preservation
- **WHEN** teacher opens full lesson in new tab
- **THEN** new lesson form remains in current tab with all entered data intact

### Requirement: Summary fetches data on student selection
The system SHALL automatically fetch the last completed lesson data when a student is selected, using the existing lessons API endpoint.

#### Scenario: API request on student selection
- **WHEN** teacher selects a student from the dropdown
- **THEN** system makes GET request to /api/lessons with studentId, status=COMPLETED, and limit=1 parameters

#### Scenario: Fetch happens alongside checklist fetch
- **WHEN** teacher selects a student
- **THEN** system fetches both student checklists (existing) and last lesson (new) in parallel

#### Scenario: Loading state handling
- **WHEN** last lesson data is being fetched
- **THEN** system handles loading silently without blocking form or showing spinners (graceful degradation)

#### Scenario: Error handling
- **WHEN** last lesson fetch fails
- **THEN** system silently handles error and does not display summary (non-blocking failure)

### Requirement: Summary visual placement and styling
The last lesson summary SHALL appear between the student selector and the practice progress section, following the OpenAI-inspired design system with turquoise accents.

#### Scenario: Component positioning
- **WHEN** student with completed lessons is selected
- **THEN** summary card appears directly below student selector and above practice progress section

#### Scenario: Visual styling
- **WHEN** summary is displayed
- **THEN** component uses Card wrapper with muted background, proper spacing, and turquoise accent for the link

#### Scenario: Mobile responsiveness
- **WHEN** summary is viewed on mobile device
- **THEN** component maintains readability with appropriate text sizing and touch-friendly link target (minimum 44px)

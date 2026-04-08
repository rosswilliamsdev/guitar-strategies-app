# Voice-to-Text Lesson Notes with AI Formatting

## Problem

Guitar teachers need to log lesson notes after each session, but typing detailed notes takes 10-15 minutes and breaks the workflow momentum. Teachers often rush through notes or skip important details because manual entry is tedious.

Current process:

1. Finish teaching a 30-60 minute lesson
2. Open lesson form
3. Type 5-10 minutes of detailed notes using Tiptap editor
4. Format with toolbar (headings, lists, emphasis)
5. Save

This is time-consuming and happens when teachers are mentally fatigued after teaching.

## Solution

Add inline voice input to the lesson notes editor. Teachers narrate what happened in 2-3 minutes, and AI transcribes + formats it into structured HTML that appears directly in the editor for review.

**Key interaction:** A microphone button floats in the bottom-right corner of the Tiptap editor (similar to Claude's voice interface). Click to record, click to stop, wait 10-20 seconds for processing, then review and edit the formatted notes.

### User Flow

```
1. Teacher opens "New Lesson" page
2. Selects student from dropdown
3. Clicks microphone icon (🎤) in editor
4. Records 2-3 minute narration:
   "Today we worked on G major chord. Sarah is still
    struggling with finger placement on the third string.
    For homework, practice the chord transition from C to G
    slowly. Next lesson we'll start working on Wonderwall."
5. Clicks stop (🔴)
6. Waits 10-20 seconds (processing spinner)
7. Formatted HTML appears in editor:
   ## What We Worked On
   Today Sarah practiced G major chord...

   ## Homework
   • Practice C to G transitions slowly
   • Focus on finger placement

   ## Next Lesson
   We'll start working on Wonderwall
8. Teacher skims, makes quick edits if needed
9. Saves lesson

Total time: ~3 minutes (vs 10-15 minutes typing)
```

### Technical Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Client-Side)                     │
├─────────────────────────────────────────────┤
│                                             │
│  RichTextEditor Component                   │
│    └─ VoiceMicrophoneButton (NEW)          │
│         ├─ MediaRecorder API               │
│         ├─ Audio blob capture              │
│         ├─ States: idle/recording/process  │
│         └─ Inserts HTML into editor        │
│                                             │
└─────────────────────────────────────────────┘
         │
         ▼ POST audio blob
┌─────────────────────────────────────────────┐
│  Backend API                                │
├─────────────────────────────────────────────┤
│                                             │
│  POST /api/lessons/voice-to-notes           │
│    ├─ Accept: multipart/form-data audio    │
│    ├─ Step 1: OpenAI Whisper API           │
│    │    └─ Audio → transcript text         │
│    ├─ Step 2: GPT-4/Claude API             │
│    │    └─ Transcript → formatted HTML     │
│    ├─ Delete audio blob                    │
│    └─ Return: { html: string }             │
│                                             │
└─────────────────────────────────────────────┘
```

**API Contract:**

```typescript
POST /api/lessons/voice-to-notes

Request:
  Content-Type: multipart/form-data
  audio: File (webm/mp3 blob)

Response:
  {
    success: boolean
    data: {
      html: string  // Formatted HTML for Tiptap
    }
    error?: string
  }
```

**No Database Changes:** Uses existing `Lesson.notes` field (already stores rich HTML). Deprecated fields (`homework`, `focusAreas`, `songsPracticed`, `nextSteps`) remain unused.

### Design Decisions

1. **Single API call:** Audio goes in, formatted HTML comes out (not separate transcribe + format steps)
2. **Client-side recording:** Web Audio API in browser, no server-side streaming
3. **No audio retention:** Audio deleted immediately after processing (privacy + cost)
4. **Inline UI:** Microphone button inside editor, not separate modal/wizard
5. **Append behavior:** If editor has existing content, voice notes append (never lose work)
6. **Always editable:** Teacher can modify AI-generated notes before saving
7. **Fallback gracefully:** All errors fall back to manual typing

### AI Prompt Strategy

```
You are a guitar teacher's assistant. Convert this voice
transcript into well-formatted lesson notes.

TRANSCRIPT:
"""
{transcript}
"""

Create structured HTML lesson notes using:
- <h2> for section headings
- <p> for paragraphs
- <ul><li> for lists
- <strong> for emphasis if needed

Suggested sections (include only if relevant):
• What We Worked On
• Homework / Practice Tasks
• Songs Practiced
• Student Progress / Challenges
• Next Lesson

Keep it concise and professional but warm. Focus on
actionable information. Return ONLY the HTML.
```

## Goals

- **Primary:** Reduce lesson logging time from 10-15 minutes to 3 minutes
- **Secondary:** Increase quality/completeness of notes (easier to narrate than type)
- **Tertiary:** Reduce friction in post-lesson workflow

## Non-Goals

- Real-time transcription during lesson (too complex, privacy concerns)
- Recording student voices (privacy + noisy environment)
- Field-by-field extraction to structured data (deprecated fields)
- Audio archival/playback (storage cost, no clear value)
- Multi-language support in v1 (English only initially)

## Success Metrics

- **Adoption:** 40%+ of teachers use voice input within 2 weeks of launch
- **Time savings:** Average lesson logging time drops from ~12 min to ~4 min
- **Quality:** Note completeness increases (measured by avg character count)
- **Satisfaction:** Teacher feedback will be positive (post-feature survey)

## Cost Analysis

Per voice note:

- Whisper API: ~$0.006/min × 3 min = $0.018
- GPT-4 API: ~$0.015 per extraction
- **Total: ~$0.03 per voice note**

Teacher using voice for 20 lessons/week:

- Weekly: $0.60
- Monthly: $2.40
- Yearly: $28.80

For 100 teachers all using voice:

- Monthly API cost: $240
- Yearly API cost: $2,880

**Cost per lesson:** $0.03 on a $60 lesson = 0.05% (negligible)

## Risks & Mitigations

| Risk                           | Impact | Mitigation                                |
| ------------------------------ | ------ | ----------------------------------------- |
| AI misinterprets narration     | Medium | Teacher reviews/edits before saving       |
| API costs higher than expected | Medium | Monitor usage, add usage caps if needed   |
| Teachers don't adopt voice     | High   | Make manual typing still easy (fallback)  |
| Transcription accuracy poor    | Medium | Use Whisper (best-in-class), allow retry  |
| Processing too slow (>30 sec)  | Medium | Optimize API calls, show progress clearly |
| Microphone permission issues   | Low    | Clear error messages, fallback to manual  |

## Open Questions

- Should we support editing during recording, or only after?
- Max recording duration: 5 minutes enough?
- If editor has content, append or ask user (replace/append)?
- Use GPT-4 or Claude for formatting? (cost vs quality tradeoff)
- Need retry logic for failed API calls?

## Implementation Phases

**Phase 1: Voice Recording Component**

- Floating microphone button in Tiptap editor
- Record/stop states with visual feedback
- Timer, max duration (5 min), error handling

**Phase 2: API Endpoint**

- `/api/lessons/voice-to-notes` route
- Whisper integration, LLM formatting
- Structured logging, error handling

**Phase 3: Editor Integration**

- HTML insertion logic (append/replace)
- Loading states, error states
- Fallback to manual on failures

**Phase 4: Polish & Monitoring**

- Cost tracking, usage analytics
- Teacher feedback loop
- Performance optimization

## Timeline Estimate

- Phase 1: 6-8 hours (voice recording UI)
- Phase 2: 8-10 hours (API + AI integration)
- Phase 3: 4-6 hours (editor integration)
- Phase 4: 4-6 hours (polish + monitoring)

**Total: 22-30 hours** (~3-4 days of focused work)

## Dependencies

- OpenAI API key (Whisper + GPT-4 access)
- Or Anthropic API key (Claude for formatting)
- Existing Tiptap editor component
- Existing Lesson model and save flow

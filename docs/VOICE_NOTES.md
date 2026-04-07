# Voice-to-Text Lesson Notes

Teachers can now narrate lesson notes using their voice instead of typing them manually. This feature reduces lesson logging time from 10-15 minutes to ~3 minutes.

## How It Works

```
Teacher narrates → Browser records → Whisper transcribes → GPT-4 formats → Tiptap editor
```

1. **Record**: Click the microphone icon in the lesson notes editor
2. **Narrate**: Speak naturally for 2-3 minutes (max 5 minutes)
3. **Process**: AI transcribes and formats into structured HTML (~10-20 seconds)
4. **Review**: Edit the formatted notes in the Tiptap editor
5. **Save**: Submit the lesson form as usual

## Setup

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 2. Add to Environment

Add to your `.env` file:

```bash
OPENAI_API_KEY="sk-your-actual-api-key-here"
```

### 3. Restart Development Server

```bash
npm run dev
```

## Using Voice Notes

### Recording Tips

**Good narration:**
```
"Today we worked on the G major chord. Sarah is still struggling
with finger placement on the third string, but she's getting better.
For homework, she should practice the C to G transition slowly.
Next lesson we'll start Wonderwall."
```

**What the AI extracts:**
- Topics covered (G major chord)
- Student progress (struggling with placement, improving)
- Homework assignments (C to G transitions)
- Next lesson plans (Wonderwall)

### Recording Controls

- **Click microphone** → Start recording
- **Click red square** → Stop recording
- **Wait 10-20 seconds** → AI processing
- **Review & edit** → Make any changes needed

### Max Duration

Recordings automatically stop at **5 minutes**. Most lesson summaries take 2-3 minutes.

## Formatting Strategy

### Flexible Sections

The AI creates sections **only when content is mentioned**:

- What We Worked On
- Student Progress / Challenges
- Homework / Practice Tasks
- Songs Practiced
- Next Lesson Plan

Short or unstructured notes just get clean paragraphs without forced sections.

### Voice Preservation

The AI keeps your natural teaching voice:

❌ **Overly formal:** "Student demonstrates proficiency in chord transitions"
✓ **Your voice:** "Sarah's getting much better at switching between chords"

### What Gets Cleaned Up

- Filler words ("uh", "um", "like", "you know")
- Grammar and punctuation
- Organization (chronological order: today → homework → next lesson)

## Cost

Per voice note:
- Whisper transcription: ~$0.018 (3 min audio)
- GPT-4 formatting: ~$0.015
- **Total: ~$0.03 per lesson**

For 20 lessons/week:
- Weekly: $0.60
- Monthly: $2.40
- Yearly: $28.80

## Technical Details

### API Endpoint

```
POST /api/lessons/voice-to-notes
Content-Type: multipart/form-data

Request:
  audio: File (webm blob from MediaRecorder API)

Response:
  {
    success: true,
    data: {
      html: "<h2>What We Worked On</h2><p>Today we worked on..."
    }
  }
```

### Processing Pipeline

1. **Transcription** (Whisper API)
   - Model: `whisper-1`
   - Language: English only (v1)
   - Format: Plain text

2. **Formatting** (GPT-4 Turbo)
   - Model: `gpt-4-turbo`
   - Temperature: 0.7 (balanced creativity)
   - Max tokens: 1000
   - Output: Structured HTML

3. **Insertion** (Tiptap)
   - HTML inserted at cursor position
   - Appends to existing content (never replaces)
   - Fully editable after insertion

### Error Handling

All errors fall back gracefully:

- **Microphone permission denied** → Clear error message, manual typing
- **Transcription fails** → Retry or manual typing
- **Formatting fails** → Returns plain transcript wrapped in `<p>` tags
- **API key missing** → Feature disabled, helpful error message

No audio is retained after processing (privacy + cost).

## Browser Compatibility

Requires:
- Modern browser with [MediaRecorder API](https://caniuse.com/mediarecorder)
- Microphone access permission

Supported:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari 14.1+ (Desktop & Mobile)
- ❌ IE11 (not supported)

## Privacy

- Audio is **never stored** on the server
- Immediately deleted after transcription
- Only formatted text is saved in lesson notes
- All processing happens server-side (secure)

## Troubleshooting

### "Microphone permission denied"

1. Click the lock icon in browser address bar
2. Allow microphone access
3. Refresh the page
4. Try recording again

### "Voice notes feature is not configured"

Your `OPENAI_API_KEY` is missing or invalid:

1. Check `.env` file has the key
2. Verify key starts with `sk-`
3. Restart development server
4. Try again

### "Failed to process voice note"

This can happen if:
- Network connection lost during upload
- OpenAI API is down (rare)
- Audio file is corrupted

**Solution:** Try recording again, or type manually (always works).

### Processing takes longer than expected

Normal processing: 10-20 seconds
If it takes 30+ seconds:
- OpenAI API may be slow (check status.openai.com)
- Large audio file (5 min recording)
- Slow network connection

Wait up to 60 seconds before retrying.

## Development

### Testing Locally

1. Set up API key in `.env`
2. Run `npm run dev`
3. Log in as teacher
4. Go to "New Lesson" page
5. Click microphone icon
6. Record a test narration
7. Verify formatted output

### Monitoring Usage

Check logs for cost tracking:

```bash
grep "Voice note cost estimate" logs/combined.log
```

### Modifying the Prompt

The formatting prompt is in:
```
app/api/lessons/voice-to-notes/route.ts
Line ~179: const FORMATTING_PROMPT
```

Edit the prompt to change:
- Section headings
- Formatting style
- Tone (formal vs. casual)
- Structure (strict vs. flexible)

## Future Enhancements

- [ ] Multi-language support
- [ ] "Regenerate" button for different formatting
- [ ] Show raw transcript alongside formatted version
- [ ] Usage analytics dashboard
- [ ] Custom formatting preferences per teacher
- [ ] Keyboard shortcut to start/stop recording

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check server logs for API errors
4. Verify OpenAI API key is valid

/**
 * @fileoverview Voice-to-text API endpoint for lesson notes.
 *
 * Accepts audio recordings from teachers, transcribes them using OpenAI Whisper,
 * then formats the transcript into structured HTML lesson notes using GPT-4.
 *
 * Flow:
 * 1. Receive audio file (webm/mp3 blob)
 * 2. Transcribe with Whisper API
 * 3. Format transcript with GPT-4 into structured HTML
 * 4. Return formatted HTML for insertion into Tiptap editor
 *
 * No audio retention - files are deleted immediately after processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import OpenAI from "openai";

// Route segment config for Next.js 15 App Router
// Note: Body size limit is configured globally in next.config.js
// via experimental.proxyClientMaxBodySize (set to 20mb for voice recordings)
export const maxDuration = 60; // 60 seconds max execution time (Whisper + GPT-4 processing)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/lessons/voice-to-notes
 *
 * Transcribe and format audio lesson notes.
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   audio: File (webm/mp3 blob)
 *
 * Response:
 *   {
 *     success: boolean
 *     data: { html: string }
 *     error?: string
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      apiLog.warn("Unauthorized voice-to-notes attempt", {
        endpoint: "/api/lessons/voice-to-notes",
      });
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only teachers can use voice notes
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      apiLog.warn("Non-teacher attempted voice-to-notes", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json(
        { success: false, error: "Only teachers can use voice notes" },
        { status: 403 },
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      apiLog.error("OpenAI API key not configured", {
        endpoint: "/api/lessons/voice-to-notes",
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Voice notes feature is not configured. Please contact support.",
        },
        { status: 500 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      apiLog.warn("No audio file provided", { userId: session.user.id });
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 },
      );
    }

    apiLog.info("Processing voice note", {
      userId: session.user.id,
      fileSize: audioFile.size,
      fileType: audioFile.type,
    });

    // Step 1: Transcribe audio with Whisper
    const transcript = await transcribeAudio(audioFile);

    if (!transcript) {
      throw new Error("Transcription failed or returned empty result");
    }

    apiLog.info("Audio transcribed successfully", {
      userId: session.user.id,
      transcriptLength: transcript.length,
    });

    // Step 2: Format transcript into structured HTML
    const formattedHtml = await formatTranscriptToHtml(transcript);

    apiLog.info("Transcript formatted successfully", {
      userId: session.user.id,
      htmlLength: formattedHtml.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        html: formattedHtml,
      },
    });
  } catch (error) {
    apiLog.error("Voice-to-notes processing failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process voice note. Please try again or type manually.",
      },
      { status: 500 },
    );
  }
}

/**
 * Transcribe audio file using OpenAI Whisper API.
 */
async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // English only for v1
      response_format: "text",
    });

    return response;
  } catch (error) {
    apiLog.error("Whisper transcription failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Audio transcription failed. Please try again.");
  }
}

/**
 * Format transcript into structured HTML using GPT-4.
 *
 * Uses a carefully crafted prompt to:
 * - Preserve the teacher's natural, warm voice
 * - Extract key information and organize chronologically
 * - Remove filler words while maintaining meaning
 * - Create sections only when content is clearly present (flexible structure)
 * - Use HTML formatting appropriate for the Tiptap editor
 */
async function formatTranscriptToHtml(transcript: string): Promise<string> {
  try {
    const FORMATTING_PROMPT = `You are helping a guitar teacher format their voice-recorded lesson notes.

Your job: Transform casual voice narration into clean, structured HTML while preserving the teacher's natural voice and warmth.

WHAT TO DO:
• Extract key information and organize chronologically (today → homework → next lesson)
• Remove filler words ("uh", "um", "like", "you know", "I think", "probably")
• Fix grammar but keep the teacher's casual, warm tone
• Create sections when content is clearly present
• Use bullet lists when there are actual multiple items to list

SECTIONS (only include if mentioned):
• What We Worked On
• Student Progress / Challenges
• Homework / Practice Tasks
• Songs Practiced
• Next Lesson Plan

HTML STRUCTURE:
• <h2> for section headings
• <p> for paragraphs
• <ul><li> for lists (ONLY when you have 2+ actual items)
• <strong> for student names or key concepts

CRITICAL RULES:
• Do NOT create empty bullet points or placeholder list items
• Do NOT add extra spacing or blank lines between elements
• If there's only ONE homework item, use a paragraph (<p>) instead of a list
• Only create <li> elements when you have actual content for them
• Keep HTML clean and compact - no unnecessary whitespace
• Within each section, combine related sentences into ONE paragraph when possible

If the narration is very short or unstructured, just use clean paragraphs - don't force sections.

IMPORTANT: Keep the teacher's voice!
❌ "Student demonstrates proficiency in chord transitions"
✓ "Sarah's getting much better at switching between chords"

Return ONLY the formatted HTML with no empty elements, no explanation, no meta-commentary.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: FORMATTING_PROMPT,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.7, // Balanced creativity - not too rigid, not too wild
      max_tokens: 1000, // Reasonable limit for lesson notes
    });

    const formattedHtml = response.choices[0]?.message?.content?.trim();

    if (!formattedHtml) {
      // Fallback: wrap transcript in paragraph tags
      apiLog.warn("GPT-4 returned empty response, using fallback", {
        transcriptLength: transcript.length,
      });
      return `<p>${transcript}</p>`;
    }

    // Clean up the HTML: remove excessive whitespace and empty paragraphs
    const cleanedHtml = formattedHtml
      // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/g, "")
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, "\n\n")
      // Remove whitespace between closing and opening tags
      .replace(/>\s+</g, "><")
      // Trim the result
      .trim();

    return cleanedHtml;
  } catch (error) {
    apiLog.error("GPT-4 formatting failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Graceful fallback - return plain transcript wrapped in paragraph
    // Teacher can still edit in Tiptap editor
    return `<p>${transcript}</p>`;
  }
}

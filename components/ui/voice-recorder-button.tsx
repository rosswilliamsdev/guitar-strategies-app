/**
 * @fileoverview Voice recording button component for lesson notes.
 *
 * Provides voice-to-text functionality for teachers to narrate lesson notes
 * instead of typing them. Uses the MediaRecorder API to capture audio, sends
 * it to the backend for transcription and formatting, then returns structured
 * HTML that can be inserted into the Tiptap editor.
 *
 * Features:
 * - Click to start/stop recording
 * - Visual feedback for recording state
 * - Timer display during recording
 * - Maximum recording duration (5 minutes)
 * - Loading state while processing
 * - Error handling with fallback to manual entry
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "processing" | "error";

interface VoiceRecorderButtonProps {
  /** Callback fired when transcription completes with formatted HTML */
  onTranscriptionComplete: (html: string) => void;
  /** Optional callback for error handling */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Voice recorder button for lesson notes.
 *
 * Floats in the toolbar and allows teachers to record audio narration
 * which is then transcribed and formatted into structured HTML lesson notes.
 *
 * @example
 * ```tsx
 * <VoiceRecorderButton
 *   onTranscriptionComplete={(html) => editor.commands.insertContent(html)}
 *   onError={(err) => toast.error(err)}
 * />
 * ```
 */
export function VoiceRecorderButton({
  onTranscriptionComplete,
  onError,
  className,
}: VoiceRecorderButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECORDING_TIME = 5 * 60; // 5 minutes in seconds

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /**
   * Start recording audio from the user's microphone.
   */
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());

        // TODO: Implement audio processing logic
        // This is where you'll send the audio to the backend API
        await processAudioRecording();
      };

      // Start recording
      mediaRecorder.start();
      setState("recording");
      setRecordingTime(0);
      setErrorMessage("");

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "NotAllowedError"
            ? "Microphone permission denied. Please allow microphone access."
            : error.message
          : "Failed to start recording. Please check your microphone.";

      setState("error");
      setErrorMessage(message);
      onError?.(message);
    }
  };

  /**
   * Stop the current recording.
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  /**
   * Process the recorded audio by sending it to the backend API.
   */
  const processAudioRecording = async () => {
    setState("processing");

    try {
      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Create FormData to send audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-note.webm");

      // Send to backend API
      const response = await fetch("/api/lessons/voice-to-notes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process audio");
      }

      const data = await response.json();

      if (data.success && data.data?.html) {
        // Success! Return formatted HTML
        onTranscriptionComplete(data.data.html);
        setState("idle");
        setRecordingTime(0);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to process recording. Please try typing manually.";

      setState("error");
      setErrorMessage(message);
      onError?.(message);

      // Reset to idle after showing error
      setTimeout(() => {
        setState("idle");
        setErrorMessage("");
      }, 5000);
    }
  };

  /**
   * Format seconds into MM:SS display.
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  // Determine button appearance based on state
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isDisabled = isProcessing;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={isRecording ? "destructive" : "secondary"}
        size="sm"
        className={cn(
          "h-8 w-8 p-0 transition-colors",
          isRecording && "animate-pulse"
        )}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={
          isRecording
            ? "Stop recording"
            : isProcessing
            ? "Processing audio"
            : "Start voice recording"
        }
        title={
          isRecording
            ? "Click to stop recording"
            : isProcessing
            ? "Processing your audio..."
            : "Record lesson notes with your voice"
        }
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Timer display while recording */}
      {isRecording && (
        <span className="text-sm font-mono text-muted-foreground">
          {formatTime(recordingTime)}
        </span>
      )}

      {/* Processing message */}
      {isProcessing && (
        <span className="text-sm text-muted-foreground">
          Processing audio...
        </span>
      )}

      {/* Error message */}
      {state === "error" && errorMessage && (
        <span className="text-sm text-red-600">{errorMessage}</span>
      )}
    </div>
  );
}

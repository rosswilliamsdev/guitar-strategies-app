import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface LastLessonSummaryProps {
  lesson: {
    id: string;
    date: Date | string;
    notes: string | null;
  };
}

// Helper: Format date as "March 15, 2026"
function formatAbsoluteDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);
}

// Helper: Format relative time as "3 days ago", "2 weeks ago", etc.
function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
}

// Helper: Strip HTML tags and truncate to 100 characters
function stripHtmlAndTruncate(html: string | null): string {
  if (!html || html.trim() === "") {
    return "No notes recorded";
  }

  // Remove HTML tags
  const plainText = html.replace(/<[^>]*>/g, "");

  // Decode HTML entities (basic)
  const decoded = plainText
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  // Truncate to 100 characters
  if (decoded.length <= 100) {
    return decoded;
  }

  return decoded.substring(0, 100) + "...";
}

export function LastLessonSummary({ lesson }: LastLessonSummaryProps) {
  const absoluteDate = formatAbsoluteDate(lesson.date);
  const relativeTime = formatRelativeTime(lesson.date);
  const notesPreview = stripHtmlAndTruncate(lesson.notes);

  return (
    <Card className="w-full p-4 bg-muted border border-border rounded-lg shadow-sm space-y-2">
      {/* Date heading */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">
          Last Lesson: {absoluteDate}
        </h3>
        <p className="text-xs text-muted-foreground">({relativeTime})</p>
      </div>

      {/* Notes preview */}
      <p className="text-sm text-foreground">{notesPreview}</p>

      {/* Link to full lesson - opens in new tab */}
      <Link
        href={`/lessons/${lesson.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        View full lesson
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

/**
 * Dashboard Types and Utilities
 *
 * This file contains types and pure utility functions that can be safely
 * imported by both client and server components. It should NOT import
 * server-only modules like Winston logger, Prisma, or database utilities.
 */

export interface AdminStats {
  totalUsers: number;
  activeTeachers: number;
  activeStudents: number;
  totalLessons: number;
  lessonsThisMonth: number;
  revenueThisMonth: number;
  systemHealth: {
    uptime: number;
    healthIssues: number;
  };
  recentActivity: Array<{
    id: string;
    type:
      | "user_created"
      | "lesson_completed"
      | "teacher_joined"
      | "system_event"
      | "invoice_generated"
      | "email_sent";
    description: string;
    timestamp: Date | string;
    userEmail?: string;
  }>;
}

export interface UserStats {
  // For non-specific role users or fallback
  totalUsers: number;
  platformActivity: string;
  systemStatus: string;
}

/**
 * Format a date as relative time (e.g., "2 days ago", "Just now")
 * This is a pure utility function with no server dependencies
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(targetDate.getTime())) {
    return "Unknown time";
  }

  const diff = now.getTime() - targetDate.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

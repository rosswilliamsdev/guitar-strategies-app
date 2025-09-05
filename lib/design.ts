/**
 * @fileoverview Design system utilities and styling functions.
 * 
 * Provides consistent styling utilities following the OpenAI-inspired design system:
 * - CSS class merging with Tailwind precedence
 * - Role-based color schemes (unified turquoise accent)
 * - Button variant generators
 * - Status badge styling
 * - Date, currency, and duration formatting
 * 
 * All utilities follow the established design tokens and maintain
 * visual consistency across the application.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@prisma/client";

/**
 * Utility function to merge CSS classes with Tailwind conflict resolution.
 * 
 * @param inputs - Array of class values (strings, conditionals, arrays)
 * @returns Merged class string with proper Tailwind precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get role-based color classes.
 * 
 * Note: This function maintains legacy role-specific colors for backwards
 * compatibility, but the current design system uses unified turquoise accent
 * for all roles following OpenAI design principles.
 * 
 * @param role - User role (STUDENT, TEACHER, ADMIN)
 * @param variant - Color variant (primary, hover, light)
 * @returns CSS class name for the role and variant
 * 
 * @deprecated Consider using unified turquoise accent instead
 */
export function getRoleColor(
  role: Role,
  variant: "primary" | "hover" | "light" = "primary"
) {
  const colors = {
    STUDENT: {
      primary: "brand-violet",
      hover: "student-hover",
      light: "student-light",
    },
    TEACHER: {
      primary: "brand-purple",
      hover: "teacher-hover",
      light: "teacher-light",
    },
    ADMIN: {
      primary: "brand-black",
      hover: "admin-hover",
      light: "admin-light",
    },
  };

  return colors[role][variant];
}

/**
 * Generate button classes based on variant and optional role.
 * 
 * Provides consistent button styling following the design system:
 * - Primary: Turquoise background (main CTA)
 * - Secondary: Neutral background with border
 * - Role: Unified turquoise accent for all roles
 * 
 * @param variant - Button style variant
 * @param role - Optional user role (for role variant)
 * @returns Complete CSS class string for the button
 * 
 * @example
 * ```tsx
 * <button className={getButtonVariant('primary')}>Save</button>
 * <button className={getButtonVariant('role', 'TEACHER')}>Teacher Action</button>
 * ```
 */
export function getButtonVariant(
  variant: "primary" | "secondary" | "role" | "destructive",
  role?: Role
) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  switch (variant) {
    case "primary":
      return cn(baseClasses, "bg-primary text-white hover:bg-turquoise-600 focus-visible:ring-turquoise-500");
    case "secondary":
      return cn(
        baseClasses,
        "bg-background border border-border text-foreground hover:bg-muted focus-visible:ring-neutral-500"
      );
    case "role":
      if (!role)
        return cn(baseClasses, "bg-neutral-600 hover:bg-neutral-700 text-white focus-visible:ring-neutral-500");
      
      // Use turquoise accent for all roles in OpenAI style
      return cn(baseClasses, "bg-primary text-white hover:bg-turquoise-600 focus-visible:ring-turquoise-500");
    case "destructive":
      return cn(
        "inline-flex items-center justify-center rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-white text-red-500 border border-red-500 focus-visible:ring-red-500"
      );
    default:
      return baseClasses;
  }
}

/**
 * Generate status badge classes based on status value.
 * 
 * Provides consistent status indicators with semantic colors:
 * - Green: Completed, success states
 * - Blue: Scheduled, active states  
 * - Red: Cancelled, failed states
 * - Yellow: Pending, warning states
 * - Neutral: Unknown or default states
 * 
 * @param status - Status string (case-insensitive)
 * @returns Complete CSS class string for the status badge
 * 
 * @example
 * ```tsx
 * <span className={getStatusBadge('completed')}>Completed</span>
 * <span className={getStatusBadge('PENDING')}>Pending</span>
 * ```
 */
export function getStatusBadge(status: string) {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

  switch (status.toLowerCase()) {
    case "completed":
      return cn(baseClasses, "bg-green-50 text-green-700 border border-green-200");
    case "scheduled":
      return cn(baseClasses, "bg-blue-50 text-blue-700 border border-blue-200");
    case "cancelled":
      return cn(baseClasses, "bg-red-50 text-red-700 border border-red-200");
    case "missed":
      return cn(baseClasses, "bg-yellow-50 text-yellow-700 border border-yellow-200");
    case "pending":
      return cn(baseClasses, "bg-yellow-50 text-yellow-700 border border-yellow-200");
    case "failed":
      return cn(baseClasses, "bg-red-50 text-red-700 border border-red-200");
    default:
      return cn(baseClasses, "bg-neutral-50 text-neutral-700 border border-neutral-200");
  }
}

/**
 * Format amount as currency, converting from cents to dollars.
 * 
 * @param amount - Amount in cents
 * @param currency - Currency code (default: "USD")
 * @returns Formatted currency string (e.g., "$45.00")
 * 
 * @example
 * ```tsx
 * formatCurrency(4500) // "$45.00"
 * formatCurrency(12345) // "$123.45"
 * ```
 */
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100); // Convert from cents
}

/**
 * Format date with multiple format options.
 * 
 * @param date - Date object or ISO string
 * @param format - Format type (short, long, time)
 * @returns Formatted date string
 * 
 * @example
 * ```tsx
 * formatDate(new Date(), 'short') // "Jan 15, 2025"
 * formatDate(new Date(), 'long')  // "Monday, January 15, 2025"
 * formatDate(new Date(), 'time')  // "2:30 PM"
 * ```
 */
export function formatDate(
  date: Date | string,
  format: "short" | "long" | "time" = "short"
) {
  const d = new Date(date);

  switch (format) {
    case "short":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "long":
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "time":
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format duration in minutes to human-readable string.
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 * 
 * @example
 * ```tsx
 * formatDuration(30)  // "30m"
 * formatDuration(90)  // "1h 30m"
 * formatDuration(120) // "2h 0m"
 * ```
 */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

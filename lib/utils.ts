/**
 * @fileoverview Utility functions for common operations.
 * 
 * Contains helper functions for:
 * - CSS class name merging and conditional styling
 * - Date formatting and manipulation
 * - Currency formatting
 * - ID generation
 * - Async utilities
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

/**
 * Utility function to merge Tailwind CSS classes with proper precedence.
 * 
 * Combines clsx for conditional classes and tailwind-merge for handling
 * conflicting Tailwind classes (e.g., 'p-4 p-2' becomes 'p-2').
 * 
 * @param inputs - Array of class values (strings, objects, arrays)
 * @returns Merged class string with proper Tailwind precedence
 * 
 * @example
 * ```tsx
 * cn('px-4 py-2', 'bg-blue-500', {
 *   'text-white': isActive,
 *   'text-gray-500': !isActive
 * })
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date into a human-readable string.
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted date string (e.g., "January 15, 2025")
 * 
 * @example
 * ```tsx
 * formatDate(new Date()) // "January 15, 2025"
 * formatDate("2025-01-15T10:30:00Z") // "January 15, 2025"
 * ```
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a number as USD currency.
 * 
 * @param amount - Amount in dollars (not cents)
 * @returns Formatted currency string (e.g., "$45.00")
 * 
 * @example
 * ```tsx
 * formatCurrency(45) // "$45.00"
 * formatCurrency(123.45) // "$123.45"
 * ```
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Generates a random ID string for temporary use.
 * 
 * Note: This is not cryptographically secure and should only be used
 * for temporary IDs or keys where security is not a concern.
 * 
 * @returns Random alphanumeric string
 * 
 * @example
 * ```tsx
 * const tempId = generateId(); // "k3j4h5g6f7d8s9"
 * ```
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Creates a promise that resolves after the specified delay.
 *
 * Useful for adding delays in async functions, testing, or animations.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```tsx
 * await sleep(1000); // Wait 1 second
 * console.log('This runs after 1 second');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get timezone abbreviation (CST, EST, PST, etc.) from IANA timezone
 *
 * @param timezone - IANA timezone identifier (e.g., "America/Chicago")
 * @param date - Date to check (for DST awareness)
 * @returns Timezone abbreviation (e.g., "CST" or "CDT")
 *
 * @example
 * ```tsx
 * getTimezoneAbbreviation('America/Chicago', new Date()) // "CST" or "CDT"
 * getTimezoneAbbreviation('America/New_York', new Date()) // "EST" or "EDT"
 * ```
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatted = formatInTimeZone(date, timezone, 'zzz');
    return formatted;
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a date and time in a specific timezone with timezone abbreviation.
 *
 * Server-safe: Unlike toLocaleDateString/toLocaleTimeString which use server timezone (UTC in production),
 * this function formats dates in the specified timezone.
 *
 * @param date - Date to format
 * @param timezone - IANA timezone identifier (e.g., "America/Chicago")
 * @returns Formatted string (e.g., "Tuesday, December 10, 2024 at 4:00 PM CST")
 *
 * @example
 * ```tsx
 * formatDateTimeInTimezone(new Date(), 'America/Chicago')
 * // "Tuesday, December 10, 2024 at 4:00 PM CST"
 * ```
 */
export function formatDateTimeInTimezone(date: Date, timezone: string): string {
  const formattedDate = formatInTimeZone(date, timezone, 'EEEE, MMMM d, yyyy');
  const formattedTime = formatInTimeZone(date, timezone, 'h:mm a');
  const tzAbbr = getTimezoneAbbreviation(timezone, date);

  return `${formattedDate} at ${formattedTime} ${tzAbbr}`;
}

/**
 * Formats just the date portion in a specific timezone.
 *
 * @param date - Date to format
 * @param timezone - IANA timezone identifier
 * @returns Formatted date (e.g., "Tuesday, December 10, 2024")
 *
 * @example
 * ```tsx
 * formatDateInTimezone(new Date(), 'America/Chicago')
 * // "Tuesday, December 10, 2024"
 * ```
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'EEEE, MMMM d, yyyy');
}

/**
 * Formats just the time portion in a specific timezone with timezone abbreviation.
 *
 * Server-safe: Unlike toLocaleTimeString which uses server timezone,
 * this function formats time in the specified timezone.
 *
 * @param date - Date to format
 * @param timezone - IANA timezone identifier (e.g., "America/Chicago")
 * @returns Formatted time with timezone (e.g., "4:00 PM CST")
 *
 * @example
 * ```tsx
 * formatTimeInTimezone(new Date(), 'America/Chicago')
 * // "4:00 PM CST"
 * ```
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  const formattedTime = formatInTimeZone(date, timezone, 'h:mm a');
  const tzAbbr = getTimezoneAbbreviation(timezone, date);

  return `${formattedTime} ${tzAbbr}`;
}
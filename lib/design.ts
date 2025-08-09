// ========================================
// FILE: lib/design.ts (Design System Utilities)
// ========================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Role-based color utilities
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

// Button variant utilities
export function getButtonVariant(
  variant: "primary" | "secondary" | "role",
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
    default:
      return baseClasses;
  }
}

// Status badge utilities
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

// Format utilities
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100); // Convert from cents
}

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

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

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
    "font-ui font-semibold py-3 px-6 rounded-button shadow-button transition-colors duration-200 min-h-touch min-w-touch focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";

  switch (variant) {
    case "primary":
      return cn(baseClasses, "bg-cta-primary hover:bg-cta-hover text-white focus:ring-cta-primary");
    case "secondary":
      return cn(
        baseClasses,
        "bg-white border border-brand-gray text-brand-black hover:bg-gray-50 focus:ring-brand-turquoise"
      );
    case "role":
      if (!role)
        return cn(baseClasses, "bg-brand-gray hover:bg-gray-600 text-white focus:ring-brand-gray");
      
      // Use brand colors based on role
      switch (role) {
        case "STUDENT":
          return cn(baseClasses, "bg-student-primary hover:bg-student-hover text-white focus:ring-student-primary");
        case "TEACHER":
          return cn(baseClasses, "bg-teacher-primary hover:bg-teacher-hover text-white focus:ring-teacher-primary");
        case "ADMIN":
          return cn(baseClasses, "bg-admin-primary hover:bg-admin-hover text-white focus:ring-admin-primary");
        default:
          return cn(baseClasses, "bg-brand-gray hover:bg-gray-600 text-white focus:ring-brand-gray");
      }
    default:
      return baseClasses;
  }
}

// Status badge utilities
export function getStatusBadge(status: string) {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-ui font-medium";

  switch (status.toLowerCase()) {
    case "completed":
      return cn(baseClasses, "bg-green-100 text-green-800");
    case "scheduled":
      return cn(baseClasses, "bg-blue-100 text-blue-800");
    case "cancelled":
      return cn(baseClasses, "bg-red-100 text-red-800");
    case "missed":
      return cn(baseClasses, "bg-yellow-100 text-yellow-800");
    case "pending":
      return cn(baseClasses, "bg-yellow-100 text-yellow-800");
    case "failed":
      return cn(baseClasses, "bg-red-100 text-red-800");
    default:
      return cn(baseClasses, "bg-gray-100 text-gray-800");
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

/**
 * @fileoverview Reusable Button component with variants and role-based styling.
 * 
 * A flexible button component that supports different variants, sizes, and
 * role-based styling. Includes loading states and accessibility features.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { getButtonVariant } from "@/lib/design";
import type { Role } from "@prisma/client";

/**
 * Props for the Button component.
 * Extends standard HTML button attributes with custom styling options.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: "primary" | "secondary" | "role" | "destructive";
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** User role for role-based styling (when variant="role") */
  role?: Role;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button component with variant styling and loading states.
 * 
 * Features:
 * - Multiple visual variants (primary, secondary, role-based)
 * - Three sizes (sm, md, lg)
 * - Loading state with spinner
 * - Automatic disabled state when loading
 * - Role-based styling for user-specific actions
 * - Full accessibility support
 * 
 * @example
 * ```tsx
 * // Primary button
 * <Button variant="primary" onClick={handleClick}>
 *   Save Changes
 * </Button>
 * 
 * // Loading button
 * <Button loading={isSubmitting}>
 *   Submit Form
 * </Button>
 * 
 * // Role-specific styling
 * <Button variant="role" role="TEACHER">
 *   Teacher Action
 * </Button>
 * ```
 */
export function Button({
  variant = "primary",
  size = "md",
  role,
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // Size-specific styling classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm font-medium",
    md: "px-4 py-2 text-sm font-medium", 
    lg: "px-6 py-3 text-base font-medium",
  };

  return (
    <button
      className={cn(
        getButtonVariant(variant, role),
        sizeClasses[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

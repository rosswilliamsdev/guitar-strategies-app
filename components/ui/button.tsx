// ========================================
// FILE: components/ui/button.tsx
// ========================================
import React from "react";
import { cn, getButtonVariant } from "@/lib/design";
import type { Role } from "@prisma/client";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "role";
  size?: "sm" | "md" | "lg";
  role?: Role;
  loading?: boolean;
  children: React.ReactNode;
}

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

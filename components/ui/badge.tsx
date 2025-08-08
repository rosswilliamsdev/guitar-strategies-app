// ========================================
// FILE: components/ui/badge.tsx
// ========================================
import React from "react";
import { cn, getStatusBadge } from "@/lib/design";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "status";
  status?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  status,
  className,
  children,
  ...props
}: BadgeProps) {
  if (variant === "status" && status) {
    return (
      <span className={cn(getStatusBadge(status), className)} {...props}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-ui font-medium bg-brand-tiffany text-brand-black",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

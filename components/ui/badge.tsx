import React from "react";
import { cn } from "@/lib/design";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error";
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-muted text-muted-foreground border border-border",
    success: "bg-green-100 text-green-800 border border-green-200",
    warning: "bg-orange-100 text-orange-800 border border-orange-200",
    error: "bg-red-100 text-red-800 border border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

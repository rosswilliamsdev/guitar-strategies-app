// ========================================
// FILE: components/ui/textarea.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground" htmlFor={props.id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            // Base styling
            "w-full rounded-lg border border-border bg-background px-3 py-3",
            // Typography and spacing
            "text-sm leading-relaxed placeholder:text-muted-foreground",
            // Focus states
            "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            // Sizing and behavior
            "min-h-[120px] resize-vertical transition-colors duration-200",
            // Error state
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="text-xs text-muted-foreground">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

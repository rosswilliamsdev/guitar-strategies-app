// ========================================
// FILE: components/ui/textarea.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/design";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "input-field resize-vertical min-h-[100px]",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-ui-caption text-red-600">{error}</p>}
        {helper && !error && (
          <p className="text-ui-caption text-brand-gray">{helper}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

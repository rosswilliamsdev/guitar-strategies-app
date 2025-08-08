// ========================================
// FILE: components/ui/input.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/design";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "input-field",
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

Input.displayName = "Input";

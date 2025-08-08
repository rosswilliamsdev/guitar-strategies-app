// ========================================
// FILE: components/ui/select.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/design";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, helper, options, placeholder, className, ...props },
    ref
  ) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "input-field",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-ui-caption text-red-600">{error}</p>}
        {helper && !error && (
          <p className="text-ui-caption text-brand-gray">{helper}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

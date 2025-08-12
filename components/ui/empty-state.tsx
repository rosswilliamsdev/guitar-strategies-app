// ========================================
// FILE: components/ui/empty-state.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 px-4", className)}>
      {icon && (
        <div className="flex justify-center mb-4 text-brand-gray">{icon}</div>
      )}
      <h3 className="font-display text-display-sm text-brand-black mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-body text-brand-gray mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
}

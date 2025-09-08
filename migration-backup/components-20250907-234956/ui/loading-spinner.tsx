// ========================================
// FILE: components/ui/loading-spinner.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/design";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "white" | "muted";
}

export function LoadingSpinner({
  size = "md",
  variant = "primary",
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
    xl: "h-12 w-12 border-4",
  };

  const variantClasses = {
    primary: "border-primary border-t-transparent",
    white: "border-white border-t-transparent",
    muted: "border-muted-foreground border-t-transparent",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  spinnerSize?: "sm" | "md" | "lg" | "xl";
}

export function LoadingOverlay({
  text = "Loading...",
  spinnerSize = "lg",
  className,
  ...props
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={spinnerSize} />
        {text && (
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

export interface InlineLoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function InlineLoading({
  text = "Loading...",
  size = "md",
  className,
  ...props
}: InlineLoadingProps) {
  const sizeClasses = {
    sm: "gap-2 text-sm",
    md: "gap-2.5 text-base",
    lg: "gap-3 text-lg",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <LoadingSpinner size={size === "lg" ? "md" : "sm"} />
      {text && (
        <span className="text-muted-foreground animate-pulse">{text}</span>
      )}
    </div>
  );
}

export interface ButtonLoadingProps {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({
  loading,
  children,
  loadingText = "Loading...",
}: ButtonLoadingProps) {
  if (loading) {
    return (
      <span className="flex items-center gap-2">
        <LoadingSpinner size="sm" variant="white" />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

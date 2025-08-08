// ========================================
// FILE: components/ui/card.tsx
// ========================================
import React from "react";
import { cn } from "@/lib/design";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: React.ReactNode;
}

export function Card({
  hover = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("card", hover && "card-hover cursor-pointer", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-brand-tiffany pb-4 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-display-sm text-brand-black", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-body text-brand-black", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-brand-tiffany pt-4 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

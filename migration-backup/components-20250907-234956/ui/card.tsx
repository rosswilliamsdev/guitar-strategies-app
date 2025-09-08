/**
 * @fileoverview Card components for structured content layout.
 * 
 * Provides a set of card components following the design system:
 * - Card: Main container with shadow and border
 * - CardHeader: Header section with bottom border
 * - CardTitle: Styled heading for card titles
 * - CardContent: Main content area
 * - CardFooter: Footer section with top border
 */

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the main Card component.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show hover effects (shadow transition) */
  hover?: boolean;
  /** Card content */
  children: React.ReactNode;
}

/**
 * Main Card component providing a container with consistent styling.
 * 
 * Features:
 * - Consistent border radius, shadow, and padding
 * - Optional hover effects
 * - Background color from design system
 * - Responsive design support
 * 
 * @example
 * ```tsx
 * <Card hover>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Card content goes here
 *   </CardContent>
 * </Card>
 * ```
 */
export function Card({
  hover = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-6 shadow-sm",
        hover && "hover:shadow-md cursor-pointer transition-shadow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header component with bottom border separator.
 * Typically contains the card title and any header actions.
 * 
 * @example
 * ```tsx
 * <CardHeader>
 *   <CardTitle>Settings</CardTitle>
 *   <Button variant="secondary">Edit</Button>
 * </CardHeader>
 * ```
 */
export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-border pb-4 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card title component with consistent heading styling.
 * Renders as an h3 element with appropriate font weight and color.
 * 
 * @example
 * ```tsx
 * <CardTitle>User Profile</CardTitle>
 * ```
 */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-xl font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * Card content area for main content.
 * Provides consistent text styling and spacing.
 * 
 * @example
 * ```tsx
 * <CardContent>
 *   <p>This is the main content of the card.</p>
 * </CardContent>
 * ```
 */
export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-base text-foreground", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card footer component with top border separator.
 * Typically contains action buttons or additional metadata.
 * 
 * @example
 * ```tsx
 * <CardFooter>
 *   <Button>Save</Button>
 *   <Button variant="secondary">Cancel</Button>
 * </CardFooter>
 * ```
 */
export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-border pt-4 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

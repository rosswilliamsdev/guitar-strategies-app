import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  dotOnly?: boolean;
}

const priorityConfig = {
  5: {
    label: "Essential",
    dotClass: "bg-orange-600"
  },
  4: {
    label: "High Priority", 
    dotClass: "bg-green-600"
  },
  3: {
    label: "Recommended",
    dotClass: "bg-blue-600"
  },
  2: {
    label: "Optional",
    dotClass: "bg-gray-400"
  },
  1: {
    label: "Consider Later",
    dotClass: "bg-gray-500"
  }
};

export function PriorityBadge({ priority, showLabel = true, size = "md", dotOnly = false }: PriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig];
  
  if (!config) return null;

  const dotSizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const spacingClasses = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-2.5"
  };

  // Just the dot
  if (!showLabel || dotOnly) {
    return (
      <div className={cn("rounded-full", config.dotClass, dotSizeClasses[size])} />
    );
  }

  // macOS-style: dot + text
  return (
    <div className={cn("inline-flex items-center", spacingClasses[size])}>
      <div className={cn("rounded-full", config.dotClass, dotSizeClasses[size])} />
      <span className={cn("text-foreground", textSizeClasses[size])}>
        {config.label}
      </span>
    </div>
  );
}

export function PriorityDot({ priority, size = "md" }: { priority: number; size?: "sm" | "md" | "lg" }) {
  return <PriorityBadge priority={priority} showLabel={false} size={size} />;
}
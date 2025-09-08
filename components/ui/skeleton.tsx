import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}

function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}

function SkeletonText({
  lines = 3,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", {
            "w-full": i === 0,
            "w-5/6": i === 1,
            "w-4/6": i === 2,
            "w-3/6": i === 3,
            "w-2/6": i >= 4,
          })}
        />
      ))}
    </div>
  );
}

function SkeletonButton({
  className,
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-9 w-20",
    default: "h-10 w-24",
    lg: "h-11 w-32",
  };
  
  return (
    <Skeleton
      className={cn(
        "rounded-md",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

function SkeletonAvatar({
  className,
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  };
  
  return (
    <Skeleton
      className={cn(
        "rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex gap-4 pb-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn("h-4 flex-1", {
                  "w-20": colIndex === 0,
                  "w-32": colIndex === columns - 1,
                })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCalendar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Week days header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square">
            <Skeleton className="h-full w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonSchedule({
  className,
  days = 5,
  slotsPerDay = 4,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  days?: number;
  slotsPerDay?: number;
}) {
  return (
    <div className={cn("w-full space-y-4", className)} {...props}>
      {Array.from({ length: days }).map((_, dayIndex) => (
        <div key={dayIndex} className="space-y-2">
          <Skeleton className="h-6 w-32" /> {/* Day header */}
          <div className="space-y-2 pl-4">
            {Array.from({ length: slotsPerDay }).map((_, slotIndex) => (
              <div key={slotIndex} className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" /> {/* Time */}
                <Skeleton className="h-10 flex-1 max-w-xs" /> {/* Slot */}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonForm({
  fields = 4,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  fields?: number;
}) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );
}

function SkeletonDashboardCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm space-y-2",
        className
      )}
      {...props}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function SkeletonLessonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm space-y-2",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="pt-2">
        <SkeletonButton size="sm" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  SkeletonButton,
  SkeletonAvatar,
  SkeletonTable,
  SkeletonCalendar,
  SkeletonSchedule,
  SkeletonForm,
  SkeletonDashboardCard,
  SkeletonLessonCard,
};
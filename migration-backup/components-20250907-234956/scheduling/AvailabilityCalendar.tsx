"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  addDays,
  addWeeks,
  startOfWeek,
  isSameDay,
  isToday,
  isBefore,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/design";
import { Skeleton, SkeletonCalendar } from "@/components/ui/skeleton";
import { InlineLoading } from "@/components/ui/loading-spinner";
import { log, schedulerLog } from '@/lib/logger';

// Helper function to format timezone names for display
const formatTimezone = (timezone: string): string => {
  const timezoneMap: Record<string, string> = {
    "America/New_York": "Eastern Time (ET)",
    "America/Chicago": "Central Time (CT)", 
    "America/Denver": "Mountain Time (MT)",
    "America/Los_Angeles": "Pacific Time (PT)",
    "America/Anchorage": "Alaska Time (AKT)",
    "Pacific/Honolulu": "Hawaii Time (HST)",
    "America/Phoenix": "Arizona Time (MST)",
    "UTC": "UTC",
  };
  
  return timezoneMap[timezone] || timezone;
};

interface TimeSlot {
  start: Date;
  end: Date;
  duration: 30;
  price: number;
  available: boolean;
}

interface AvailabilityCalendarProps {
  teacherId: string;
  studentTimezone?: string;
  onBookSlot?: (slots: TimeSlot[], duration: 30 | 60) => Promise<void>;
  onBookRecurring?: (slots: TimeSlot[], duration: 30 | 60) => Promise<void>;
  loading?: boolean;
  readonly?: boolean;
  onSelectionChange?: (
    hasSelection: boolean,
    selectedSlots: TimeSlot[],
    bookingMode: "single" | "recurring"
  ) => void;
}

interface BookingConfirmationCardProps {
  bookingMode: "single" | "recurring";
  selectedSlots: TimeSlot[];
  loading: boolean;
  onClear: () => void;
  onBook: () => void;
  timezone: string;
}

function BookingConfirmationCard({
  bookingMode,
  selectedSlots,
  loading,
  onClear,
  onBook,
  timezone,
}: BookingConfirmationCardProps) {
  const hasSelection = selectedSlots.length > 0;
  
  return (
    <Card className={cn(
      "p-4 transition-colors duration-200",
      hasSelection 
        ? "border-primary bg-primary/5" 
        : "border-border bg-muted/30"
    )}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn(
            "font-medium transition-colors duration-200",
            hasSelection ? "text-foreground" : "text-muted-foreground"
          )}>
            {bookingMode === "single"
              ? "Confirm Booking"
              : "Confirm Weekly Lesson Time"}
          </h3>
          <div className={cn(
            "text-sm transition-colors duration-200",
            hasSelection ? "text-muted-foreground" : "text-muted-foreground/60"
          )}>
            {hasSelection ? (
              bookingMode === "recurring" ? (
                // For recurring bookings, show day and time without specific date
                selectedSlots.length === 1 ? (
                  <>
                    Every {format(selectedSlots[0].start, "EEEE")} at{" "}
                    {format(selectedSlots[0].start, "h:mm a")} {formatTimezone(timezone)}
                    <br />
                    (30 minutes weekly)
                  </>
                ) : (
                  <>
                    Every {format(selectedSlots[0].start, "EEEE")} from{" "}
                    {format(selectedSlots[0].start, "h:mm a")} to{" "}
                    {format(selectedSlots[1].end, "h:mm a")} {formatTimezone(timezone)}
                    <br />
                    (60 minutes weekly)
                  </>
                )
              ) : (
                // For single bookings, show full date and time
                selectedSlots.length === 1 ? (
                  <>
                    {format(selectedSlots[0].start, "EEEE, MMMM d")} at{" "}
                    {format(selectedSlots[0].start, "h:mm a")} {formatTimezone(timezone)}
                    <br />
                    (30 minutes)
                  </>
                ) : (
                  <>
                    {format(selectedSlots[0].start, "EEEE, MMMM d")} from{" "}
                    {format(selectedSlots[0].start, "h:mm a")} to{" "}
                    {format(selectedSlots[1].end, "h:mm a")} {formatTimezone(timezone)}
                    <br />
                    (60 minutes)
                  </>
                )
              )
            ) : (
              "Select time slots from the calendar below"
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClear}
            disabled={!hasSelection}
          >
            Clear
          </Button>
          <Button
            onClick={onBook}
            disabled={loading || !hasSelection}
            className={cn(
              "transition-all duration-200 min-w-[120px]",
              hasSelection
                ? "bg-primary hover:bg-turquoise-600"
                : "bg-muted-foreground/20 hover:bg-muted-foreground/20 cursor-not-allowed"
            )}
          >
            {loading ? (
              <InlineLoading text="Booking..." size="sm" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Book Time
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AvailabilityCalendar({
  teacherId,
  studentTimezone = "America/Chicago",
  onBookSlot,
  onBookRecurring,
  loading = false,
  readonly = false,
  onSelectionChange,
}: AvailabilityCalendarProps) {
  // Start from current week, but this is fine since we handle past slots in the backend
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [bookingMode, setBookingMode] = useState<"single" | "recurring">(
    "single"
  );

  const loadAvailableSlots = useCallback(async () => {
    setSlotsLoading(true);
    setError("");

    try {
      // For recurring bookings, get availability for the next week to show all possible times
      // For single bookings, use the selected week
      let startDate: Date;
      let endDate: Date;
      
      if (bookingMode === "recurring") {
        // For weekly lessons, always show next week's availability
        // This gives us a full week of availability patterns
        const nextWeek = startOfWeek(addWeeks(new Date(), 1));
        startDate = nextWeek;
        endDate = addDays(nextWeek, 6);
      } else {
        // For single bookings, use the current selected week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = currentWeek < today ? today : currentWeek;
        endDate = addDays(currentWeek, 6);
      }

      const url = `/api/availability/${teacherId}?` +
          `startDate=${startDate.toISOString()}&` +
          `endDate=${endDate.toISOString()}&` +
          `timezone=${studentTimezone}`;
      
      log.info('🔗 Fetching availability from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        log.error('❌ Availability API error:', {
        error: errorData instanceof Error ? errorData.message : String(errorData),
        stack: errorData instanceof Error ? errorData.stack : undefined
      });
        throw new Error(errorData.error || "Failed to load available slots");
      }

      const data = await response.json();
      log.info('✅ Availability data received:', data);
      console.log('🔍 Data structure:', {
        hasSlots: 'slots' in data,
        slotsType: typeof data.slots,
        slotsLength: Array.isArray(data.slots) ? data.slots.length : 'not array',
        keys: Object.keys(data)
      });

      // Parse dates from ISO strings - ensure slots exists and is an array
      // The API wraps the response in { success: true, data: { slots: [...] } }
      const slotsArray = data.data?.slots || data.slots || [];
      const parsedSlots = slotsArray.map((slot: { start: string; end: string; duration: 30 | 60; price: number; available: boolean }) => ({
        ...slot,
        start: new Date(slot.start),
        end: new Date(slot.end),
      }));

      log.info('🔍 Parsed slots:', parsedSlots.length, 'total');
      log.info('🔍 Available slots:', parsedSlots.filter(s => s.available).length);
      log.info('🔍 Sample slots:', parsedSlots.slice(0, 3));

      setSlots(parsedSlots);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load available slots";
      setError(errorMessage);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [currentWeek, teacherId, studentTimezone, bookingMode]);

  // Load available slots when dependencies change
  useEffect(() => {
    loadAvailableSlots();
  }, [loadAvailableSlots]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const hasSelection = selectedSlots.length > 0;
      onSelectionChange(hasSelection, selectedSlots, bookingMode);
    }
  }, [selectedSlots, bookingMode, onSelectionChange]);

  const handleBookSlots = async () => {
    if (!onBookSlot || readonly || selectedSlots.length === 0) return;

    try {
      const duration = selectedSlots.length === 1 ? 30 : 60;

      if (bookingMode === "single") {
        await onBookSlot(selectedSlots, duration);
      } else if (onBookRecurring) {
        await onBookRecurring(selectedSlots, duration);
      }

      // Reload slots after booking
      await loadAvailableSlots();
      setSelectedSlots([]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to book time";
      setError(errorMessage);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (readonly || !slot.available) return;

    const isSelected = selectedSlots.some(
      (s) => s.start.getTime() === slot.start.getTime()
    );

    if (isSelected) {
      // Deselect slot
      setSelectedSlots((prev) =>
        prev.filter((s) => s.start.getTime() !== slot.start.getTime())
      );
    } else {
      // Select slot
      if (selectedSlots.length === 0) {
        // First slot selection
        setSelectedSlots([slot]);
      } else if (selectedSlots.length === 1) {
        // Second slot selection - must be consecutive
        const firstSlot = selectedSlots[0];
        const timeDiff = Math.abs(
          slot.start.getTime() - firstSlot.start.getTime()
        );
        const thirtyMinutes = 30 * 60 * 1000;

        if (timeDiff === thirtyMinutes) {
          // Consecutive slot, add it
          const sortedSlots = [firstSlot, slot].sort(
            (a, b) => a.start.getTime() - b.start.getTime()
          );
          setSelectedSlots(sortedSlots);
        } else {
          // Non-consecutive, replace with new selection
          setSelectedSlots([slot]);
        }
      } else {
        // Already have 2 slots, replace with new selection
        setSelectedSlots([slot]);
      }
    }
  };

  const goToPreviousWeek = () => {
    const newWeek = addWeeks(currentWeek, -1);
    // Don't allow going to past weeks
    if (!isBefore(newWeek, startOfWeek(new Date()))) {
      setCurrentWeek(newWeek);
    }
  };

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    // Limit to 3 weeks in advance
    const maxWeek = addWeeks(new Date(), 3);
    if (!isBefore(maxWeek, newWeek)) {
      setCurrentWeek(newWeek);
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date()));
  };


  const getDaysOfWeek = () => {
    const days = [];
    if (bookingMode === "recurring") {
      // For weekly lessons, use next week to get fresh availability
      const nextWeek = startOfWeek(addWeeks(new Date(), 1));
      for (let i = 0; i < 7; i++) {
        days.push(addDays(nextWeek, i));
      }
    } else {
      // For single bookings, use the current selected week
      for (let i = 0; i < 7; i++) {
        days.push(addDays(currentWeek, i));
      }
    }
    return days;
  };

  const getSlotsForDay = (date: Date) => {
    const daySlots = slots
      .filter(
        (slot) =>
          isSameDay(slot.start, date) && slot.available
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Debug logging for specific days
    if (daySlots.length > 0 || date.getDate() === 1) { // Sep 1st or any day with slots
      log.info('🔍 Slots for ${date.toDateString()}:', daySlots.length, daySlots.slice(0, 2));
    }
    
    return daySlots;
  };

  const isCurrentWeek = isSameDay(currentWeek, startOfWeek(new Date()));
  const canGoBack = !isSameDay(currentWeek, startOfWeek(new Date()));
  const canGoForward = isBefore(currentWeek, addWeeks(new Date(), 2));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Select one 30-minute slot, or two consecutive slots for a 60-minute
            session
          </p>
          
        </div>

        <div className="flex items-center gap-2">
          {!readonly && (
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setBookingMode("single")}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  bookingMode === "single"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                Single Session
              </button>
              <button
                onClick={() => setBookingMode("recurring")}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  bookingMode === "recurring"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
              >
                Weekly Lessons
              </button>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadAvailableSlots}
            disabled={slotsLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4", slotsLoading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Week Navigation - Only show for single session bookings */}
      {bookingMode === "single" ? (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={!canGoBack || slotsLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous Week
          </Button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(currentWeek, "MMM d")} -{" "}
              {format(addDays(currentWeek, 6), "MMM d, yyyy")}
            </span>
            {!isCurrentWeek && (
              <Button variant="secondary" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={goToNextWeek}
            disabled={!canGoForward || slotsLoading}
          >
            Next Week
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        // For weekly lessons, show a simple header
        <div>
          
        </div>
      )}



      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Top Booking Confirmation */}
      {!readonly && (
        <BookingConfirmationCard
          bookingMode={bookingMode}
          selectedSlots={selectedSlots}
          loading={loading}
          onClear={() => setSelectedSlots([])}
          onBook={handleBookSlots}
          timezone={studentTimezone}
        />
      )}

      {/* Calendar Grid */}
      {slotsLoading ? (
        <div className="space-y-4">
          {/* Loading skeleton for calendar */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="space-y-2">
                {/* Day header skeleton */}
                <Skeleton className="h-16 w-full rounded-lg" />
                {/* Time slots skeleton */}
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, slotIndex) => (
                    <Skeleton key={slotIndex} className="h-14 w-full rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {getDaysOfWeek().map((date, index) => {
            const daySlots = getSlotsForDay(date);
            // Only dim past days for single bookings, not for recurring
            const isPast = bookingMode === "single" && isBefore(date, new Date()) && !isToday(date);

            return (
              <div
                key={index}
                className={cn("space-y-2", isPast && "opacity-50")}
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "text-center p-2 border rounded-lg bg-muted/50",
                    bookingMode === "single" && isToday(date) && "border-primary"
                  )}
                >
                  {bookingMode === "recurring" ? (
                    // Weekly lessons mode: show full day name only (no dates)
                    <div className="py-2">
                      <div className="text-lg font-semibold">
                        {format(date, "EEEE")}
                      </div>
                    </div>
                  ) : (
                    // Single session mode: show day abbreviation and date
                    <>
                      <div className="text-sm font-medium">
                        {format(date, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          isToday(date) && "text-primary"
                        )}
                      >
                        {format(date, "d")}
                      </div>
                    </>
                  )}
                </div>

                {/* Time Slots */}
                <div className="space-y-1">
                  {daySlots.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <div className="text-xs">No slots available</div>
                    </div>
                  ) : (
                    daySlots.map((slot, slotIndex) => {
                      const isSelected = selectedSlots.some(
                        (s) => s.start.getTime() === slot.start.getTime()
                      );
                      return (
                        <button
                          key={slotIndex}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isPast || loading || readonly}
                          className={cn(
                            "w-full p-2 text-left border rounded transition-colors",
                            "hover:bg-primary/5 hover:border-primary",
                            isSelected && "bg-primary/10 border-primary",
                            isPast && "cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {format(slot.start, "h:mm a")}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-background"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-primary/10 border-primary"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-muted"></div>
          <span>Unavailable</span>
        </div>
      </div>

      {/* Bottom Booking Confirmation */}
      {!readonly && (
        <BookingConfirmationCard
          bookingMode={bookingMode}
          selectedSlots={selectedSlots}
          loading={loading}
          onClear={() => setSelectedSlots([])}
          onBook={handleBookSlots}
          timezone={studentTimezone}
        />
      )}
    </div>
  );
}

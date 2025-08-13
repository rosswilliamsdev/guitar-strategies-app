"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";

interface UpcomingLesson {
  id: string;
  date: Date;
  duration: number;
  timezone?: string;
  price?: number;
  status: string;
  student: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface TeacherAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface BlockedTime {
  id: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
}

interface LessonSettings {
  id: string;
  allows30Min: boolean;
  allows60Min: boolean;
  price30Min: number;
  price60Min: number;
  advanceBookingDays: number;
}

interface TeacherScheduleViewProps {
  teacherId: string;
  upcomingLessons: UpcomingLesson[];
  availability: TeacherAvailability[];
  blockedTimes: BlockedTime[];
  lessonSettings: LessonSettings | null;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Generate 30-minute time slots based on teacher's availability
const generateTimeSlots = (availability: TeacherAvailability[]): string[] => {
  if (availability.length === 0) {
    // Fallback to default hours if no availability set
    return generateDefaultTimeSlots();
  }

  // Find earliest start time and latest end time from availability
  let earliestStart = "23:59";
  let latestEnd = "00:00";

  availability.forEach((slot) => {
    if (slot.isActive) {
      if (slot.startTime < earliestStart) {
        earliestStart = slot.startTime;
      }
      if (slot.endTime > latestEnd) {
        latestEnd = slot.endTime;
      }
    }
  });

  // Convert times to hour/minute for slot generation
  const [startHour, startMinute] = earliestStart.split(":").map(Number);
  const [endHour, endMinute] = latestEnd.split(":").map(Number);

  // Round start time down to nearest 30-minute increment
  const roundedStartMinute = startMinute < 30 ? 0 : 30;
  let currentHour =
    startMinute < 30
      ? startHour
      : startMinute === 30
      ? startHour
      : startHour + 1;
  let currentMinute = roundedStartMinute;

  // If we rounded up past the start hour, adjust
  if (startMinute > 30) {
    currentHour = startHour + 1;
    currentMinute = 0;
  } else if (startMinute <= 30) {
    currentHour = startHour;
    currentMinute = startMinute < 30 ? 0 : 30;
  }

  const slots: string[] = [];

  // Generate slots from earliest start to latest end
  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMinute < endMinute)
  ) {
    const time = new Date();
    time.setHours(currentHour, currentMinute, 0, 0);
    slots.push(format(time, "h:mm a"));

    // Increment by 30 minutes
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  return slots;
};

// Fallback default time slots (12 PM to 8:30 PM)
const generateDefaultTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 12; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Skip 8:30 PM in the loop since we'll add it separately
      if (hour === 20 && minute === 30) continue;

      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      slots.push(format(time, "h:mm a"));
    }
  }
  // Add the final 8:30 PM slot
  const finalTime = new Date();
  finalTime.setHours(20, 30, 0, 0);
  slots.push(format(finalTime, "h:mm a"));

  return slots;
};

// Check if a time slot is within an availability window
const isTimeInAvailability = (
  timeSlot: string,
  availability: TeacherAvailability[]
): boolean => {
  const slotTime = new Date();
  const [time, period] = timeSlot.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let hour24 = hours;
  if (period === "PM" && hours !== 12) hour24 += 12;
  if (period === "AM" && hours === 12) hour24 = 0;

  slotTime.setHours(hour24, minutes, 0, 0);
  const slotTimeString = format(slotTime, "HH:mm");

  return availability.some((slot) => {
    return slotTimeString >= slot.startTime && slotTimeString < slot.endTime;
  });
};

// Check if a lesson is scheduled at a specific time slot
const getLessonAtTime = (
  day: Date,
  timeSlot: string,
  lessons: UpcomingLesson[]
): UpcomingLesson | null => {
  return (
    lessons.find((lesson) => {
      const lessonTime = format(new Date(lesson.date), "h:mm a");
      return lessonTime === timeSlot;
    }) || null
  );
};

// Check if time slot is blocked
const isTimeBlocked = (
  day: Date,
  timeSlot: string,
  blockedTimes: BlockedTime[]
): boolean => {
  const slotTime = new Date();
  const [time, period] = timeSlot.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let hour24 = hours;
  if (period === "PM" && hours !== 12) hour24 += 12;
  if (period === "AM" && hours === 12) hour24 = 0;

  const slotStart = new Date(day);
  slotStart.setHours(hour24, minutes, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  return blockedTimes.some((blocked) => {
    const blockedStart = new Date(blocked.startTime);
    const blockedEnd = new Date(blocked.endTime);
    return slotStart < blockedEnd && slotEnd > blockedStart;
  });
};

type SlotStatus =
  | { type: "not-available" }
  | { type: "open" }
  | { type: "booked"; lesson: UpcomingLesson }
  | { type: "blocked"; reason?: string };

// Determine the status of a time slot
const getSlotStatus = (
  day: Date,
  timeSlot: string,
  availability: TeacherAvailability[],
  lessons: UpcomingLesson[],
  blockedTimes: BlockedTime[]
): SlotStatus => {
  // Check if time is within teacher availability
  if (!isTimeInAvailability(timeSlot, availability)) {
    return { type: "not-available" };
  }

  // Check if blocked
  if (isTimeBlocked(day, timeSlot, blockedTimes)) {
    const blocked = blockedTimes.find((b) => isTimeBlocked(day, timeSlot, [b]));
    return { type: "blocked", reason: blocked?.reason };
  }

  // Check if booked
  const lesson = getLessonAtTime(day, timeSlot, lessons);
  if (lesson) {
    return { type: "booked", lesson };
  }

  // Available and open
  return { type: "open" };
};

// Render content for a time slot based on its status
const renderSlotContent = (status: SlotStatus): React.ReactNode => {
  switch (status.type) {
    case "not-available":
      return (
        <div className="w-20 h-8 bg-gray-50 rounded flex items-center justify-center">
          <span className="text-xs text-gray-400">—</span>
        </div>
      );

    case "open":
      return (
        <div className="w-20 h-8 bg-green-50 border border-green-200 rounded flex items-center justify-center">
          <span className="text-xs text-green-700 font-medium">Open</span>
        </div>
      );

    case "booked":
      return (
        <Link href="/lessons/new">
          <div className="w-40 h-8 bg-blue-100 border border-blue-300 rounded px-2 cursor-pointer hover:bg-blue-200 transition-colors flex items-center justify-between">
            <p className="text-xs font-medium text-blue-900 truncate">
              {format(new Date(status.lesson.date), "h:mm a")}
            </p>
            <p className="text-xs font-medium text-blue-900 truncate">
              {status.lesson.student.user.name}
            </p>
          </div>
        </Link>
      );

    case "blocked":
      return (
        <div className="w-20 h-8 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <span
            className="text-xs text-red-700"
            title={status.reason || "Blocked"}
          >
            🚫
          </span>
        </div>
      );

    default:
      return null;
  }
};

export function TeacherScheduleView({
  teacherId,
  upcomingLessons,
  availability,
  blockedTimes,
  lessonSettings,
}: TeacherScheduleViewProps) {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Day view navigation
  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Week view navigation
  const currentWeek = currentDate;
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  // Get lessons for a specific day
  const getLessonsForDay = (day: Date) => {
    return upcomingLessons.filter((lesson) =>
      isSameDay(new Date(lesson.date), day)
    );
  };

  // Get availability for a specific day of week
  const getAvailabilityForDay = (dayOfWeek: number) => {
    // Convert Monday-first index (0-6) to JavaScript's Sunday-first system (0-6)
    // Monday=0 -> Sunday=1, Tuesday=1 -> Monday=2, ..., Sunday=6 -> Saturday=0
    const jsDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    return availability.filter(
      (slot) => slot.dayOfWeek === jsDay && slot.isActive
    );
  };

  // Get blocked times for a specific day
  const getBlockedTimesForDay = (day: Date) => {
    return blockedTimes.filter((blocked) =>
      isSameDay(new Date(blocked.startTime), day)
    );
  };

  return (
    <div className="space-y-6">
      {/* Schedule View */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          {/* Date display (only for day view) */}
          <div className="flex-1">
            {viewMode === "day" && (
              <h3 className="text-lg font-semibold text-foreground">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </h3>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 mr-4">
              <Button
                variant={viewMode === "day" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("day")}
              >
                Day
              </Button>
              <Button
                variant={viewMode === "week" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
            </div>

            {/* Navigation */}
            <Button
              variant="secondary"
              size="sm"
              onClick={viewMode === "day" ? goToPreviousDay : goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={viewMode === "day" ? goToNextDay : goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === "day" ? (
          /* Daily view */
          <div className="max-w-2xl">
            {/* Time slots for the day */}
            <div className="space-y-3">
              {(() => {
                // Convert JavaScript day (0=Sunday, 1=Monday, ...) to our Monday-first system (0=Monday, 1=Tuesday, ...)
                const currentDayIndex =
                  currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
                const dayAvailability = getAvailabilityForDay(currentDayIndex);
                const dayLessons = getLessonsForDay(currentDate);
                const dayBlockedTimes = getBlockedTimesForDay(currentDate);

                // Generate time slots only for this specific day's availability
                const dayTimeSlots = generateTimeSlots(dayAvailability);

                return dayTimeSlots.map((timeSlot) => {
                  const slotStatus = getSlotStatus(
                    currentDate,
                    timeSlot,
                    dayAvailability,
                    dayLessons,
                    dayBlockedTimes
                  );

                  return (
                    <div
                      key={timeSlot}
                      className="flex items-center justify-start gap-4"
                    >
                      {/* Time label */}
                      <div className="w-24 text-sm font-medium text-muted-foreground text-left">
                        {timeSlot}
                      </div>

                      {/* Slot content */}
                      <div className="flex items-center">
                        {renderSlotContent(slotStatus)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          /* Weekly view */
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row with days */}
              <div className="grid grid-cols-8 gap-px bg-border">
                <div className="bg-background p-3 text-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Time
                  </span>
                </div>
                {weekDays.map((day, dayIndex) => {
                  const isToday = isSameDay(day, new Date());
                  const dayAvailability = getAvailabilityForDay(dayIndex);
                  const isAvailable = dayAvailability.length > 0;

                  return (
                    <div
                      key={day.toISOString()}
                      className="bg-background p-3 text-center"
                    >
                      <h3
                        className={`font-medium text-sm ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {DAYS_OF_WEEK[dayIndex].substring(0, 3)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {format(day, "MMM d")}
                      </p>
                      {isToday && (
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20 mt-1">
                          Today
                        </Badge>
                      )}
                      {!isAvailable && (
                        <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-200 mt-1">
                          Not Available
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time slots grid */}
              <div className="grid grid-cols-8 gap-px bg-border">
                {generateTimeSlots(availability).map((timeSlot) => (
                  <React.Fragment key={timeSlot}>
                    {/* Time column */}
                    <div className="bg-background p-2 text-center border-r">
                      <span className="text-xs text-muted-foreground">
                        {timeSlot}
                      </span>
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day, dayIndex) => {
                      const dayAvailability = getAvailabilityForDay(dayIndex);
                      const dayLessons = getLessonsForDay(day);
                      const dayBlockedTimes = getBlockedTimesForDay(day);

                      const slotStatus = getSlotStatus(
                        day,
                        timeSlot,
                        dayAvailability,
                        dayLessons,
                        dayBlockedTimes
                      );

                      return (
                        <div
                          key={`${day.toISOString()}-${timeSlot}`}
                          className="bg-background min-h-[40px] p-1"
                        >
                          {renderSlotContent(slotStatus)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

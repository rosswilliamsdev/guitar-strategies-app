"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookStudentModal } from "./book-student-modal";
import { LessonManagementModal } from "./lesson-management-modal";
import {
  Calendar,
  Clock,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
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

interface Student {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TeacherScheduleViewProps {
  teacherId: string;
  upcomingLessons: UpcomingLesson[];
  availability: TeacherAvailability[];
  blockedTimes: BlockedTime[];
  lessonSettings: LessonSettings | null;
  students: Student[];
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
const renderSlotContent = (
  status: SlotStatus, 
  day: Date, 
  timeSlot: string, 
  onOpenSlotClick?: () => void,
  onLessonClick?: (lesson: UpcomingLesson) => void
): React.ReactNode => {
  switch (status.type) {
    case "not-available":
      return (
        <div className="w-full h-8 bg-gray-50 rounded flex items-center justify-center mx-1">
          <span className="text-xs text-gray-400">—</span>
        </div>
      );

    case "open":
      return (
        <button
          onClick={onOpenSlotClick}
          className="w-full h-8 bg-green-50 border border-green-200 rounded flex items-center justify-center hover:bg-green-100 transition-colors cursor-pointer group mx-1"
          title="Click to book a student"
        >
          <Plus className="h-3 w-3 text-green-700 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs text-green-700 font-medium">Open</span>
        </button>
      );

    case "booked":
      // Check if the lesson is cancelled
      if (status.lesson.status === 'CANCELLED') {
        return (
          <button
            onClick={() => onLessonClick?.(status.lesson)}
            className="w-full h-8 bg-red-100 border border-red-300 rounded px-2 hover:bg-red-200 transition-colors cursor-pointer flex items-center justify-center mx-1"
            title="Click to manage cancelled lesson"
          >
            <p className="text-xs font-medium text-red-900 truncate">
              {status.lesson.student.user.name}
            </p>
          </button>
        );
      }
      
      return (
        <button
          onClick={() => onLessonClick?.(status.lesson)}
          className="w-full h-8 bg-blue-100 border border-blue-300 rounded px-2 cursor-pointer hover:bg-blue-200 transition-colors flex items-center justify-center mx-1"
          title="Click to manage lesson"
        >
          <p className="text-xs font-medium text-blue-900 truncate">
            {status.lesson.student.user.name}
          </p>
        </button>
      );

    case "blocked":
      return (
        <div className="w-full h-8 bg-red-50 border border-red-200 rounded flex items-center justify-center mx-1">
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
  students,
}: TeacherScheduleViewProps) {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    date: Date | null;
    time: string | null;
  }>({
    isOpen: false,
    date: null,
    time: null,
  });

  const [lessonModal, setLessonModal] = useState<{
    isOpen: boolean;
    lesson: UpcomingLesson | null;
  }>({
    isOpen: false,
    lesson: null,
  });

  const handleBookStudent = async (studentId: string, type: "single" | "recurring") => {
    if (!bookingModal.date || !bookingModal.time) return;

    // Convert time string to proper format
    const [time, period] = bookingModal.time.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour24 = hours;
    if (period === "PM" && hours !== 12) hour24 += 12;
    if (period === "AM" && hours === 12) hour24 = 0;

    const lessonDate = new Date(bookingModal.date);
    lessonDate.setHours(hour24, minutes, 0, 0);

    const response = await fetch("/api/lessons/book-for-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        studentId,
        date: lessonDate.toISOString(),
        duration: 30, // Default to 30 minutes
        type,
        indefinite: type === "recurring", // True for indefinite recurring lessons
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to book lesson");
    }

    // Refresh the page to show the new booking
    window.location.reload();
  };

  const handleLessonUpdate = () => {
    // Refresh the page to show the updated lesson
    window.location.reload();
  };

  // Day view navigation
  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Week view navigation
  const currentWeek = currentDate;
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  // Generate array of days for the week
  const weekDays: Date[] = [];
  let currentDay = new Date(startDate);
  while (currentDay <= endDate) {
    weekDays.push(new Date(currentDay));
    currentDay = addDays(currentDay, 1);
  }

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
            {(() => {
              // Convert JavaScript day (0=Sunday, 1=Monday, ...) to our Monday-first system (0=Monday, 1=Tuesday, ...)
              const currentDayIndex =
                currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
              const dayAvailability = getAvailabilityForDay(currentDayIndex);
              const dayLessons = getLessonsForDay(currentDate);
              const dayBlockedTimes = getBlockedTimesForDay(currentDate);

              // Generate time slots for this specific day's availability
              const dayTimeSlots = dayAvailability.length > 0 
                ? generateTimeSlots(dayAvailability)
                : [];

              // Check if there are any lessons booked for this day or if teacher has availability set
              if (dayLessons.length === 0 && dayTimeSlots.length === 0) {
                return (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                      <h3 className="text-lg font-medium text-foreground">
                        No availability set
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        You haven't set your availability for {format(currentDate, "EEEE")}s
                      </p>
                      <Link href="/settings">
                        <Button variant="primary" size="sm" className="mt-2">
                          <Settings className="h-4 w-4 mr-2" />
                          Set Availability
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dayTimeSlots.map((timeSlot) => {
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
                        <div className="flex items-center flex-1">
                          {renderSlotContent(
                            slotStatus,
                            currentDate,
                            timeSlot,
                            () => setBookingModal({ isOpen: true, date: currentDate, time: timeSlot }),
                            (lesson) => setLessonModal({ isOpen: true, lesson })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
                {weekDays.map((day: Date, dayIndex: number) => {
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

              {/* Time slots grid or no lessons message */}
              <div className="grid grid-cols-8 gap-px bg-border">
                {(() => {
                  // Check if teacher has any availability set
                  const hasAvailability = availability.some(slot => slot.isActive);
                  
                  if (!hasAvailability) {
                    return (
                      <div className="col-span-8 bg-background p-12">
                        <div className="text-center space-y-3">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                          <h3 className="text-lg font-medium text-foreground">
                            No availability set
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            You haven't set your weekly availability yet
                          </p>
                          <Link href="/settings">
                            <Button variant="primary" size="sm" className="mt-2">
                              <Settings className="h-4 w-4 mr-2" />
                              Set Availability
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  return generateTimeSlots(availability).map((timeSlot) => (
                    <React.Fragment key={timeSlot}>
                      {/* Time column */}
                      <div className="bg-background p-2 text-center border-r">
                        <span className="text-xs text-muted-foreground">
                          {timeSlot}
                        </span>
                      </div>

                      {/* Day columns */}
                      {weekDays.map((day: Date, dayIndex: number) => {
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
                            className="bg-background min-h-[40px] p-1 flex items-center"
                          >
                            {renderSlotContent(
                              slotStatus,
                              day,
                              timeSlot,
                              () => setBookingModal({ isOpen: true, date: day, time: timeSlot }),
                              (lesson) => setLessonModal({ isOpen: true, lesson })
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Booking Modal */}
      {bookingModal.date && bookingModal.time && (
        <BookStudentModal
          isOpen={bookingModal.isOpen}
          onClose={() => setBookingModal({ isOpen: false, date: null, time: null })}
          date={bookingModal.date}
          time={bookingModal.time}
          students={students}
          onBook={handleBookStudent}
        />
      )}

      {/* Lesson Management Modal */}
      {lessonModal.lesson && (
        <LessonManagementModal
          isOpen={lessonModal.isOpen}
          onClose={() => setLessonModal({ isOpen: false, lesson: null })}
          lesson={lessonModal.lesson}
          onUpdate={handleLessonUpdate}
        />
      )}
    </div>
  );
}

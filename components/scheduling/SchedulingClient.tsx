"use client";

import { BookingSection } from '@/components/scheduling/BookingSection';
import { WeeklyLessonDisplay } from '@/components/scheduling/WeeklyLessonDisplay';
import { LessonCancellationCard } from '@/components/scheduling/LessonCancellationCard';

interface RecurringSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  monthlyRate: number;
  status: string;
  teacher: {
    id: string;
    user: {
      name: string;
    };
  };
  subscriptions: {
    status: string;
    billingRecords: {
      month: string;
    }[];
  }[];
}

interface RecurringLesson {
  id: string;
  date: string;
  duration: number;
  status: string;
  isRecurring: boolean;
}

interface SchedulingClientProps {
  teacherId: string;
  teacherName: string;
  recurringSlots: RecurringSlot[];
  recurringLessons: RecurringLesson[];
  studentId: string;
  studentTimezone: string;
}

export function SchedulingClient({
  teacherId,
  teacherName,
  recurringSlots,
  recurringLessons,
  studentId,
  studentTimezone,
}: SchedulingClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Scheduling
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your lesson schedule and book additional lessons
          </p>
        </div>

        {/* Weekly Lesson Time Display and Cancellation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyLessonDisplay
            recurringSlots={recurringSlots.map((slot: any) => ({
              ...slot,
              perLessonPrice: slot.monthlyRate || 0
            }))}
            teacherName={teacherName}
            recurringLessons={recurringLessons.map((lesson: any) => ({
              ...lesson,
              date: new Date(lesson.date)
            }))}
          />
          <LessonCancellationCard 
            studentId={studentId}
          />
        </div>

        {/* Individual Lesson Booking */}
        <BookingSection
          teacherId={teacherId}
          teacherName={teacherName}
          hasRecurringSlots={recurringSlots.length > 0 || recurringLessons.length > 0}
          studentTimezone={studentTimezone}
        />
      </div>
    </div>
  );
}
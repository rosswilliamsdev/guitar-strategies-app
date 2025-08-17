import { addWeeks, startOfMonth, endOfMonth, format, addDays } from 'date-fns';

/**
 * Calculate how many times a weekly recurring slot occurs in a given month
 */
export function calculateMonthlyOccurrences(dayOfWeek: number, month: string): number {
  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, monthNum - 1));
  const monthEnd = endOfMonth(new Date(year, monthNum - 1));
  
  // Generate days in month manually
  const daysInMonth: Date[] = [];
  let currentDay = new Date(monthStart);
  while (currentDay <= monthEnd) {
    daysInMonth.push(new Date(currentDay));
    currentDay = addDays(currentDay, 1);
  }
  
  // Count how many times the specific day of week occurs
  return daysInMonth.filter((date: Date) => date.getDay() === dayOfWeek).length;
}

/**
 * Calculate monthly rate based on lesson rate and expected occurrences
 * For now, using a simple average of 4.33 lessons per month (52 weeks / 12 months)
 */
export function getMonthlyRate(lessonRate: number, dayOfWeek: number): number {
  // Average lessons per month for a weekly recurring slot
  const averageLessonsPerMonth = 52 / 12; // ~4.33
  return Math.round(lessonRate * averageLessonsPerMonth);
}

/**
 * Calculate exact monthly rate for a specific month
 */
export function getExactMonthlyRate(lessonRate: number, dayOfWeek: number, month: string): number {
  const occurrences = calculateMonthlyOccurrences(dayOfWeek, month);
  return lessonRate * occurrences;
}

/**
 * Calculate billing for a specific month and slot
 */
export function calculateMonthlyBilling(
  monthlyRate: number,
  dayOfWeek: number,
  month: string
): {
  expectedLessons: number;
  ratePerLesson: number;
  totalAmount: number;
} {
  const expectedLessons = calculateMonthlyOccurrences(dayOfWeek, month);
  const ratePerLesson = expectedLessons > 0 ? Math.round(monthlyRate / expectedLessons) : 0;
  const totalAmount = ratePerLesson * expectedLessons;

  return {
    expectedLessons,
    ratePerLesson,
    totalAmount
  };
}

/**
 * Get all months between start and end month (inclusive)
 */
export function getMonthsBetween(startMonth: string, endMonth?: string): string[] {
  const months: string[] = [];
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  
  let currentDate = new Date(startYear, startMonthNum - 1, 1);
  let endDate: Date;
  
  if (endMonth) {
    const [endYear, endMonthNum] = endMonth.split('-').map(Number);
    endDate = new Date(endYear, endMonthNum - 1, 1);
  } else {
    // Default to 12 months ahead if no end date
    endDate = new Date(startYear + 1, startMonthNum - 1, 1);
  }

  while (currentDate <= endDate) {
    months.push(format(currentDate, 'yyyy-MM'));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return months;
}

/**
 * Check if a slot conflicts with existing active slots
 */
export async function checkSlotConflict(
  teacherId: string,
  dayOfWeek: number,
  startTime: string,
  duration: number,
  excludeSlotId?: string
): Promise<boolean> {
  const { prisma } = await import('@/lib/db');
  
  const conflictingSlot = await prisma.recurringSlot.findFirst({
    where: {
      teacherId,
      dayOfWeek,
      startTime,
      duration,
      status: 'ACTIVE',
      ...(excludeSlotId && { id: { not: excludeSlotId } })
    }
  });

  return !!conflictingSlot;
}

/**
 * Generate lessons for a recurring slot for a specific month
 */
export function generateLessonsForMonth(
  slotId: string,
  teacherId: string,
  studentId: string,
  dayOfWeek: number,
  startTime: string,
  duration: number,
  month: string,
  timezone: string = 'America/New_York'
): Array<{
  date: Date;
  duration: number;
  timezone: string;
  recurringSlotId: string;
  teacherId: string;
  studentId: string;
  status: 'SCHEDULED';
}> {
  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, monthNum - 1));
  const monthEnd = endOfMonth(new Date(year, monthNum - 1));
  
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  });

  const lessons = [];
  const [hours, minutes] = startTime.split(':').map(Number);

  for (const date of daysInMonth) {
    if (date.getDay() === dayOfWeek) {
      const lessonDate = new Date(date);
      lessonDate.setHours(hours, minutes, 0, 0);

      lessons.push({
        date: lessonDate,
        duration,
        timezone,
        recurringSlotId: slotId,
        teacherId,
        studentId,
        status: 'SCHEDULED' as const
      });
    }
  }

  return lessons;
}

/**
 * Calculate refund amount for partial month cancellation
 */
export function calculateRefundAmount(
  monthlyRate: number,
  dayOfWeek: number,
  month: string,
  cancelDate: Date
): {
  totalLessons: number;
  remainingLessons: number;
  refundAmount: number;
} {
  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, monthNum - 1));
  const monthEnd = endOfMonth(new Date(year, monthNum - 1));
  
  // Generate all days in month manually
  const allDays: Date[] = [];
  let currentDay = new Date(monthStart);
  while (currentDay <= monthEnd) {
    allDays.push(new Date(currentDay));
    currentDay = addDays(currentDay, 1);
  }

  const totalLessons = allDays.filter((date: Date) => date.getDay() === dayOfWeek).length;
  const remainingLessons = allDays.filter((date: Date) => 
    date.getDay() === dayOfWeek && date >= cancelDate
  ).length;

  const ratePerLesson = totalLessons > 0 ? monthlyRate / totalLessons : 0;
  const refundAmount = Math.round(ratePerLesson * remainingLessons);

  return {
    totalLessons,
    remainingLessons,
    refundAmount
  };
}

/**
 * Validate that start month is not in the past
 */
export function validateStartMonth(startMonth: string): boolean {
  const [year, monthNum] = startMonth.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  return startDate >= currentMonth;
}

/**
 * Validate that end month is after start month
 */
export function validateEndMonth(startMonth: string, endMonth: string): boolean {
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  const [endYear, endMonthNum] = endMonth.split('-').map(Number);
  
  const startDate = new Date(startYear, startMonthNum - 1, 1);
  const endDate = new Date(endYear, endMonthNum - 1, 1);
  
  return endDate > startDate;
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

/**
 * Format time for display
 */
export function formatSlotTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes);
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + duration);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
}
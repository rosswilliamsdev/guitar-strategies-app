import { prisma } from '@/lib/db'
import { 
  format, 
  addDays, 
  addWeeks,
  startOfDay, 
  endOfDay, 
  isAfter, 
  isBefore, 
  addMinutes,
  startOfWeek,
  setHours,
  setMinutes,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay
} from 'date-fns'
import { 
  toZonedTime,
  formatInTimeZone 
} from 'date-fns-tz'

interface TimeSlot {
  start: Date
  end: Date
  duration: 30 | 60
  price: number
  available: boolean
}

// Helper function to calculate how many times a specific day of week occurs in a month
function getOccurrencesInMonth(dayOfWeek: number, month: Date): number {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  return allDays.filter(day => getDay(day) === dayOfWeek).length
}

interface BookingData {
  teacherId: string
  studentId: string
  date: Date
  duration: 30 | 60
  timezone: string
  isRecurring?: boolean
  recurringWeeks?: number
}

interface AvailabilitySlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export async function getAvailableSlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  studentTimezone: string
): Promise<TimeSlot[]> {
  // Get teacher profile with settings and availability
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      availability: {
        where: { isActive: true }
      },
      blockedTimes: {
        where: {
          AND: [
            { startTime: { lte: endDate } },
            { endTime: { gte: startDate } }
          ]
        }
      },
      lessonSettings: true,
      lessons: {
        where: {
          AND: [
            { date: { gte: startDate } },
            { date: { lte: endDate } },
            { status: { in: ['SCHEDULED', 'COMPLETED'] } }
          ]
        }
      }
    }
  })

  if (!teacher || !teacher.lessonSettings) {
    return []
  }

  const slots: TimeSlot[] = []
  const teacherTimezone = teacher.timezone
  const settings = teacher.lessonSettings

  // Generate slots for each day in the range
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0) // Reset to start of day
  
  const endDateObj = new Date(endDate)
  endDateObj.setHours(23, 59, 59, 999) // Set to end of day
  
  while (currentDate <= endDateObj) {
    const dayOfWeek = currentDate.getDay()
    
    // Find availability for this day of week
    const dayAvailability = teacher.availability.filter(
      a => a.dayOfWeek === dayOfWeek
    )

    for (const availability of dayAvailability) {
      // Parse time strings and create slot times in teacher's timezone
      const [startHour, startMinute] = availability.startTime.split(':').map(Number)
      const [endHour, endMinute] = availability.endTime.split(':').map(Number)
      
      // Create slot times for this specific date
      let slotStart = new Date(currentDate)
      slotStart.setHours(startHour, startMinute, 0, 0)
      
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(endHour, endMinute, 0, 0)

      // Generate slots within this availability window
      while (slotStart < dayEnd) {
        // Try 30-minute slot if allowed
        if (settings.allows30Min) {
          const slotEnd = addMinutes(slotStart, 30)
          if (slotEnd <= dayEnd) {
            // The times are already in the correct date/time - no conversion needed
            // The teacher's availability times are applied to the current date
            
            // Check if slot is available (not blocked or booked)
            const isAvailable = await isSlotAvailable(
              slotStart,
              slotEnd,
              teacher.blockedTimes,
              teacher.lessons
            )

            slots.push({
              start: slotStart,
              end: slotEnd,
              duration: 30,
              price: settings.price30Min,
              available: isAvailable
            })
          }
        }

        // Try 60-minute slot if allowed
        if (settings.allows60Min) {
          const slotEnd = addMinutes(slotStart, 60)
          if (slotEnd <= dayEnd) {
            const isAvailable = await isSlotAvailable(
              slotStart,
              slotEnd,
              teacher.blockedTimes,
              teacher.lessons
            )

            slots.push({
              start: slotStart,
              end: slotEnd,
              duration: 60,
              price: settings.price60Min,
              available: isAvailable
            })
          }
        }

        // Move to next slot (30-minute increments)
        slotStart = addMinutes(slotStart, 30)
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  return slots
}

async function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  blockedTimes: any[],
  lessons: any[]
): Promise<boolean> {
  // Check if slot overlaps with any blocked time
  for (const blocked of blockedTimes) {
    if (
      (slotStart >= blocked.startTime && slotStart < blocked.endTime) ||
      (slotEnd > blocked.startTime && slotEnd <= blocked.endTime) ||
      (slotStart <= blocked.startTime && slotEnd >= blocked.endTime)
    ) {
      return false
    }
  }

  // Check if slot overlaps with any existing lesson
  for (const lesson of lessons) {
    const lessonEnd = addMinutes(lesson.date, lesson.duration)
    if (
      (slotStart >= lesson.date && slotStart < lessonEnd) ||
      (slotEnd > lesson.date && slotEnd <= lessonEnd) ||
      (slotStart <= lesson.date && slotEnd >= lessonEnd)
    ) {
      return false
    }
  }

  // Check if slot is in the past
  if (slotStart < new Date()) {
    return false
  }

  return true
}

export async function validateBooking(data: BookingData): Promise<{
  success: boolean
  error?: string
}> {
  // Check teacher exists and has settings
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: data.teacherId },
    include: {
      lessonSettings: true,
      students: {
        where: { id: data.studentId }
      }
    }
  })

  if (!teacher) {
    return { success: false, error: 'Teacher not found' }
  }

  if (!teacher.lessonSettings) {
    return { success: false, error: 'Teacher has not configured lesson settings' }
  }

  // Validate teacher-student relationship
  if (teacher.students.length === 0) {
    return { success: false, error: 'Student is not assigned to this teacher' }
  }

  // Validate duration
  if (data.duration === 30 && !teacher.lessonSettings.allows30Min) {
    return { success: false, error: 'Teacher does not offer 30-minute lessons' }
  }

  if (data.duration === 60 && !teacher.lessonSettings.allows60Min) {
    return { success: false, error: 'Teacher does not offer 60-minute lessons' }
  }

  // Validate advance booking limit
  // For recurring lessons, only validate the first occurrence
  // For single lessons, use the teacher's configured limit
  if (!data.isRecurring) {
    const maxBookingDate = addDays(new Date(), teacher.lessonSettings.advanceBookingDays)
    if (isAfter(data.date, maxBookingDate)) {
      return { 
        success: false, 
        error: `Cannot book more than ${teacher.lessonSettings.advanceBookingDays} days in advance` 
      }
    }
  }

  // Validate not in the past
  if (isBefore(data.date, new Date())) {
    return { success: false, error: 'Cannot book lessons in the past' }
  }

  // Check if slot is available
  const slotEnd = addMinutes(data.date, data.duration)
  const slots = await getAvailableSlots(
    data.teacherId,
    data.date,
    slotEnd,
    data.timezone
  )

  const requestedSlot = slots.find(
    slot => 
      slot.start.getTime() === data.date.getTime() &&
      slot.duration === data.duration &&
      slot.available
  )

  if (!requestedSlot) {
    return { success: false, error: 'This time slot is not available' }
  }

  return { success: true }
}

export async function bookSingleLesson(data: BookingData) {
  const validation = await validateBooking(data)
  if (!validation.success) {
    throw new Error(validation.error)
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: data.teacherId },
    include: { lessonSettings: true }
  })

  if (!teacher?.lessonSettings) {
    throw new Error('Teacher settings not found')
  }

  const price = data.duration === 30 
    ? teacher.lessonSettings.price30Min 
    : teacher.lessonSettings.price60Min

  const lesson = await prisma.lesson.create({
    data: {
      teacherId: data.teacherId,
      studentId: data.studentId,
      date: data.date,
      duration: data.duration,
      timezone: data.timezone,
      price,
      status: 'SCHEDULED',
      isRecurring: data.isRecurring || false
    }
  })

  return lesson
}

export async function bookRecurringLessons(
  data: BookingData & { recurringWeeks: number }
) {
  if (!data.recurringWeeks || data.recurringWeeks < 2) {
    throw new Error('Recurring lessons require at least 2 weeks')
  }

  const lessons = []
  const recurringId = `recurring-${Date.now()}`

  // Book the same time slot for each week
  for (let week = 0; week < data.recurringWeeks; week++) {
    const lessonDate = addWeeks(data.date, week)
    
    const lessonData = {
      ...data,
      date: lessonDate,
      isRecurring: true
    }

    // Validate each lesson individually
    const validation = await validateBooking(lessonData)
    if (!validation.success) {
      // If any lesson can't be booked, rollback all
      if (lessons.length > 0) {
        await prisma.lesson.deleteMany({
          where: { recurringId }
        })
      }
      throw new Error(`Week ${week + 1}: ${validation.error}`)
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: data.teacherId },
      include: { lessonSettings: true }
    })

    if (!teacher?.lessonSettings) {
      throw new Error('Teacher settings not found')
    }

    const price = data.duration === 30 
      ? teacher.lessonSettings.price30Min 
      : teacher.lessonSettings.price60Min

    const lesson = await prisma.lesson.create({
      data: {
        teacherId: data.teacherId,
        studentId: data.studentId,
        date: lessonDate,
        duration: data.duration,
        timezone: data.timezone,
        price,
        status: 'SCHEDULED',
        isRecurring: true,
        recurringId
      }
    })

    lessons.push(lesson)
  }

  return lessons
}

// Book a recurring slot that continues indefinitely
export async function bookRecurringSlot(
  data: BookingData
) {
  console.log('bookRecurringSlot called with:', data)
  
  // Validate the first occurrence
  const validation = await validateBooking({ ...data, isRecurring: true })
  if (!validation.success) {
    console.error('Validation failed:', validation.error)
    throw new Error(validation.error)
  }

  // Get teacher and pricing
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: data.teacherId },
    include: { lessonSettings: true }
  })

  if (!teacher?.lessonSettings) {
    throw new Error('Teacher settings not found')
  }

  const price = data.duration === 30 
    ? teacher.lessonSettings.price30Min 
    : teacher.lessonSettings.price60Min

  // Extract day of week and time from the date
  const dayOfWeek = data.date.getDay()
  
  // Calculate monthly rate using average occurrences per month
  // Most months have 4.33 occurrences of each day (52 weeks / 12 months)
  // For simplicity and consistency, we'll use 4 times per month as the standard
  // Teachers can adjust their per-lesson pricing if needed
  const standardOccurrencesPerMonth = 4
  const monthlyRate = price * standardOccurrencesPerMonth
  
  console.log(`Using standard ${standardOccurrencesPerMonth} occurrences per month, monthly rate: $${monthlyRate/100}`)
  const hours = data.date.getHours()
  const minutes = data.date.getMinutes()
  const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  // Create the recurring slot
  console.log('Creating recurring slot with:', {
    teacherId: data.teacherId,
    studentId: data.studentId,
    dayOfWeek,
    startTime,
    duration: data.duration,
    monthlyRate,
    status: 'ACTIVE'
  })
  
  const recurringSlot = await prisma.recurringSlot.create({
    data: {
      teacherId: data.teacherId,
      studentId: data.studentId,
      dayOfWeek,
      startTime,
      duration: data.duration,
      monthlyRate,
      status: 'ACTIVE'
    }
  })
  
  console.log('Recurring slot created:', recurringSlot.id)

  // Create initial lessons for the next 4 weeks
  const lessons = []
  const recurringId = `slot-${recurringSlot.id}`
  
  console.log('Creating initial lessons...')
  
  for (let week = 0; week < 4; week++) {
    const lessonDate = addWeeks(data.date, week)
    
    console.log(`Creating lesson for week ${week}:`, {
      date: lessonDate,
      recurringSlotId: recurringSlot.id
    })
    
    try {
      const lesson = await prisma.lesson.create({
        data: {
          teacherId: data.teacherId,
          studentId: data.studentId,
          date: lessonDate,
          duration: data.duration,
          timezone: data.timezone,
          price,
          status: 'SCHEDULED',
          isRecurring: true,
          recurringId,
          recurringSlotId: recurringSlot.id
        }
      })
      
      console.log(`Lesson created for week ${week}:`, lesson.id)
      lessons.push(lesson)
    } catch (lessonError) {
      console.error(`Failed to create lesson for week ${week}:`, lessonError)
      throw lessonError
    }
  }

  console.log(`Successfully created ${lessons.length} initial lessons`)
  return { slot: recurringSlot, lessons }
}

export async function cancelLesson(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } }
    }
  })

  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Check if lesson has already started
  if (lesson.date <= new Date()) {
    throw new Error('Cannot cancel lessons that have already started')
  }

  // Update lesson status
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: 'CANCELLED' }
  })

  return true
}

export async function validateAvailability(
  teacherId: string,
  availability: AvailabilitySlot[]
): Promise<{ success: boolean; error?: string }> {
  // Check for overlapping time slots on the same day
  for (let i = 0; i < availability.length; i++) {
    for (let j = i + 1; j < availability.length; j++) {
      if (availability[i].dayOfWeek === availability[j].dayOfWeek) {
        const start1 = parseTimeString(availability[i].startTime)
        const end1 = parseTimeString(availability[i].endTime)
        const start2 = parseTimeString(availability[j].startTime)
        const end2 = parseTimeString(availability[j].endTime)

        if (
          (start1 >= start2 && start1 < end2) ||
          (end1 > start2 && end1 <= end2) ||
          (start1 <= start2 && end1 >= end2)
        ) {
          return {
            success: false,
            error: `Overlapping time slots on ${getDayName(availability[i].dayOfWeek)}`
          }
        }
      }
    }
  }

  // Validate time format and logic
  for (const slot of availability) {
    if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
      return {
        success: false,
        error: 'Invalid time format. Use HH:MM format (e.g., 09:00)'
      }
    }

    const start = parseTimeString(slot.startTime)
    const end = parseTimeString(slot.endTime)

    if (start >= end) {
      return {
        success: false,
        error: `End time must be after start time on ${getDayName(slot.dayOfWeek)}`
      }
    }
  }

  return { success: true }
}

export async function validateBlockedTime(
  teacherId: string,
  blockedTime: { startTime: Date; endTime: Date; timezone: string }
): Promise<{ success: boolean; error?: string }> {
  // Check if blocked time conflicts with existing lessons
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      lessons: {
        where: {
          AND: [
            { date: { gte: blockedTime.startTime } },
            { date: { lte: blockedTime.endTime } },
            { status: 'SCHEDULED' }
          ]
        }
      }
    }
  })

  if (!teacher) {
    return { success: false, error: 'Teacher not found' }
  }

  if (teacher.lessons.length > 0) {
    return {
      success: false,
      error: `Cannot block time: ${teacher.lessons.length} lesson(s) already scheduled during this period`
    }
  }

  // Validate times
  if (blockedTime.startTime >= blockedTime.endTime) {
    return { success: false, error: 'End time must be after start time' }
  }

  if (blockedTime.startTime < new Date()) {
    return { success: false, error: 'Cannot block time in the past' }
  }

  return { success: true }
}

export async function validateLessonSettings(settings: {
  allows30Min: boolean
  allows60Min: boolean
  price30Min: number
  price60Min: number
  advanceBookingDays: number
}): Promise<{ success: boolean; error?: string }> {
  // At least one duration must be allowed
  if (!settings.allows30Min && !settings.allows60Min) {
    return { success: false, error: 'At least one lesson duration must be enabled' }
  }

  // Validate prices
  if (settings.allows30Min && settings.price30Min <= 0) {
    return { success: false, error: '30-minute lesson price must be greater than 0' }
  }

  if (settings.allows60Min && settings.price60Min <= 0) {
    return { success: false, error: '60-minute lesson price must be greater than 0' }
  }

  // Validate advance booking days
  if (settings.advanceBookingDays < 1 || settings.advanceBookingDays > 90) {
    return { success: false, error: 'Advance booking must be between 1 and 90 days' }
  }

  return { success: true }
}

export async function checkSchedulingConflicts(
  teacherId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  hasConflicts: boolean
  conflicts: {
    lessons: number
    blockedTimes: number
  }
}> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      lessons: {
        where: {
          AND: [
            { date: { gte: startDate } },
            { date: { lte: endDate } },
            { status: { in: ['SCHEDULED'] } }
          ]
        }
      },
      blockedTimes: {
        where: {
          AND: [
            { startTime: { lte: endDate } },
            { endTime: { gte: startDate } }
          ]
        }
      }
    }
  })

  if (!teacher) {
    return {
      hasConflicts: false,
      conflicts: { lessons: 0, blockedTimes: 0 }
    }
  }

  return {
    hasConflicts: teacher.lessons.length > 0 || teacher.blockedTimes.length > 0,
    conflicts: {
      lessons: teacher.lessons.length,
      blockedTimes: teacher.blockedTimes.length
    }
  }
}

// Helper functions
function parseTimeString(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function isValidTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(time)
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

export function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}
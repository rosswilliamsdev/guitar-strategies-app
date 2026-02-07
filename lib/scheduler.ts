import { prisma } from '@/lib/db'
import { atomicBookingUpdate, retryOptimisticUpdate, OptimisticLockingError } from '@/lib/optimistic-locking'
import { schedulerLog, dbLog } from '@/lib/logger'
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
  setMinutes
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

// Calculate actual lesson occurrences for a specific month
export function calculateMonthlyOccurrences(dayOfWeek: number, year: number, month: number): number {
  const startOfMonth = new Date(year, month - 1, 1) // month is 1-indexed
  const endOfMonth = new Date(year, month, 0) // Last day of the month
  let count = 0
  
  for (let date = new Date(startOfMonth); date <= endOfMonth; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === dayOfWeek) {
      count++
    }
  }
  
  return count
}

// Calculate monthly rate for a recurring slot in a specific month
export async function calculateSlotMonthlyRate(slotId: string, year: number, month: number): Promise<number> {
  const slot = await prisma.recurringSlot.findUnique({
    where: { id: slotId }
  })

  if (!slot) {
    throw new Error('Slot not found')
  }

  // Calculate actual occurrences for this month
  const occurrences = calculateMonthlyOccurrences(slot.dayOfWeek, year, month)
  
  // Use the stored per-lesson price
  return slot.perLessonPrice * occurrences
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
    schedulerLog.warn('Teacher not found or missing lesson settings', { 
      teacherId, 
      hasTeacher: !!teacher, 
      hasSettings: !!teacher?.lessonSettings 
    });
    return []
  }

  schedulerLog.debug('Generating available slots', {
    teacherId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    studentTimezone,
    teacherTimezone: teacher.timezone,
    availabilityCount: teacher.availability.length
  });

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
    
    // Debug: Log days with availability
    if (dayAvailability.length > 0) {
      schedulerLog.debug('Day availability found', {
        dayOfWeek,
        date: currentDate.toDateString(),
        slotsFound: dayAvailability.length
      })
    }
    

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
        // Generate 30-minute slots only (users select 1 for 30min, 2 consecutive for 60min)
        const slotEnd = addMinutes(slotStart, 30)
        if (slotEnd <= dayEnd) {
          // Check if slot is available (not booked)
          const isAvailable = await isSlotAvailable(
            slotStart,
            slotEnd,
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

        // Move to next slot (30-minute increments)
        slotStart = addMinutes(slotStart, 30)
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  schedulerLog.info('Slots generation completed', {
    totalSlots: slots.length,
    availableSlots: slots.filter(s => s.available).length,
    teacherId,
    dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`
  })
  return slots
}

async function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  lessons: any[]
): Promise<boolean> {
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

  // Check if slot is in the past (allow booking up to 1 hour after slot starts)
  const now = new Date()
  const gracePeriod = 60 * 60 * 1000 // 1 hour in milliseconds
  const cutoffTime = new Date(slotStart.getTime() + gracePeriod)
  
  if (now > cutoffTime) {
    // Uncomment for debugging past slot filtering:
    // schedulerLog.debug('Slot filtered as past', { current: now.toISOString(), cutoff: cutoffTime.toISOString(), slot: slotStart.toISOString() })
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
  // We need to fetch slots for the entire day to find the matching slot
  const dayStart = startOfDay(data.date)
  const dayEnd = endOfDay(data.date)
  
  schedulerLog.debug('Validating booking request', {
    requestedDate: data.date.toISOString(),
    duration: data.duration,
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
    timezone: data.timezone
  })
  
  const slots = await getAvailableSlots(
    data.teacherId,
    dayStart,
    dayEnd,
    data.timezone
  )

  // Normalize dates for comparison (remove milliseconds and seconds for slot matching)
  const normalizeDate = (date: Date) => {
    const normalized = new Date(date)
    normalized.setSeconds(0, 0) // Set seconds and milliseconds to 0
    return normalized
  }

  const requestedDateTime = normalizeDate(data.date)
  
  // For 30-minute lessons, just find the single slot
  // For 60-minute lessons, we need to verify two consecutive 30-minute slots
  if (data.duration === 30) {
    const requestedSlot = slots.find(slot => {
      const slotDateTime = normalizeDate(slot.start)
      return slotDateTime.getTime() === requestedDateTime.getTime() &&
             slot.duration === 30 &&
             slot.available
    })
    
    if (!requestedSlot) {
      schedulerLog.warn('30-min slot validation failed', {
        requestedTime: requestedDateTime.toISOString(),
        availableSlots: slots.filter(s => s.available).map(s => ({
          start: normalizeDate(s.start).toISOString(),
          duration: s.duration
        }))
      })
      return { success: false, error: 'This time slot is not available' }
    }
  } else if (data.duration === 60) {
    // For 60-minute lessons, check for two consecutive 30-minute slots
    const firstSlot = slots.find(slot => {
      const slotDateTime = normalizeDate(slot.start)
      return slotDateTime.getTime() === requestedDateTime.getTime() &&
             slot.duration === 30 &&
             slot.available
    })
    
    if (!firstSlot) {
      schedulerLog.warn('60-min first slot not found', {
        requestedTime: requestedDateTime.toISOString()
      })
      return { success: false, error: 'This time slot is not available' }
    }
    
    // Check for the second consecutive slot (30 minutes after the first)
    const secondSlotTime = addMinutes(requestedDateTime, 30)
    const secondSlot = slots.find(slot => {
      const slotDateTime = normalizeDate(slot.start)
      return slotDateTime.getTime() === secondSlotTime.getTime() &&
             slot.duration === 30 &&
             slot.available
    })
    
    if (!secondSlot) {
      schedulerLog.warn('60-min second slot not found', {
        firstSlotTime: requestedDateTime.toISOString(),
        expectedSecondSlotTime: secondSlotTime.toISOString(),
        availableSlots: slots.filter(s => s.available && 
          Math.abs(normalizeDate(s.start).getTime() - secondSlotTime.getTime()) < 60 * 60 * 1000
        ).map(s => ({
          start: normalizeDate(s.start).toISOString(),
          duration: s.duration
        }))
      })
      return { success: false, error: 'Both consecutive time slots must be available for a 60-minute lesson' }
    }
    
    schedulerLog.debug('60-min booking validated', {
      firstSlot: requestedDateTime.toISOString(),
      secondSlot: secondSlotTime.toISOString()
    })
  } else {
    return { success: false, error: 'Invalid lesson duration' }
  }

  return { success: true }
}

export async function bookSingleLesson(data: BookingData) {
  // Use enhanced atomic booking with optimistic locking and serializable isolation
  return await retryOptimisticUpdate(async () => {
    const results = await atomicBookingUpdate([
      async () => {
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

        // Normalize the date (remove milliseconds) before saving
        const normalizedDate = new Date(data.date)
        normalizedDate.setSeconds(0, 0)

        dbLog.debug('Creating lesson with optimistic locking', {
          teacherId: data.teacherId,
          duration: data.duration,
          price,
          date: normalizedDate.toISOString()
        })

        // Check for conflicts with SELECT FOR UPDATE to prevent race conditions
        const existingLesson = await prisma.$queryRaw`
          SELECT id, version FROM "public"."Lesson" 
          WHERE "teacherId" = ${data.teacherId} 
            AND "date" = ${normalizedDate} 
            AND "status" != 'CANCELLED'
          FOR UPDATE
        ` as any[]

        if (existingLesson.length > 0) {
          throw new Error('This time slot has been booked by another student')
        }

        const lesson = await prisma.lesson.create({
          data: {
            teacherId: data.teacherId,
            studentId: data.studentId,
            date: normalizedDate,
            duration: data.duration,
            timezone: data.timezone,
            price,
            status: 'SCHEDULED',
            isRecurring: data.isRecurring || false,
            version: 1 // Initial version for optimistic locking
          }
        })

        dbLog.info('Lesson created with version control', {
          id: lesson.id,
          duration: lesson.duration,
          price: lesson.price,
          date: lesson.date.toISOString(),
          version: lesson.version
        })

        return lesson
      }
    ])
    return results[0] // Return the lesson from the first (and only) operation
  })
}

// Book a recurring slot that continues indefinitely
export async function bookRecurringSlot(
  data: BookingData
) {
  // Use a database transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Validate the first occurrence
    const validation = await validateBooking({ ...data, isRecurring: true })
    if (!validation.success) {
      throw new Error(validation.error)
    }

    // Get teacher and pricing
    const teacher = await tx.teacherProfile.findUnique({
      where: { id: data.teacherId },
      include: { lessonSettings: true }
    })

    if (!teacher?.lessonSettings) {
      throw new Error('Teacher settings not found')
    }

    const price = data.duration === 30 
      ? teacher.lessonSettings.price30Min 
      : teacher.lessonSettings.price60Min

    // Normalize the date (remove milliseconds) for consistent processing
    const normalizedDate = new Date(data.date)
    normalizedDate.setSeconds(0, 0)
    
    // Extract day of week and time from the date
    const dayOfWeek = normalizedDate.getDay()
    
    // Store the per-lesson price - monthly rates will be calculated dynamically
    const perLessonPrice = price
    const hours = normalizedDate.getHours()
    const minutes = normalizedDate.getMinutes()
    const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    // Check for existing recurring slot conflicts
    const existingRecurringSlot = await tx.recurringSlot.findFirst({
      where: {
        teacherId: data.teacherId,
        dayOfWeek,
        startTime,
        status: 'ACTIVE'
      }
    })

    if (existingRecurringSlot) {
      throw new Error('Teacher already has a recurring lesson at this time')
    }

    // Check for conflicts with existing lessons for the next 4 weeks
    const conflictingLessons = []
    for (let week = 0; week < 4; week++) {
      const lessonDate = addWeeks(normalizedDate, week)
      const existing = await tx.lesson.findFirst({
        where: {
          teacherId: data.teacherId,
          date: lessonDate,
          status: {
            not: 'CANCELLED'
          }
        }
      })
      if (existing) {
        conflictingLessons.push(lessonDate.toLocaleDateString())
      }
    }

    if (conflictingLessons.length > 0) {
      throw new Error(`Conflicting lessons found on: ${conflictingLessons.join(', ')}`)
    }

    // Create the recurring slot
    const recurringSlot = await tx.recurringSlot.create({
      data: {
        teacherId: data.teacherId,
        studentId: data.studentId,
        dayOfWeek,
        startTime,
        duration: data.duration,
        perLessonPrice, // Store per-lesson price, calculate monthly rates dynamically
        status: 'ACTIVE'
      }
    })

    // Create initial lessons for the next 4 weeks
    const lessons = []
    const recurringId = `slot-${recurringSlot.id}`
    
    for (let week = 0; week < 4; week++) {
      const lessonDate = addWeeks(normalizedDate, week)
      
      const lesson = await tx.lesson.create({
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
      
      lessons.push(lesson)
    }

    return { slot: recurringSlot, lessons }
  })
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
      }
    }
  })

  if (!teacher) {
    return {
      hasConflicts: false,
      conflicts: { lessons: 0 }
    }
  }

  return {
    hasConflicts: teacher.lessons.length > 0,
    conflicts: {
      lessons: teacher.lessons.length
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
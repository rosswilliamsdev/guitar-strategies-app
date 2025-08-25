import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSlotBookingSchema } from "@/lib/validations";
import { calculateMonthlyOccurrences, getMonthlyRate } from "@/lib/slot-helpers";
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createBadRequestResponse,
  createConflictResponse,
  createValidationErrorResponse,
  handleApiError
} from "@/lib/api-responses";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return createAuthErrorResponse();
    }

    // Only students can book slots
    if (session.user.role !== "STUDENT") {
      return createForbiddenResponse("Only students can book slots");
    }

    const body = await request.json();
    const validation = createSlotBookingSchema.safeParse(body);

    if (!validation.success) {
      return createValidationErrorResponse(validation.error);
    }

    const { teacherId, dayOfWeek, startTime, duration, startMonth, endMonth } = validation.data;

    // Get student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { teacher: true }
    });

    if (!studentProfile) {
      return createNotFoundResponse("Student profile");
    }

    // Verify student is assigned to this teacher
    if (studentProfile.teacherId !== teacherId) {
      return createForbiddenResponse("You are not assigned to this teacher");
    }

    // Get teacher settings
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { 
        lessonSettings: true,
        availability: {
          where: {
            dayOfWeek,
            isActive: true
          }
        }
      }
    });

    if (!teacher || !teacher.lessonSettings) {
      return createNotFoundResponse("Teacher or lesson settings");
    }

    // Check if teacher allows this duration
    if (duration === 30 && !teacher.lessonSettings.allows30Min) {
      return createBadRequestResponse("Teacher does not offer 30-minute lessons");
    }

    if (duration === 60 && !teacher.lessonSettings.allows60Min) {
      return createBadRequestResponse("Teacher does not offer 60-minute lessons");
    }

    // Check if teacher is available at this time
    const isAvailable = teacher.availability.some(avail => {
      const [availStart] = avail.startTime.split(':').map(Number);
      const [availEnd] = avail.endTime.split(':').map(Number);
      const [slotStart] = startTime.split(':').map(Number);
      const slotEnd = slotStart + (duration / 60);

      return slotStart >= availStart && slotEnd <= availEnd;
    });

    if (!isAvailable) {
      return createBadRequestResponse("Teacher is not available at this time");
    }

    // Check for conflicting active slots
    const conflictingSlot = await prisma.recurringSlot.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        startTime,
        duration,
        status: 'ACTIVE'
      }
    });

    if (conflictingSlot) {
      return createConflictResponse("This time slot is already booked");
    }

    // Calculate monthly rate based on teacher's lesson settings
    const lessonRate = duration === 30 ? teacher.lessonSettings.price30Min : teacher.lessonSettings.price60Min;
    const monthlyRate = getMonthlyRate(lessonRate, dayOfWeek);

    // Create the recurring slot and subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the recurring slot
      const slot = await tx.recurringSlot.create({
        data: {
          teacherId,
          studentId: studentProfile.id,
          dayOfWeek,
          startTime,
          duration,
          monthlyRate,
          status: 'ACTIVE'
        }
      });

      // Create the subscription
      const subscription = await tx.slotSubscription.create({
        data: {
          slotId: slot.id,
          studentId: studentProfile.id,
          startMonth,
          endMonth,
          monthlyRate,
          status: 'ACTIVE'
        }
      });

      return { slot, subscription };
    });

    return createSuccessResponse(
      {
        slot: result.slot,
        subscription: result.subscription
      },
      "Recurring slot booked successfully"
    );

  } catch (error) {
    return handleApiError(error);
  }
}

// Get available slots for a teacher
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return createAuthErrorResponse();
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return createBadRequestResponse("Teacher ID is required");
    }

    // Get teacher availability and current active slots
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        availability: {
          where: { isActive: true }
        },
        lessonSettings: true,
        recurringSlots: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!teacher || !teacher.lessonSettings) {
      return createNotFoundResponse("Teacher or lesson settings");
    }

    // Generate available slots based on teacher availability
    const availableSlots = [];
    
    for (const availability of teacher.availability) {
      const [startHour, startMinute] = availability.startTime.split(':').map(Number);
      const [endHour, endMinute] = availability.endTime.split(':').map(Number);
      
      let currentTime = startHour * 60 + startMinute; // Convert to minutes
      const endTime = endHour * 60 + endMinute;

      while (currentTime < endTime) {
        const slotStartHour = Math.floor(currentTime / 60);
        const slotStartMinute = currentTime % 60;
        const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;

        // Check 30-minute slots
        if (teacher.lessonSettings.allows30Min && currentTime + 30 <= endTime) {
          const isConflicting = teacher.recurringSlots.some(slot => 
            slot.dayOfWeek === availability.dayOfWeek && 
            slot.startTime === slotStartTime && 
            slot.duration === 30
          );

          if (!isConflicting) {
            availableSlots.push({
              dayOfWeek: availability.dayOfWeek,
              startTime: slotStartTime,
              duration: 30,
              monthlyRate: getMonthlyRate(teacher.lessonSettings.price30Min, availability.dayOfWeek),
              isAvailable: true
            });
          }
        }

        // Check 60-minute slots
        if (teacher.lessonSettings.allows60Min && currentTime + 60 <= endTime) {
          const isConflicting = teacher.recurringSlots.some(slot => 
            slot.dayOfWeek === availability.dayOfWeek && 
            slot.startTime === slotStartTime && 
            slot.duration === 60
          );

          if (!isConflicting) {
            availableSlots.push({
              dayOfWeek: availability.dayOfWeek,
              startTime: slotStartTime,
              duration: 60,
              monthlyRate: getMonthlyRate(teacher.lessonSettings.price60Min, availability.dayOfWeek),
              isAvailable: true
            });
          }
        }

        // Move to next 30-minute slot
        currentTime += 30;
      }
    }

    return createSuccessResponse({
      availableSlots,
      teacher: {
        id: teacher.id,
        name: teacher.user?.name,
        timezone: teacher.timezone
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
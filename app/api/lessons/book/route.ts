import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validations';
import { bookSingleLesson, bookRecurringSlot } from '@/lib/scheduler';
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  createBadRequestResponse,
  handleApiError
} from '@/lib/api-responses';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'STUDENT') {
      return createAuthErrorResponse('Students only');
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Failed to parse JSON body:', error);
      return createBadRequestResponse('Invalid JSON in request body');
    }
    
    console.log('Received booking data:', body);
    
    // Validate input
    const validatedData = bookingSchema.parse(body);

    // Get student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { teacher: true }
    });

    if (!studentProfile) {
      return createNotFoundResponse('Student profile');
    }

    // Verify student is assigned to this teacher
    if (studentProfile.teacherId !== validatedData.teacherId) {
      return createForbiddenResponse('Not authorized to book with this teacher');
    }

    // Prepare booking data
    const bookingData = {
      teacherId: validatedData.teacherId,
      studentId: studentProfile.id,
      date: validatedData.date,
      duration: validatedData.duration,
      timezone: validatedData.timezone,
    };

    let result;

    if (validatedData.isRecurring) {
      // Use the new RecurringSlot system for truly indefinite recurring lessons
      // This creates a recurring slot and initial lessons for the next 4 weeks
      result = await bookRecurringSlot(bookingData);
      
      return createSuccessResponse(
        {
          slot: result.slot,
          lessons: result.lessons,
          type: 'recurring_slot'
        },
        'Successfully booked your weekly lesson time!'
      );
    } else {
      // Book single lesson
      result = await bookSingleLesson(bookingData);
      
      return createSuccessResponse(
        {
          lesson: result,
          type: 'single'
        },
        'Lesson booked successfully'
      );
    }

  } catch (error: any) {
    return handleApiError(error);
  }
}
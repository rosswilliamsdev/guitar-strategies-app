import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validations';
import { bookSingleLesson, bookRecurringSlot } from '@/lib/scheduler';
import { sendEmail, createLessonBookingEmail } from '@/lib/email';
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

    // Get student profile with user and teacher data for emails
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { 
        user: true,
        teacher: {
          include: {
            user: true
          }
        }
      }
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
    let lessonDate;
    let lessonTime;

    if (validatedData.isRecurring) {
      // Use the new RecurringSlot system for truly indefinite recurring lessons
      // This creates a recurring slot and initial lessons for the next 4 weeks
      result = await bookRecurringSlot(bookingData);
      
      // Use the date from the first lesson for email
      if (result.lessons && result.lessons.length > 0) {
        lessonDate = result.lessons[0].date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        lessonTime = result.lessons[0].date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      // Send email notification for recurring booking
      if (studentProfile.user.email && lessonDate && lessonTime) {
        try {
          const emailContent = createLessonBookingEmail(
            studentProfile.user.name || 'Student',
            studentProfile.teacher.user.name || 'Teacher',
            lessonDate,
            lessonTime,
            validatedData.duration,
            true // isRecurring
          );

          await sendEmail({
            to: studentProfile.user.email,
            subject: `Weekly Guitar Lessons Booked with ${studentProfile.teacher.user.name}`,
            html: emailContent
          });
        } catch (error) {
          console.error('Failed to send recurring booking email:', error);
        }
      }
      
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
      
      // Format lesson details for email
      lessonDate = result.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      lessonTime = result.date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Send email notification for single lesson booking
      if (studentProfile.user.email) {
        try {
          const emailContent = createLessonBookingEmail(
            studentProfile.user.name || 'Student',
            studentProfile.teacher.user.name || 'Teacher',
            lessonDate,
            lessonTime,
            validatedData.duration,
            false // isRecurring
          );

          await sendEmail({
            to: studentProfile.user.email,
            subject: `Guitar Lesson Booked - ${lessonDate}`,
            html: emailContent
          });
        } catch (error) {
          console.error('Failed to send single lesson booking email:', error);
        }
      }
      
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
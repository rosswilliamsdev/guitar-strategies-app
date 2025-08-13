import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validations';
import { bookSingleLesson, bookRecurringLessons } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized - Students only' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = bookingSchema.parse(body);

    // Get student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { teacher: true }
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Verify student is assigned to this teacher
    if (studentProfile.teacherId !== validatedData.teacherId) {
      return NextResponse.json(
        { error: 'Not authorized to book with this teacher' },
        { status: 403 }
      );
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

    if (validatedData.isRecurring && validatedData.recurringWeeks) {
      // Book recurring lessons
      result = await bookRecurringLessons({
        ...bookingData,
        recurringWeeks: validatedData.recurringWeeks
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully booked ${result.length} recurring lessons`,
        lessons: result,
        type: 'recurring'
      });
    } else {
      // Book single lesson
      result = await bookSingleLesson(bookingData);
      
      return NextResponse.json({
        success: true,
        message: 'Lesson booked successfully',
        lesson: result,
        type: 'single'
      });
    }

  } catch (error: any) {
    console.error('Error booking lesson:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid booking data', details: error.errors },
        { status: 400 }
      );
    }

    // Handle business logic errors from scheduler
    if (error.message.includes('not available') || 
        error.message.includes('Cannot book') ||
        error.message.includes('not authorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to book lesson' },
      { status: 500 }
    );
  }
}
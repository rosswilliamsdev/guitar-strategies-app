import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { lessonSettingsSchema } from '@/lib/validations';
import { validateLessonSettings } from '@/lib/scheduler';
import { apiLog } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        lessonSettings: true
      }
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    // Return settings or defaults
    const settings = teacherProfile.lessonSettings || {
      allows30Min: true,
      allows60Min: true,
      price30Min: 3000, // $30 default
      price60Min: 6000, // $60 default
      advanceBookingDays: 21
    };

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    apiLog.error('Error fetching lesson settings:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Failed to fetch lesson settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = lessonSettingsSchema.parse(body);

    // Additional business logic validation
    const validation = await validateLessonSettings(validatedData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    // Upsert lesson settings
    const settings = await prisma.teacherLessonSettings.upsert({
      where: { teacherId: teacherProfile.id },
      update: validatedData,
      create: {
        ...validatedData,
        teacherId: teacherProfile.id
      }
    });

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    apiLog.error('Error updating lesson settings:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid lesson settings data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update lesson settings' },
      { status: 500 }
    );
  }
}
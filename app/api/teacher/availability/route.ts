import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { weeklyAvailabilitySchema } from '@/lib/validations';
import { validateAvailability } from '@/lib/scheduler';

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
        availability: {
          where: { isActive: true },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      availability: teacherProfile.availability
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
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
    const validatedData = weeklyAvailabilitySchema.parse(body.availability);

    // Additional business logic validation
    const validation = await validateAvailability(session.user.id, validatedData);
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

    // Replace all availability with new data (atomic operation)
    await prisma.$transaction([
      // Delete existing availability
      prisma.teacherAvailability.deleteMany({
        where: { teacherId: teacherProfile.id }
      }),
      // Create new availability
      prisma.teacherAvailability.createMany({
        data: validatedData.map(slot => ({
          ...slot,
          teacherId: teacherProfile.id
        }))
      })
    ]);

    // Fetch updated availability
    const updatedAvailability = await prisma.teacherAvailability.findMany({
      where: { 
        teacherId: teacherProfile.id,
        isActive: true 
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      availability: updatedAvailability
    });

  } catch (error) {
    console.error('Error updating availability:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid availability data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}
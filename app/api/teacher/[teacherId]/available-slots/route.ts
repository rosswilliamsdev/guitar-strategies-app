import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAvailableSlots } from '@/lib/scheduler';
import { addDays } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { teacherId } = params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const studentTimezone = searchParams.get('timezone') || 'America/New_York';

    // Default to next 21 days if no dates provided
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date();
    const endDate = endDateParam 
      ? new Date(endDateParam) 
      : addDays(new Date(), 21);

    // Validate date range
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check if student is authorized to view this teacher's slots
    if (session.user.role === 'STUDENT') {
      // Verify student is assigned to this teacher
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: { teacher: true }
      });

      if (!studentProfile || studentProfile.teacherId !== teacherId) {
        return NextResponse.json(
          { error: 'Not authorized to view this teacher\'s availability' },
          { status: 403 }
        );
      }
    }

    // Get available slots
    const slots = await getAvailableSlots(
      teacherId,
      startDate,
      endDate,
      studentTimezone
    );

    return NextResponse.json({
      success: true,
      slots,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timezone: studentTimezone
      }
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAvailableSlots } from '@/lib/scheduler';

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized - Students only' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timezone = searchParams.get('timezone') || 'America/New_York';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get student profile to verify they're assigned to this teacher
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { teacherId: true }
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Verify student is assigned to this teacher
    if (studentProfile.teacherId !== params.teacherId) {
      return NextResponse.json(
        { error: 'Not authorized to view this teacher\'s availability' },
        { status: 403 }
      );
    }

    // Get available slots
    const slots = await getAvailableSlots(
      params.teacherId,
      new Date(startDate),
      new Date(endDate),
      timezone
    );

    return NextResponse.json({ slots });

  } catch (error: any) {
    console.error('Error fetching availability:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAvailableSlots } from '@/lib/scheduler';
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  createBadRequestResponse,
  handleApiError
} from '@/lib/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'STUDENT') {
      return createAuthErrorResponse('Students only');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timezone = searchParams.get('timezone') || 'America/Chicago';

    if (!startDate || !endDate) {
      return createBadRequestResponse('startDate and endDate are required');
    }

    // Get student profile to verify they're assigned to this teacher
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { teacherId: true }
    });

    if (!studentProfile) {
      return createNotFoundResponse('Student profile');
    }

    // Verify student is assigned to this teacher
    if (studentProfile.teacherId !== teacherId) {
      return createForbiddenResponse('Not authorized to view this teacher\'s availability');
    }

    // Get available slots
    const slots = await getAvailableSlots(
      teacherId,
      new Date(startDate),
      new Date(endDate),
      timezone
    );
    return createSuccessResponse({ slots });

  } catch (error: any) {
    return handleApiError(error);
  }
}
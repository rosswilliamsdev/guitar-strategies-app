import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAvailableSlots } from '@/lib/scheduler';
import { addDays } from 'date-fns';
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createBadRequestResponse,
  handleApiError
} from '@/lib/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return createAuthErrorResponse();
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
      return createBadRequestResponse('End date must be after start date');
    }

    // Check if student is authorized to view this teacher's slots
    if (session.user.role === 'STUDENT') {
      // Verify student is assigned to this teacher
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        include: { teacher: true }
      });

      if (!studentProfile || studentProfile.teacherId !== teacherId) {
        return createForbiddenResponse('Not authorized to view this teacher\'s availability');
      }
    }

    // Get available slots
    const slots = await getAvailableSlots(
      teacherId,
      startDate,
      endDate,
      studentTimezone
    );

    return createSuccessResponse({
      slots,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        timezone: studentTimezone
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
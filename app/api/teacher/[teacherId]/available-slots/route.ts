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
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return createAuthErrorResponse();
    }

    const { teacherId } = await params;
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

    // Students can no longer view teacher availability
    if (session.user.role === 'STUDENT') {
      return createForbiddenResponse('Student scheduling disabled. Please contact your teacher to schedule lessons.');
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
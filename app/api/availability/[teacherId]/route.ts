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

    // Student availability viewing has been disabled
    return createAuthErrorResponse('Student scheduling disabled. Please contact your teacher to schedule lessons.');

  } catch (error: any) {
    return handleApiError(error);
  }
}
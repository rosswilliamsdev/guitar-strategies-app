import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { weeklyAvailabilitySchema } from '@/lib/validations';
import { validateAvailability } from '@/lib/scheduler';
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createNotFoundResponse,
  createBadRequestResponse,
  handleApiError
} from '@/lib/api-responses';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return createAuthErrorResponse('Teacher access required');
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
      return createNotFoundResponse('Teacher profile');
    }

    return createSuccessResponse({
      availability: teacherProfile.availability
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return createAuthErrorResponse('Teacher access required');
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = weeklyAvailabilitySchema.parse(body.availability);

    // Additional business logic validation
    const validation = await validateAvailability(session.user.id, validatedData);
    if (!validation.success) {
      return createBadRequestResponse(validation.error);
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return createNotFoundResponse('Teacher profile');
    }

    // Replace all availability with new data (atomic operation)
    await prisma.$transaction(async (tx) => {
      // Delete existing availability
      await tx.teacherAvailability.deleteMany({
        where: { teacherId: teacherProfile.id }
      });
      
      // Create new availability only if there are slots to create
      if (validatedData.length > 0) {
        await tx.teacherAvailability.createMany({
          data: validatedData.map(slot => ({
            ...slot,
            teacherId: teacherProfile.id
          }))
        });
      }
    });

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

    return createSuccessResponse({
      availability: updatedAvailability
    });

  } catch (error) {
    return handleApiError(error);
  }
}
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
import { withApiMiddleware } from '@/lib/api-wrapper';
import {
  CacheKeys,
  getCachedData,
  CACHE_DURATIONS,
  invalidateTeacherCache
} from '@/lib/cache';
import { log } from '@/lib/logger';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handleGET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return createAuthErrorResponse('Teacher access required');
    }

    // Get teacher profile with caching
    const cacheKey = CacheKeys.teacherAvailability(session.user.id);

    const data = await getCachedData(
      cacheKey,
      async () => {
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
          return null;
        }

        return {
          teacherProfileId: teacherProfile.id,
          availability: teacherProfile.availability
        };
      },
      CACHE_DURATIONS.DYNAMIC_LONG // Cache for 15 minutes since availability doesn't change often
    );

    if (!data) {
      return createNotFoundResponse('Teacher profile');
    }

    return createSuccessResponse({
      availability: data.availability
    });

  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePUT(request: NextRequest) {
  try {
    log.info('API: Starting availability PUT request');

    const session = await getServerSession(authOptions);
    log.info('API: Session retrieved', {
      hasSession: !!session,
      role: session?.user?.role,
      userId: session?.user?.id
    });

    if (!session || session.user.role !== 'TEACHER') {
      log.warn('API: Unauthorized access attempt', {
        hasSession: !!session,
        role: session?.user?.role
      });
      return createAuthErrorResponse('Teacher access required');
    }

    const body = await request.json();
    log.info('API: Request body parsed', {
      hasAvailability: !!body.availability,
      slotCount: body.availability?.length || 0,
      slots: body.availability
    });

    // Validate input
    log.info('API: Validating availability schema');
    const validatedData = weeklyAvailabilitySchema.parse(body.availability);
    log.info('API: Schema validation passed', {
      validatedSlotCount: validatedData.length
    });

    // Additional business logic validation
    log.info('API: Running business logic validation');
    const validation = await validateAvailability(session.user.id, validatedData);
    log.info('API: Business validation result', {
      success: validation.success,
      error: validation.error
    });

    if (!validation.success) {
      log.error('API: Business validation failed', {
        error: validation.error
      });
      return createBadRequestResponse(validation.error || 'Validation failed');
    }

    // Get teacher profile
    log.info('API: Fetching teacher profile');
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    log.info('API: Teacher profile retrieved', {
      found: !!teacherProfile,
      teacherId: teacherProfile?.id
    });

    if (!teacherProfile) {
      log.error('API: Teacher profile not found', {
        userId: session.user.id
      });
      return createNotFoundResponse('Teacher profile');
    }

    // Replace all availability with new data (atomic operation)
    log.info('API: Starting database transaction');
    await prisma.$transaction(async (tx) => {
      // Delete existing availability
      log.info('API: Deleting existing availability', {
        teacherId: teacherProfile.id
      });
      const deleteResult = await tx.teacherAvailability.deleteMany({
        where: { teacherId: teacherProfile.id }
      });
      log.info('API: Deleted existing slots', {
        deletedCount: deleteResult.count
      });

      // Create new availability only if there are slots to create
      if (validatedData.length > 0) {
        log.info('API: Creating new availability slots', {
          slotCount: validatedData.length,
          slots: validatedData.map(slot => ({
            ...slot,
            teacherId: teacherProfile.id
          }))
        });

        const createResult = await tx.teacherAvailability.createMany({
          data: validatedData.map(slot => ({
            ...slot,
            teacherId: teacherProfile.id
          }))
        });

        log.info('API: Created new slots', {
          createdCount: createResult.count
        });
      } else {
        log.info('API: No slots to create (clearing availability)');
      }
    });

    log.info('API: Transaction completed successfully');

    // Fetch updated availability
    log.info('API: Fetching updated availability');
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

    log.info('API: Fetched updated availability', {
      slotCount: updatedAvailability.length,
      slots: updatedAvailability
    });

    // Invalidate caches after updating availability
    log.info('API: Invalidating teacher cache');
    await invalidateTeacherCache(session.user.id);

    log.info('API: Returning success response');
    return createSuccessResponse({
      availability: updatedAvailability
    });

  } catch (error) {
    log.error('API: Error in availability PUT', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return handleApiError(error);
  }
}

// Export wrapped handlers with teacher rate limiting and skip CSRF
// (CSRF not needed for authenticated API routes in this app)
export const GET = withApiMiddleware(handleGET, { rateLimit: 'API', requireRole: 'TEACHER', skipCSRF: true });
export const PUT = withApiMiddleware(handlePUT, { rateLimit: 'API', requireRole: 'TEACHER', skipCSRF: true });
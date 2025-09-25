import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { blockedTimeSchema } from '@/lib/validations';
import { validateBlockedTime } from '@/lib/scheduler';
import { toZonedTime } from 'date-fns-tz';
import { apiLog, dbLog, schedulerLog } from '@/lib/logger';
import { withApiMiddleware } from '@/lib/api-wrapper';

async function handleGET() {
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
        blockedTimes: {
          where: {
            endTime: {
              gte: new Date() // Only future blocked times
            }
          },
          orderBy: {
            startTime: 'asc'
          }
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
      blockedTimes: teacherProfile.blockedTimes
    });

  } catch (error) {
    apiLog.error('Error fetching blocked times:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Failed to fetch blocked times' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
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
    const validatedData = blockedTimeSchema.parse(body);

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

    // Additional business logic validation
    const validation = await validateBlockedTime(teacherProfile.id, validatedData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert times to UTC for storage
    const blockedTime = await prisma.teacherBlockedTime.create({
      data: {
        teacherId: teacherProfile.id,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        reason: validatedData.reason
      }
    });

    return NextResponse.json({
      success: true,
      blockedTime
    });

  } catch (error) {
    apiLog.error('Error creating blocked time:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid blocked time data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create blocked time' },
      { status: 500 }
    );
  }
}

// Export wrapped handlers with teacher rate limiting
export const GET = withApiMiddleware(handleGET, { rateLimit: 'API', requireRole: 'TEACHER' });
export const POST = withApiMiddleware(handlePOST, { rateLimit: 'API', requireRole: 'TEACHER' });
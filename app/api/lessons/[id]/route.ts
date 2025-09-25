import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sanitizeRichText, sanitizePlainText } from '@/lib/sanitize';
import { updateLessonOptimistic, OptimisticLockingError, retryOptimisticUpdate } from '@/lib/optimistic-locking';
import { apiLog, dbLog, schedulerLog } from '@/lib/logger';
import { invalidateLessonCache } from '@/lib/cache';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control conditions based on user role
    const whereCondition: { id: string; teacherId?: string; studentId?: string } = { id: params.id };
    
    if (session.user.role === 'TEACHER') {
      // Teachers can access lessons they taught
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereCondition.teacherId = teacherProfile.id;
    } else if (session.user.role === 'STUDENT') {
      // Students can access their own lessons
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!studentProfile) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereCondition.studentId = studentProfile.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: whereCondition,
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
        attachments: true,
        links: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    apiLog.error('Error fetching lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get teacher profile to verify ownership
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Verify lesson exists and belongs to teacher
    const existingLesson = await prisma.lesson.findFirst({
      where: { 
        id: params.id,
        teacherId: teacherProfile.id 
      }
    });

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    if (body.studentId !== undefined) updateData.studentId = body.studentId;
    if (body.duration !== undefined) updateData.duration = body.duration || 30;
    
    // Sanitize rich text fields before updating
    if (body.notes !== undefined) {
      updateData.notes = body.notes ? sanitizeRichText(body.notes) : null;
    }
    if (body.homework !== undefined) {
      updateData.homework = body.homework ? sanitizeRichText(body.homework) : null;
    }
    if (body.progress !== undefined) {
      updateData.progress = body.progress ? sanitizeRichText(body.progress) : null;
    }
    if (body.nextSteps !== undefined) {
      updateData.nextSteps = body.nextSteps ? sanitizeRichText(body.nextSteps) : null;
    }
    
    // Sanitize plain text fields
    if (body.focusAreas !== undefined) {
      updateData.focusAreas = body.focusAreas ? sanitizePlainText(body.focusAreas) : null;
    }
    if (body.songsPracticed !== undefined) {
      updateData.songsPracticed = body.songsPracticed ? sanitizePlainText(body.songsPracticed) : null;
    }
    
    if (body.status !== undefined) updateData.status = body.status;
    
    // Handle checklist items
    if (body.checklistItems !== undefined) {
      updateData.checklistItems = body.checklistItems || null;
    }
    // Don't update date when editing existing lesson

    // Validate version for optimistic locking
    const expectedVersion = body.version;
    if (typeof expectedVersion !== 'number') {
      return NextResponse.json({ 
        error: 'Version required for optimistic locking. Please refresh and try again.' 
      }, { status: 400 });
    }

    // Update lesson with optimistic locking
    const lesson = await retryOptimisticUpdate(async () => {
      try {
        return await updateLessonOptimistic(params.id, expectedVersion, updateData);
      } catch (error) {
        if (error instanceof OptimisticLockingError) {
          throw new Error(`Lesson was modified by another user. Current version: ${error.currentVersion}, your version: ${error.attemptedVersion}. Please refresh and try again.`);
        }
        throw error;
      }
    });

    // Fetch full lesson data for response
    const fullLesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
        attachments: true,
        links: true,
      },
    });

    // Invalidate related caches after updating the lesson
    if (fullLesson) {
      await invalidateLessonCache(fullLesson.id, fullLesson.teacherId, fullLesson.studentId);
    }

    return NextResponse.json({ lesson: fullLesson });
  } catch (error) {
    apiLog.error('Error updating lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control conditions based on user role
    const whereCondition: { id: string; teacherId?: string; studentId?: string } = { id: params.id };
    
    if (session.user.role === 'TEACHER') {
      // Teachers can cancel lessons they are teaching
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereCondition.teacherId = teacherProfile.id;
    } else if (session.user.role === 'STUDENT') {
      // Students can cancel their own lessons
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!studentProfile) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereCondition.studentId = studentProfile.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find the lesson to verify access and check if it can be cancelled
    const lesson = await prisma.lesson.findFirst({
      where: whereCondition
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if lesson is in the future and can be cancelled
    if (lesson.date <= new Date()) {
      return NextResponse.json({ error: 'Cannot cancel lessons that have already started' }, { status: 400 });
    }

    if (lesson.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Can only cancel scheduled lessons' }, { status: 400 });
    }

    // Update lesson status to CANCELLED instead of deleting
    await prisma.lesson.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    // Invalidate related caches after cancelling the lesson
    await invalidateLessonCache(lesson.id, lesson.teacherId, lesson.studentId);

    return NextResponse.json({ message: 'Lesson cancelled successfully' });
  } catch (error) {
    apiLog.error('Error cancelling lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Failed to cancel lesson' }, { status: 500 });
  }
}
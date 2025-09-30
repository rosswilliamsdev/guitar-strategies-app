import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { apiLog, dbLog } from '@/lib/logger';

const bulkDeleteSchema = z.object({
  lessonIds: z.array(z.string()).min(1, 'At least one lesson ID is required'),
});

// DELETE /api/admin/lessons/bulk-delete - Delete multiple lessons
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete lessons
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validation = bulkDeleteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { lessonIds } = validation.data;

    // Verify all lessons exist and get basic info for the response
    const existingLessons = await prisma.lesson.findMany({
      where: {
        id: {
          in: lessonIds,
        },
      },
      select: {
        id: true,
        date: true,
        teacher: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        student: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (existingLessons.length !== lessonIds.length) {
      const missingIds = lessonIds.filter(
        id => !existingLessons.some(lesson => lesson.id === id)
      );
      return NextResponse.json(
        { 
          error: 'Some lessons not found',
          missingIds: missingIds
        },
        { status: 404 }
      );
    }

    // Delete all lessons in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all lessons
      const deleteResult = await tx.lesson.deleteMany({
        where: {
          id: {
            in: lessonIds,
          },
        },
      });

      return deleteResult;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} lesson(s)`,
      deletedCount: result.count,
      deletedLessons: existingLessons.map(lesson => ({
        id: lesson.id,
        teacher: lesson.teacher.user.name,
        student: lesson.student.user.name,
        date: lesson.date.toLocaleDateString(),
      })),
    });

  } catch (error) {
    apiLog.error('Error bulk deleting lessons:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
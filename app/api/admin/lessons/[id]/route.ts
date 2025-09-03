import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/admin/lessons/[id] - Delete a single lesson
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete lessons
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Check if the lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Delete the lesson
    await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Lesson between ${lesson.teacher.user.name} and ${lesson.student.user.name} on ${new Date(lesson.date).toLocaleDateString()} has been successfully deleted`,
    });

  } catch (error) {
    console.error('Error deleting lesson:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
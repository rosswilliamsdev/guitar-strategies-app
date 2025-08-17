import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canCancelLesson } from '@/lib/lesson-cleanup';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lessonId = params.id;
    const body = await request.json();
    const { reason } = body;

    // Get the lesson to check permissions and current status
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: true,
        student: true
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if lesson can be cancelled
    const cancellationCheck = canCancelLesson(lesson.date, lesson.status, 2);
    if (!cancellationCheck.canCancel) {
      return NextResponse.json({ 
        error: cancellationCheck.reason 
      }, { status: 400 });
    }

    // Check permissions - only teacher or admin can cancel
    const userRole = session.user.role;
    const isTeacher = userRole === 'TEACHER' && lesson.teacherId === session.user.teacherProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only teachers and admins can cancel lessons' 
      }, { status: 403 });
    }

    // Cancel the lesson
    const cancelledLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by teacher'
      }
    });

    return NextResponse.json({
      success: true,
      lesson: cancelledLesson,
      message: 'Lesson cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling lesson:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
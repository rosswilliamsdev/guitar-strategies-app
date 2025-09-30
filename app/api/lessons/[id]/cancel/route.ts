import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canCancelLesson } from '@/lib/lesson-cleanup';
import { sendEmail, createLessonCancellationEmailForStudent, createLessonCancellationEmailForTeacher } from '@/lib/email';
import { apiLog, dbLog, emailLog } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Get the lesson to check permissions and current status
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        student: {
          include: {
            user: true
          }
        }
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

    // Send email notifications
    const lessonDate = lesson.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const lessonTime = lesson.date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Send email to student
    if (lesson.student.user.email) {
      try {
        const studentEmailContent = createLessonCancellationEmailForStudent(
          lesson.student.user.name || 'Student',
          lesson.teacher.user.name || 'Teacher',
          lessonDate,
          lessonTime,
          lesson.duration
        );
        
        await sendEmail({
          to: lesson.student.user.email,
          subject: `Lesson Cancelled - ${lessonDate}`,
          html: studentEmailContent
        });
      } catch (error) {
        apiLog.error('Failed to send cancellation email to student:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    }

    // Send email to teacher
    if (lesson.teacher.user.email) {
      try {
        const teacherEmailContent = createLessonCancellationEmailForTeacher(
          lesson.teacher.user.name || 'Teacher',
          lesson.student.user.name || 'Student',
          lessonDate,
          lessonTime,
          lesson.duration
        );
        
        await sendEmail({
          to: lesson.teacher.user.email,
          subject: `Lesson Cancellation Confirmation - ${lessonDate}`,
          html: teacherEmailContent
        });
      } catch (error) {
        apiLog.error('Failed to send cancellation email to teacher:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    }

    return NextResponse.json({
      success: true,
      lesson: cancelledLesson,
      message: 'Lesson cancelled successfully'
    });

  } catch (error) {
    apiLog.error('Error cancelling lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
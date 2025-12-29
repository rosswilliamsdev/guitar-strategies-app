import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCancelLesson } from "@/lib/lesson-cleanup";
import {
  sendEmailAsync,
  createLessonCancellationEmailForStudent,
  createLessonCancellationEmailForTeacher,
} from "@/lib/email";
import { apiLog } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            user: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Check if lesson can be cancelled
    const cancellationCheck = canCancelLesson(lesson.date, lesson.status, 2);
    if (!cancellationCheck.canCancel) {
      return NextResponse.json(
        {
          error: cancellationCheck.reason,
        },
        { status: 400 }
      );
    }

    // Check permissions - only teacher or admin can cancel
    const userRole = session.user.role;
    const isTeacher =
      userRole === "TEACHER" &&
      lesson.teacherId === session.user.teacherProfile?.id;
    const isAdmin = userRole === "ADMIN";

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        {
          error: "Only teachers and admins can cancel lessons",
        },
        { status: 403 }
      );
    }

    // Cancel the lesson
    const cancelledLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: "CANCELLED",
        notes: reason ? `Cancelled: ${reason}` : "Cancelled by teacher",
      },
    });

    // Prepare email data (format dates once)
    const lessonDate = lesson.date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const lessonTime = lesson.date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Send emails asynchronously in parallel (non-blocking)
    // This returns immediately without waiting for emails to complete
    if (lesson.student.user.email) {
      const studentEmailContent = createLessonCancellationEmailForStudent(
        lesson.student.user.name || "Student",
        lesson.teacher.user.name || "Teacher",
        lessonDate,
        lessonTime,
        lesson.duration
      );

      sendEmailAsync({
        to: lesson.student.user.email,
        subject: `Lesson Cancelled - ${lessonDate}`,
        html: studentEmailContent,
      });
    }

    if (lesson.teacher.user.email) {
      const teacherEmailContent = createLessonCancellationEmailForTeacher(
        lesson.teacher.user.name || "Teacher",
        lesson.student.user.name || "Student",
        lessonDate,
        lessonTime,
        lesson.duration
      );

      sendEmailAsync({
        to: lesson.teacher.user.email,
        subject: `Lesson Cancellation Confirmation - ${lessonDate}`,
        html: teacherEmailContent,
      });
    }

    return NextResponse.json({
      success: true,
      lesson: cancelledLesson,
      message: "Lesson cancelled successfully",
    });
  } catch (error) {
    apiLog.error("Error cancelling lesson:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

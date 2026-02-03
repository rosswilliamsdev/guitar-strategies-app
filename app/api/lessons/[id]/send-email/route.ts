/**
 * @fileoverview Send lesson completion email with attachments and links
 *
 * This endpoint is called after a lesson is created and all attachments/links
 * have been uploaded to ensure students receive complete lesson summaries.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog, emailLog } from "@/lib/logger";
import { sendEmail, checkEmailPreference } from "@/lib/email";
import { renderEmailWithFallback } from "@/lib/email-templates";

/**
 * POST /api/lessons/[id]/send-email
 *
 * Sends lesson completion email to student with complete data including
 * attachments and links. Only accessible to teachers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lessonId = params.id;

    // Fetch complete lesson with all relations
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        student: {
          include: { user: true },
        },
        teacher: {
          include: { user: true },
        },
        attachments: true,
        links: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Verify teacher owns this lesson
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacherProfile || lesson.teacherId !== teacherProfile.id) {
      return NextResponse.json(
        { error: "Not authorized to send email for this lesson" },
        { status: 403 }
      );
    }

    // Check if student has LESSON_COMPLETED email preference enabled
    const shouldSendEmail = await checkEmailPreference(
      lesson.student.userId,
      "LESSON_COMPLETED"
    );

    if (!shouldSendEmail) {
      apiLog.info("Student has lesson completion emails disabled", {
        lessonId: lesson.id,
        studentId: lesson.student.id,
      });
      return NextResponse.json(
        { message: "Student has lesson completion emails disabled" },
        { status: 200 }
      );
    }

    // Format the lesson date
    const lessonDate = new Date(lesson.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format attachments HTML
    const attachmentsHtml =
      lesson.attachments && lesson.attachments.length > 0
        ? `
        <div class="section">
          <div class="section-title">📎 Attachments (${lesson.attachments.length})</div>
          ${lesson.attachments
            .map(
              (att: any) => `
          <div class="attachment-item">
            <table class="attachment-table">
              <tr>
                <td class="attachment-name">${att.originalName || att.fileName}</td>
                <td class="attachment-button-cell">
                  <a href="${att.fileUrl}" class="download-button" target="_blank">Download</a>
                </td>
              </tr>
            </table>
          </div>
          `
            )
            .join("")}
        </div>
        `
        : "";

    // Format links HTML
    const linksHtml =
      lesson.links && lesson.links.length > 0
        ? `
        <div class="section">
          <div class="section-title">🔗 Links (${lesson.links.length})</div>
          ${lesson.links
            .map(
              (link: any) => `
          <div class="link-item">
            <a href="${link.url}" target="_blank">${link.title || link.url}</a>
          </div>
          `
            )
            .join("")}
        </div>
        `
        : "";

    // Render the email template with lesson data
    const emailTemplate = await renderEmailWithFallback("LESSON_COMPLETED", {
      studentName: lesson.student.user.name,
      teacherName: lesson.teacher.user.name,
      lessonDate,
      duration: lesson.duration.toString(),
      notes: lesson.notes || "No notes provided",
      attachments: attachmentsHtml,
      links: linksHtml,
    });

    // Send the email
    const emailSent = await sendEmail({
      to: lesson.student.user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (emailSent) {
      emailLog.info("Lesson completion email sent", {
        lessonId: lesson.id,
        studentId: lesson.student.id,
        studentEmail: lesson.student.user.email,
        attachmentCount: lesson.attachments?.length || 0,
        linkCount: lesson.links?.length || 0,
      });

      return NextResponse.json(
        { message: "Email sent successfully" },
        { status: 200 }
      );
    } else {
      emailLog.error("Failed to send lesson completion email", {
        lessonId: lesson.id,
        studentId: lesson.student.id,
        studentEmail: lesson.student.user.email,
      });

      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }
  } catch (error) {
    apiLog.error("Error sending lesson completion email", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

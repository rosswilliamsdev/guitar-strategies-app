import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteFileFromBlob } from '@/lib/blob-storage';
import { apiLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DELETE /api/lessons/[id]/attachments/[attachmentId]
 * Delete a specific attachment from a lesson
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const { id: lessonId, attachmentId } = await params;

    // Find the attachment
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        lesson: true
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify attachment belongs to the specified lesson
    if (attachment.lessonId !== lessonId) {
      return NextResponse.json({
        error: 'Attachment does not belong to this lesson'
      }, { status: 400 });
    }

    // Verify lesson belongs to this teacher
    if (attachment.lesson.teacherId !== teacherProfile.id) {
      return NextResponse.json({
        error: 'Not authorized to delete this attachment'
      }, { status: 403 });
    }

    // Delete file from blob storage
    await deleteFileFromBlob(attachment.fileUrl);

    // Delete attachment record from database
    await prisma.lessonAttachment.delete({
      where: { id: attachmentId }
    });

    apiLog.info('Lesson attachment deleted', {
      attachmentId,
      lessonId,
      fileName: attachment.fileName,
      teacherId: teacherProfile.id
    });

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    apiLog.error('Lesson attachment deletion error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/lessons/[id]/attachments/[attachmentId]
 * Download/stream a specific attachment
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: lessonId, attachmentId } = await params;

    // Find the attachment
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        lesson: true
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify attachment belongs to the specified lesson
    if (attachment.lessonId !== lessonId) {
      return NextResponse.json({
        error: 'Attachment does not belong to this lesson'
      }, { status: 400 });
    }

    // Check access: teacher owns lesson or student is in the lesson
    const hasAccess =
      (session.user.role === 'TEACHER' && attachment.lesson.teacherId === session.user.teacherProfile?.id) ||
      (session.user.role === 'STUDENT' && attachment.lesson.studentId === session.user.studentProfile?.id);

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Not authorized to access this attachment'
      }, { status: 403 });
    }

    // Redirect to the blob URL for download
    // Vercel Blob URLs are public but obscure, providing security through obscurity
    return NextResponse.redirect(attachment.fileUrl);

  } catch (error) {
    apiLog.error('Lesson attachment download error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

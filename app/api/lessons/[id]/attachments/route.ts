import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  uploadFileToBlob,
  buildLessonAttachmentPath,
  MAX_ATTACHMENTS_PER_LESSON
} from '@/lib/blob-storage';
import { apiLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/lessons/[id]/attachments
 * Upload attachments to a lesson (max 10 files per lesson)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: lessonId } = await params;

    // Verify lesson exists and belongs to this teacher
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        attachments: true
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.teacherId !== teacherProfile.id) {
      return NextResponse.json({
        error: 'Not authorized to add attachments to this lesson'
      }, { status: 403 });
    }

    // Check current attachment count
    const currentAttachmentCount = lesson.attachments.length;

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check if adding these files would exceed the limit
    if (currentAttachmentCount + files.length > MAX_ATTACHMENTS_PER_LESSON) {
      return NextResponse.json({
        error: `Maximum ${MAX_ATTACHMENTS_PER_LESSON} attachments allowed per lesson. Current: ${currentAttachmentCount}, Attempting to add: ${files.length}`
      }, { status: 400 });
    }

    const uploadedAttachments = [];
    const errors = [];

    // Upload each file
    for (const file of files) {
      try {
        // Build storage path
        const storagePath = buildLessonAttachmentPath(
          teacherProfile.id,
          lessonId,
          file.name
        );

        // Upload to blob storage
        const blob = await uploadFileToBlob(file, storagePath);

        // Create database record
        const attachment = await prisma.lessonAttachment.create({
          data: {
            lessonId,
            fileName: file.name,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileUrl: blob.url
          }
        });

        uploadedAttachments.push(attachment);

        apiLog.info('Lesson attachment uploaded', {
          attachmentId: attachment.id,
          lessonId,
          fileName: file.name,
          fileSize: file.size
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          fileName: file.name,
          error: errorMessage
        });

        apiLog.error('Failed to upload lesson attachment', {
          lessonId,
          fileName: file.name,
          error: errorMessage
        });
      }
    }

    // Return results
    if (errors.length > 0 && uploadedAttachments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All file uploads failed',
        details: errors
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedAttachments,
      errors: errors.length > 0 ? errors : undefined,
      message: uploadedAttachments.length === files.length
        ? 'All files uploaded successfully'
        : `${uploadedAttachments.length} of ${files.length} files uploaded successfully`
    }, { status: 201 });

  } catch (error) {
    apiLog.error('Lesson attachments upload error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/lessons/[id]/attachments
 * List all attachments for a lesson
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: lessonId } = await params;

    // Verify lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check access: teacher owns lesson or student is in the lesson
    const hasAccess =
      (session.user.role === 'TEACHER' && lesson.teacherId === session.user.teacherProfile?.id) ||
      (session.user.role === 'STUDENT' && lesson.studentId === session.user.studentProfile?.id);

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Not authorized to view attachments for this lesson'
      }, { status: 403 });
    }

    return NextResponse.json({
      attachments: lesson.attachments
    });

  } catch (error) {
    apiLog.error('Lesson attachments list error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

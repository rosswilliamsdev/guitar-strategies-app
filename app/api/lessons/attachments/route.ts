import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { apiLog, dbLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const lessonId = formData.get('lessonId') as string;
    const files = formData.getAll('files') as File[];

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    // Verify the teacher owns this lesson
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherProfile.id
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found or access denied' }, { status: 404 });
    }

    const attachments = [];

    // Check if we have a valid Vercel Blob token
    const hasValidBlobToken = process.env.BLOB_READ_WRITE_TOKEN && 
                              process.env.BLOB_READ_WRITE_TOKEN !== 'vercel_blob_rw_xxxxxxxxxxxxxxxxxxxx' &&
                              !process.env.BLOB_READ_WRITE_TOKEN.includes('xxxx');

    for (const file of files) {
      let fileUrl: string;

      if (hasValidBlobToken) {
        try {
          // Upload to Vercel Blob
          const blob = await put(`lessons/${lessonId}/${file.name}`, file, {
            access: 'public',
          });
          fileUrl = blob.url;
        } catch (blobError) {
          apiLog.error('Vercel Blob upload failed:', {
        error: blobError instanceof Error ? blobError.message : String(blobError),
        stack: blobError instanceof Error ? blobError.stack : undefined
      });
          // Fallback to placeholder URL for development
          fileUrl = `#file-placeholder-${file.name}`;
        }
      } else {
        // Development fallback - just use a placeholder URL
        apiLog.info('Using development fallback for file upload (no valid BLOB_READ_WRITE_TOKEN)');
        fileUrl = `#file-placeholder-${file.name}`;
      }

      // Create attachment record in database
      const attachment = await prisma.lessonAttachment.create({
        data: {
          lessonId: lessonId,
          fileName: `${Date.now()}-${file.name}`,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: fileUrl,
        }
      });

      attachments.push(attachment);
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    apiLog.error('Error uploading files:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, removedAttachmentIds = [] } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    // Verify the teacher owns this lesson
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherProfile.id
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found or access denied' }, { status: 404 });
    }

    // Remove specified attachments
    if (removedAttachmentIds.length > 0) {
      await prisma.lessonAttachment.deleteMany({
        where: {
          id: { in: removedAttachmentIds },
          lessonId: lessonId
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error('Error managing attachments:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Failed to manage attachments' }, { status: 500 });
  }
}
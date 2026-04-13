import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFileToBlob } from '@/lib/blob-storage';
import { apiLog } from '@/lib/logger';

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

    for (const file of files) {
      let fileUrl: string;

      try {
        // Upload to S3
        const key = `lessons/${lessonId}/${Date.now()}-${file.name}`;
        const result = await uploadFileToBlob(file, key);
        fileUrl = result.url;
      } catch (uploadError) {
        apiLog.error('File upload failed:', {
          error: uploadError instanceof Error ? uploadError.message : String(uploadError),
          stack: uploadError instanceof Error ? uploadError.stack : undefined
        });
        // Fallback to placeholder URL for development
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
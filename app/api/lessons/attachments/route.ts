import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';

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
      // Upload to Vercel Blob
      const blob = await put(`lessons/${lessonId}/${file.name}`, file, {
        access: 'public',
      });

      // Create attachment record in database
      const attachment = await prisma.lessonAttachment.create({
        data: {
          lessonId: lessonId,
          fileName: `${Date.now()}-${file.name}`,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: blob.url,
        }
      });

      attachments.push(attachment);
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
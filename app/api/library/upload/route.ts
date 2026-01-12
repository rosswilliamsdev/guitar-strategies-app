import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFileToBlob, buildLibraryPath } from '@/lib/blob-storage';
import { apiLog } from '@/lib/logger';
import { withApiMiddleware } from '@/lib/api-wrapper';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const instrument = formData.get('instrument') as string;
    // All resources are now public by default
    const isPublic = true;

    if (!file || !instrument) {
      return NextResponse.json({
        error: 'Missing required fields: file and instrument are required'
      }, { status: 400 });
    }

    // Build storage path for this file
    const storagePath = buildLibraryPath(teacherProfile.id, file.name);

    // Upload file to Vercel Blob using centralized utility
    const blob = await uploadFileToBlob(file, storagePath);

    // Use filename as title if no title provided
    const finalTitle = title && title.trim() ? title.trim() : file.name.split('.').slice(0, -1).join('.');

    // Create library item in database
    const libraryItem = await prisma.libraryItem.create({
      data: {
        title: finalTitle,
        description: description || null,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: blob.url,
        teacherId: teacherProfile.id,
        instrument: instrument as any,
        category: category ? (category as any) : null,
        isPublic,
      }
    });

    apiLog.info('Library item created successfully', {
      itemId: libraryItem.id,
      teacherId: teacherProfile.id,
      fileName: file.name
    });

    return NextResponse.json({
      success: true,
      item: libraryItem
    }, { status: 201 });

  } catch (error) {
    apiLog.error('Library upload error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Export wrapped handler with upload rate limiting and skip CSRF
// (CSRF not needed for multipart/form-data file uploads)
export const POST = withApiMiddleware(handlePOST, { rateLimit: 'UPLOAD', requireRole: 'TEACHER', skipCSRF: true });
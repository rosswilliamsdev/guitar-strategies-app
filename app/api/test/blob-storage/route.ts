import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadFileToBlob, deleteFileFromBlob, buildLibraryPath } from '@/lib/blob-storage';

/**
 * Test endpoint for Vercel Blob Storage
 * This endpoint tests upload and delete functionality
 * Only accessible to admins/teachers for testing
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow teachers and admins to test
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create a test file path
    const testPath = buildLibraryPath('test-teacher-id', file.name);

    // Upload the file
    const uploadResult = await uploadFileToBlob(file, testPath);

    // Immediately delete the test file
    await deleteFileFromBlob(uploadResult.url);

    return NextResponse.json({
      success: true,
      message: 'Blob storage test successful! File uploaded and deleted.',
      uploadResult: {
        url: uploadResult.url,
        pathname: uploadResult.pathname,
        contentType: uploadResult.contentType
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Blob Storage Test Endpoint',
    instructions: 'POST a file to this endpoint to test blob storage upload/delete',
    configured: !!process.env.BLOB_READ_WRITE_TOKEN,
    token: process.env.BLOB_READ_WRITE_TOKEN ? 'Set (hidden)' : 'Not set'
  });
}

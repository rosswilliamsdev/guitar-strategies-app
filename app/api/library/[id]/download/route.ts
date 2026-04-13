import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiLog } from '@/lib/logger';
import { getSignedDownloadUrl } from '@/lib/blob-storage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the library item to access its file URL
    const libraryItem = await prisma.libraryItem.findUnique({
      where: { id },
      select: { fileUrl: true }
    });

    if (!libraryItem) {
      return NextResponse.json({
        error: 'Library item not found'
      }, { status: 404 });
    }

    // Generate signed URL for secure download
    const signedUrl = await getSignedDownloadUrl(libraryItem.fileUrl);

    // Increment download count
    await prisma.libraryItem.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      signedUrl
    });

  } catch (error) {
    apiLog.error('Download tracking error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({
      error: 'Failed to generate download URL'
    }, { status: 500 });
  }
}
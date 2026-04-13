import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiLog } from '@/lib/logger';
import { getSignedDownloadUrl } from '@/lib/blob-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;

    // Get the attachment to access its file URL
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      select: { fileUrl: true }
    });

    if (!attachment) {
      return NextResponse.json({
        error: 'Attachment not found'
      }, { status: 404 });
    }

    // Generate signed URL for secure download
    const signedUrl = await getSignedDownloadUrl(attachment.fileUrl);

    return NextResponse.json({
      success: true,
      signedUrl
    });

  } catch (error) {
    apiLog.error('Attachment download error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({
      error: 'Failed to generate download URL'
    }, { status: 500 });
  }
}

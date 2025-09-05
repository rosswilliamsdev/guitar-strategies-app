import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Increment download count
    await prisma.libraryItem.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    apiLog.error('Download tracking error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Failed to track download' 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    console.error('Download tracking error:', error);
    return NextResponse.json({ 
      error: 'Failed to track download' 
    }, { status: 500 });
  }
}
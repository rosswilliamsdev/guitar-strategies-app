import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if the library item exists and belongs to this teacher
    const libraryItem = await prisma.libraryItem.findUnique({
      where: { id }
    });

    if (!libraryItem) {
      return NextResponse.json({ error: 'Library item not found' }, { status: 404 });
    }

    if (libraryItem.teacherId !== teacherProfile.id) {
      return NextResponse.json({ error: 'Not authorized to delete this item' }, { status: 403 });
    }

    // Delete the library item
    await prisma.libraryItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    apiLog.error('Library item deletion error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
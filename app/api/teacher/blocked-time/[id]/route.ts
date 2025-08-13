import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    // Find the blocked time and verify ownership
    const blockedTime = await prisma.teacherBlockedTime.findUnique({
      where: { id }
    });

    if (!blockedTime) {
      return NextResponse.json(
        { error: 'Blocked time not found' },
        { status: 404 }
      );
    }

    if (blockedTime.teacherId !== teacherProfile.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this blocked time' },
        { status: 403 }
      );
    }

    // Delete the blocked time
    await prisma.teacherBlockedTime.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Blocked time deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blocked time:', error);
    return NextResponse.json(
      { error: 'Failed to delete blocked time' },
      { status: 500 }
    );
  }
}
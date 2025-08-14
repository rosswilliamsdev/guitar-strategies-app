import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control conditions based on user role
    let whereCondition: any = { id: params.id };
    
    if (session.user.role === 'TEACHER') {
      // Teachers can access lessons they taught
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereCondition.teacherId = teacherProfile.id;
    } else if (session.user.role === 'STUDENT') {
      // Students can access their own lessons
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!studentProfile) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereCondition.studentId = studentProfile.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: whereCondition,
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
        attachments: true,
        links: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get teacher profile to verify ownership
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Verify lesson exists and belongs to teacher
    const existingLesson = await prisma.lesson.findFirst({
      where: { 
        id: params.id,
        teacherId: teacherProfile.id 
      }
    });

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Update lesson with validation
    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        studentId: body.studentId,
        duration: body.duration || 30,
        notes: body.notes || null,
        homework: body.homework || null,
        progress: body.progress || null,
        focusAreas: body.focusAreas || null,
        songsPracticed: body.songsPracticed || null,
        nextSteps: body.nextSteps || null,
        status: body.status || 'COMPLETED',
        // Don't update date when editing existing lesson
      },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
        attachments: true,
        links: true,
      },
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control conditions based on user role
    let whereCondition: any = { id: params.id };
    
    if (session.user.role === 'TEACHER') {
      // Teachers can cancel lessons they are teaching
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereCondition.teacherId = teacherProfile.id;
    } else if (session.user.role === 'STUDENT') {
      // Students can cancel their own lessons
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!studentProfile) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereCondition.studentId = studentProfile.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find the lesson to verify access and check if it can be cancelled
    const lesson = await prisma.lesson.findFirst({
      where: whereCondition
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check if lesson is in the future and can be cancelled
    if (lesson.date <= new Date()) {
      return NextResponse.json({ error: 'Cannot cancel lessons that have already started' }, { status: 400 });
    }

    if (lesson.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Can only cancel scheduled lessons' }, { status: 400 });
    }

    // Update lesson status to CANCELLED instead of deleting
    await prisma.lesson.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ message: 'Lesson cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling lesson:', error);
    return NextResponse.json({ error: 'Failed to cancel lesson' }, { status: 500 });
  }
}
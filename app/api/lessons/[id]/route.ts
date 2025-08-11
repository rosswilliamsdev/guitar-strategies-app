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

    const body = await request.json();
    
    // TODO: Update lesson with validation
    // const lesson = await db.lesson.update({
    //   where: { id: params.id },
    //   data: body,
    //   include: {
    //     student: true,
    //   },
    // });

    return NextResponse.json({ lesson: null });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // TODO: Delete lesson with access control
    // await db.lesson.delete({
    //   where: { id: params.id },
    // });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
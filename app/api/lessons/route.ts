import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createLessonSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');

    let whereClause: any = {};

    if (session.user.role === 'TEACHER') {
      // Get teacher's profile to find lessons
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereClause.teacherId = teacherProfile.id;
      
      if (studentId) {
        whereClause.studentId = studentId;
      }
    } else if (session.user.role === 'STUDENT') {
      // Get student's profile to find lessons
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!studentProfile) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      
      whereClause.studentId = studentProfile.id;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const lessons = await prisma.lesson.findMany({
      where: whereClause,
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createLessonSchema.parse(body);

    // Get teacher's profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Verify student belongs to this teacher
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { 
        id: validatedData.studentId,
        teacherId: teacherProfile.id
      }
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 404 });
    }

    const lesson = await prisma.lesson.create({
      data: {
        teacherId: teacherProfile.id,
        studentId: validatedData.studentId,
        date: validatedData.date,
        duration: validatedData.duration || 30,
        notes: validatedData.notes || null,
        homework: validatedData.homework || null,
        progress: validatedData.progress || null,
        focusAreas: validatedData.focusAreas?.join(',') || null,
        songsPracticed: validatedData.songsPracticed?.join(',') || null,
        nextSteps: validatedData.nextSteps || null,
        status: validatedData.status || 'COMPLETED',
      },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
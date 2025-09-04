/**
 * @fileoverview API routes for lesson management.
 * 
 * Handles CRUD operations for guitar lessons including:
 * - GET: Retrieve lessons with filtering and role-based access
 * - POST: Create new lessons (teachers only)
 * 
 * Security:
 * - Session-based authentication required
 * - Role-based authorization (teachers can create/view their lessons, students can view their own)
 * - Teacher-student relationship verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createLessonSchema } from '@/lib/validations';
import { validateJsonSize } from '@/lib/request-validation';

/**
 * GET /api/lessons
 * 
 * Retrieves lessons based on user role and query parameters.
 * 
 * Query Parameters:
 * - studentId: Filter lessons for specific student (teachers only)
 * - teacherId: Filter lessons for specific teacher (admin only)
 * - status: Filter by lesson status (SCHEDULED, COMPLETED, CANCELLED, MISSED)
 * - future: If 'true', only return future lessons
 * - dateFrom: Filter lessons from this date (ISO string)
 * - dateTo: Filter lessons up to this date (ISO string)
 * 
 * Authorization:
 * - TEACHER: Can view all their lessons, optionally filtered by student
 * - STUDENT: Can only view their own lessons
 * - ADMIN: Has full access (implementation pending)
 * 
 * @param request - Next.js request object with query parameters
 * @returns JSON response with lessons array or error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const teacherId = searchParams.get('teacherId');
    const status = searchParams.get('status');
    const future = searchParams.get('future');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const whereClause: {
      status?: string;
      date?: { gte?: Date; lte?: Date };
      teacherId?: string;
      studentId?: string;
    } = {};

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Add future filter - only lessons after current date
    if (future === 'true') {
      whereClause.date = { gte: new Date() };
    }

    // Add date range filter if provided
    if (dateFrom || dateTo) {
      whereClause.date = {
        ...(whereClause.date || {}),
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) })
      };
    }

    if (session.user.role === 'TEACHER') {
      // Get teacher's profile to find associated lessons
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }
      
      whereClause.teacherId = teacherProfile.id;
      
      // Optional student filter for teachers
      if (studentId) {
        whereClause.studentId = studentId;
      }
    } else if (session.user.role === 'STUDENT') {
      // Get student's profile to find their lessons
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

    // Fetch lessons with related teacher and student data
    const lessons = await prisma.lesson.findMany({
      where: whereClause,
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
      orderBy: {
        date: future === 'true' ? 'asc' : 'desc',
      },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/lessons
 * 
 * Creates a new lesson record. Only accessible to teachers.
 * 
 * Request Body:
 * - studentId: ID of the student (required)
 * - date: Lesson date (required)
 * - duration: Lesson duration in minutes (optional, defaults to 30)
 * - notes: Rich text lesson notes (optional)
 * - homework: Homework assignments (optional)
 * - progress: Student progress notes (optional)
 * - focusAreas: Array of focus areas (optional)
 * - songsPracticed: Array of songs practiced (optional)
 * - nextSteps: Next steps for student (optional)
 * - status: Lesson status (optional, defaults to 'COMPLETED')
 * 
 * Validation:
 * - Uses Zod schema validation for request body
 * - Verifies teacher-student relationship
 * - Ensures student belongs to the requesting teacher
 * 
 * @param request - Next.js request object with lesson data
 * @returns JSON response with created lesson or error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request size (rich text content can be large)
    const sizeValidation = validateJsonSize(body, 'RICH_TEXT');
    if (sizeValidation) {
      return sizeValidation;
    }
    
    const validatedData = createLessonSchema.parse(body);

    // Get teacher's profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Verify student belongs to this teacher (security check)
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { 
        id: validatedData.studentId,
        teacherId: teacherProfile.id
      }
    });

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found or not assigned to you' }, { status: 404 });
    }

    // Create lesson with validated data
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
    
    // Handle validation errors from Zod
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
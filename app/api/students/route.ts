/**
 * @fileoverview API routes for student management.
 * 
 * Handles student data retrieval with role-based access:
 * - GET: Retrieve students based on user role and permissions
 * 
 * Security:
 * - Session-based authentication required
 * - Teachers can only view their assigned students
 * - Admins can view all students with optional teacher filtering
 * - Students cannot access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog, emailLog } from '@/lib/logger';
import { withApiMiddleware } from '@/lib/api-wrapper';
import { getPaginationParams, getPrismaOffsetPagination, createPaginatedResponse } from '@/lib/pagination';

/**
 * GET /api/students
 * 
 * Retrieves student profiles based on user role and query parameters.
 * 
 * Query Parameters:
 * - teacherId: Filter students by teacher ID (admin only)
 * 
 * Authorization:
 * - TEACHER: Can only view students assigned to them
 * - ADMIN: Can view all students, optionally filtered by teacher
 * - STUDENT: Access denied
 * 
 * @param request - Next.js request object with query parameters
 * @returns JSON response with students array or error
 */
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    // Get pagination parameters
    const paginationParams = getPaginationParams(request);
    const { skip, take } = getPrismaOffsetPagination(paginationParams);

    if (session.user.role === 'TEACHER') {
      // Get teacher's profile to find their assigned students
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }

      // Get all active students assigned to this teacher (with pagination)
      const whereClause = {
        teacherId: teacherProfile.id,
        isActive: true
      };

      const [students, total] = await Promise.all([
        prisma.studentProfile.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            user: {
              name: 'asc'
            }
          },
          skip,
          take,
        }),
        prisma.studentProfile.count({ where: whereClause }),
      ]);

      const paginatedResponse = await createPaginatedResponse(
        students,
        paginationParams.page || 1,
        paginationParams.limit || 20,
        total
      );

      return NextResponse.json(paginatedResponse);
    } else if (session.user.role === 'ADMIN') {
      // Admin can view all students with optional teacher filtering
      let whereClause: any = { isActive: true };
      
      // Apply teacher filter if provided
      if (teacherId) {
        whereClause.teacherId = teacherId;
      }

      const [students, total] = await Promise.all([
        prisma.studentProfile.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          },
          orderBy: {
            user: {
              name: 'asc'
            }
          },
          skip,
          take,
        }),
        prisma.studentProfile.count({ where: whereClause }),
      ]);

      const paginatedResponse = await createPaginatedResponse(
        students,
        paginationParams.page || 1,
        paginationParams.limit || 20,
        total
      );

      return NextResponse.json(paginatedResponse);
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  } catch (error) {
    apiLog.error('Error fetching students:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Export the wrapped handler with rate limiting and skip CSRF
export const GET = withApiMiddleware(handleGET, { rateLimit: 'READ', skipCSRF: true });
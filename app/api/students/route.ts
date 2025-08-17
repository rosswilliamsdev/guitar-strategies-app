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
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (session.user.role === 'TEACHER') {
      // Get teacher's profile to find their assigned students
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }

      // Get all active students assigned to this teacher
      const students = await prisma.studentProfile.findMany({
        where: { 
          teacherId: teacherProfile.id,
          isActive: true
        },
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
        }
      });

      return NextResponse.json({ students });
    } else if (session.user.role === 'ADMIN') {
      // Admin can view all students with optional teacher filtering
      let whereClause: any = { isActive: true };
      
      // Apply teacher filter if provided
      if (teacherId) {
        whereClause.teacherId = teacherId;
      }

      const students = await prisma.studentProfile.findMany({
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
        }
      });

      return NextResponse.json({ students });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
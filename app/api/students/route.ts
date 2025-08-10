import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (session.user.role === 'TEACHER') {
      // Get teacher's profile
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }

      // Get all students assigned to this teacher
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
      // Admin can see all students
      let whereClause: any = { isActive: true };
      
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
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUpcomingLessonsWithCleanup } from '@/lib/lesson-cleanup';
import { apiLog, dbLog, emailLog, invoiceLog, schedulerLog } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = params.id;

    // Get the student profile with user information
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
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
        },
        _count: {
          select: {
            lessons: true,
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify access - teachers can only see their own students, admins can see all
    if (session.user.role === 'TEACHER') {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherProfile || student.teacherId !== teacherProfile.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get recent lessons for this student
    const recentLessons = await prisma.lesson.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Get upcoming lessons with automatic cleanup of past lessons
    const upcomingLessons = await getUpcomingLessonsWithCleanup(studentId, 5);

    // Get recurring slots for this student
    const recurringSlots = await prisma.recurringSlot.findMany({
      where: {
        studentId,
        status: 'ACTIVE'
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Get payment summary
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        month: true,
        dueDate: true,
        total: true,
        status: true,
        paidAt: true,
      }
    });

    const totalPaid = await prisma.invoice.aggregate({
      where: {
        studentId,
        status: 'PAID'
      },
      _sum: {
        total: true
      }
    });

    const totalOwed = await prisma.invoice.aggregate({
      where: {
        studentId,
        status: {
          in: ['PENDING', 'SENT', 'VIEWED', 'OVERDUE']
        }
      },
      _sum: {
        total: true
      }
    });

    return NextResponse.json({
      student,
      recentLessons,
      upcomingLessons,
      recurringSlots,
      invoices,
      paymentSummary: {
        totalPaid: totalPaid._sum.total || 0,
        totalOwed: totalOwed._sum.total || 0,
      }
    });
  } catch (error) {
    apiLog.error('Error fetching student:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
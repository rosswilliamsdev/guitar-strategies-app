import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog, invoiceLog, schedulerLog } from '@/lib/logger';
import { withApiMiddleware } from '@/lib/api-wrapper';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/admin/students/[id] - Delete a student and all related data
async function handleDELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete students (includes teacher-admins)
    const isAdmin = session.user.role === 'ADMIN' ||
                    (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // First, check if the student exists and get their data
    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'User is not a student' }, { status: 400 });
    }

    // Perform cascading deletes in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all recurring slots for this student
      await tx.recurringSlot.deleteMany({
        where: { studentId: id },
      });

      // Delete all lessons for this student
      await tx.lesson.deleteMany({
        where: { studentId: id },
      });

      // Delete all invoice items for invoices created for this student
      const studentInvoices = await tx.invoice.findMany({
        where: { studentId: id },
        select: { id: true },
      });
      
      if (studentInvoices.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: {
            invoiceId: {
              in: studentInvoices.map(invoice => invoice.id),
            },
          },
        });

        // Delete all invoices for this student
        await tx.invoice.deleteMany({
          where: { studentId: id },
        });
      }

      // Delete student checklist items
      const studentChecklists = await tx.studentChecklist.findMany({
        where: { studentId: id },
        select: { id: true },
      });

      if (studentChecklists.length > 0) {
        await tx.studentChecklistItem.deleteMany({
          where: {
            checklistId: {
              in: studentChecklists.map(checklist => checklist.id),
            },
          },
        });

        // Delete student checklists
        await tx.studentChecklist.deleteMany({
          where: { studentId: id },
        });
      }

      // Delete student profile
      await tx.studentProfile.deleteMany({
        where: { userId: id },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Student ${student.name} has been successfully deleted`,
    });

  } catch (error) {
    apiLog.error('Error deleting student:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    // Check for specific Prisma errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Cannot delete student',
          message: 'This student has related data that could not be deleted. Please contact support.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handler directly (middleware temporarily disabled for Next.js 15 compatibility)
export const DELETE = handleDELETE;
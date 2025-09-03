import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/admin/teachers/[id] - Delete a teacher and all related data
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete teachers
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // First, check if the teacher exists and get their data
    const teacher = await prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: {
          include: {
            students: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'User is not a teacher' }, { status: 400 });
    }

    // Check if teacher has active students
    const activeStudents = teacher.teacherProfile?.students.filter(
      (student) => student.isActive
    );

    if (activeStudents && activeStudents.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete teacher with active students',
          message: `This teacher has ${activeStudents.length} active student(s). Please reassign or deactivate them first.`
        },
        { status: 400 }
      );
    }

    // Perform cascading deletes in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all recurring slots
      await tx.recurringSlot.deleteMany({
        where: { teacherId: id },
      });

      // Delete all lessons
      await tx.lesson.deleteMany({
        where: { teacherId: id },
      });

      // Delete all invoice items for invoices created by this teacher
      const teacherInvoices = await tx.invoice.findMany({
        where: { teacherId: id },
        select: { id: true },
      });
      
      if (teacherInvoices.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: {
            invoiceId: {
              in: teacherInvoices.map(invoice => invoice.id),
            },
          },
        });

        // Delete all invoices
        await tx.invoice.deleteMany({
          where: { teacherId: id },
        });
      }

      // Delete teacher availability
      await tx.teacherAvailability.deleteMany({
        where: { teacherId: id },
      });

      // Delete teacher blocked time
      await tx.teacherBlockedTime.deleteMany({
        where: { teacherId: id },
      });

      // Delete teacher lesson settings
      await tx.teacherLessonSettings.deleteMany({
        where: { teacherId: id },
      });

      // Delete library items
      await tx.libraryItem.deleteMany({
        where: { teacherId: id },
      });

      // Delete recommendations
      await tx.recommendation.deleteMany({
        where: { teacherId: id },
      });

      // Delete curriculums (teacher checklists)
      const curriculums = await tx.curriculum.findMany({
        where: { teacherId: id },
        select: { id: true },
      });

      if (curriculums.length > 0) {
        // Delete curriculum items first
        await tx.curriculumItem.deleteMany({
          where: {
            curriculumId: {
              in: curriculums.map(c => c.id),
            },
          },
        });

        // Then delete curriculums
        await tx.curriculum.deleteMany({
          where: { teacherId: id },
        });
      }

      // Delete all student profiles associated with this teacher
      await tx.studentProfile.deleteMany({
        where: { teacherId: id },
      });

      // Delete teacher profile
      await tx.teacherProfile.deleteMany({
        where: { userId: id },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Teacher ${teacher.name} has been successfully deleted`,
    });

  } catch (error) {
    console.error('Error deleting teacher:', error);
    
    // Check for specific Prisma errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Cannot delete teacher',
          message: 'This teacher has related data that could not be deleted. Please contact support.'
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
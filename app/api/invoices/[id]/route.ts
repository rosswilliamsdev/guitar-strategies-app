import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog, invoiceLog } from '@/lib/logger';
import { withApiMiddleware } from '@/lib/api-wrapper';

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check authorization - teachers can see their own invoices, students can see invoices for them
    const isTeacher = session.user.role === 'TEACHER' && invoice.teacherId === session.user.teacherProfile?.id;
    const isStudent = session.user.role === 'STUDENT' && invoice.studentId === session.user.studentProfile?.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    apiLog.error('Error fetching invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const body = await request.json();

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existingInvoice.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status;
      
      if (body.status === 'PAID' && !existingInvoice.paidAt) {
        updateData.paidAt = new Date();
      }
    }

    if (body.paymentMethod) {
      updateData.paymentMethod = body.paymentMethod;
    }

    if (body.paymentNotes) {
      updateData.paymentNotes = body.paymentNotes;
    }

    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: updateData,
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    apiLog.error('Error updating invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existingInvoice.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Allow deletion of any invoice that belongs to the teacher
    // No status restriction - teachers can delete any of their invoices

    await prisma.invoice.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error('Error deleting invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export wrapped handlers with rate limiting
export const GET = withApiMiddleware(handleGET, { rateLimit: 'API' });
export const PUT = withApiMiddleware(handlePUT, { rateLimit: 'API' });
export const DELETE = withApiMiddleware(handleDELETE, { rateLimit: 'API' });
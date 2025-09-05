import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dbQuery, criticalDbQuery } from '@/lib/db-with-retry';
import { createInvoiceSchema } from '@/lib/validations';
import { apiLog, dbLog, invoiceLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('studentId');
    const month = url.searchParams.get('month');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const where: {
      teacherId?: string;
      studentId?: string;
      month?: string;
      status?: string;
    } = {
      teacherId: session.user.teacherProfile?.id,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (month) {
      where.month = month;
    }

    if (status) {
      where.status = status;
    }

    // Use retry logic for database queries
    const [invoices, total] = await Promise.all([
      dbQuery(() => 
        prisma.invoice.findMany({
          where,
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
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        })
      ),
      dbQuery(() => prisma.invoice.count({ where })),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    apiLog.error('Error fetching invoices:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    if (!session.user.teacherProfile?.id) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Check if this is a custom invoice or regular invoice
    let studentId: string | null = null;
    let customFullName: string | null = null;
    let customEmail: string | null = null;
    
    if (body.studentId) {
      // Regular invoice - validate that the student exists and belongs to this teacher
      const student = await dbQuery(() => 
        prisma.studentProfile.findUnique({
          where: { 
            id: body.studentId,
          },
          include: {
            user: true,
          },
        })
      );

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (student.teacherId !== session.user.teacherProfile.id) {
        return NextResponse.json({ error: 'Student does not belong to this teacher' }, { status: 403 });
      }
      
      studentId = body.studentId;
    } else if (body.customFullName && body.customEmail) {
      // Custom invoice for non-system student
      customFullName = body.customFullName;
      customEmail = body.customEmail;
    } else {
      return NextResponse.json({ 
        error: 'Either studentId or customFullName/customEmail must be provided' 
      }, { status: 400 });
    }

    
    // Generate invoice number
    const year = new Date().getFullYear();
    const lastInvoice = await dbQuery(() => 
      prisma.invoice.findFirst({
        where: {
          teacherId: session.user.teacherProfile.id,
          invoiceNumber: {
            startsWith: `INV-${year}-`,
          },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
      })
    );

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `INV-${year}-${nextNumber.toString().padStart(3, '0')}`;

    // Calculate totals from items
    const subtotal = body.items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const total = subtotal; // No taxes/fees for now

    // Use critical retry for invoice creation (financial operation)
    const invoice = await criticalDbQuery(() => 
      prisma.invoice.create({
        data: {
          teacherId: session.user.teacherProfile.id,
          studentId,
          customFullName,
          customEmail,
          invoiceNumber,
          month: body.month,
          dueDate: new Date(body.dueDate),
          subtotal,
          total,
          items: {
            create: body.items.map((item: {
              description: string;
              quantity: number;
              rate: number;
              amount: number;
              lessonDate?: string;
              lessonId?: string;
            }) => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              lessonDate: item.lessonDate ? new Date(item.lessonDate) : null,
              lessonId: item.lessonId || null,
            })),
          },
        },
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
      })
    );

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    apiLog.error('Error creating invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
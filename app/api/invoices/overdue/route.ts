import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, createOverdueInvoiceEmail } from '@/lib/email';
import { apiLog, dbLog, emailLog, invoiceLog } from '@/lib/logger';
import { formatDateInTimezone } from '@/lib/utils';

// POST /api/invoices/overdue - Send overdue invoice notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow teachers and admins to send overdue notifications
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { invoiceIds } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json({ 
        error: 'invoiceIds array is required' 
      }, { status: 400 });
    }

    const results = [];

    for (const invoiceId of invoiceIds) {
      try {
        // Get the invoice with all necessary data
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            teacher: {
              include: {
                user: true
              }
            },
            student: {
              include: {
                user: true
              }
            }
          }
        });

        if (!invoice) {
          results.push({
            invoiceId,
            success: false,
            error: 'Invoice not found'
          });
          continue;
        }

        // Check if user can access this invoice
        if (session.user.role === 'TEACHER') {
          const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id }
          });
          
          if (!teacherProfile || invoice.teacherId !== teacherProfile.id) {
            results.push({
              invoiceId,
              success: false,
              error: 'Unauthorized'
            });
            continue;
          }
        }

        // Only send for overdue invoices
        if (invoice.status !== 'OVERDUE') {
          results.push({
            invoiceId,
            success: false,
            error: 'Invoice is not overdue'
          });
          continue;
        }

        // Check if student and email exist
        if (!invoice.student || !invoice.student.user.email) {
          results.push({
            invoiceId,
            success: false,
            error: 'Student email not found'
          });
          continue;
        }

        // Create payment methods object
        const paymentMethods = {
          venmoHandle: invoice.teacher.venmoHandle || undefined,
          paypalEmail: invoice.teacher.paypalEmail || undefined,
          zelleEmail: invoice.teacher.zelleEmail || undefined,
        };

        // Format due date in teacher's timezone
        const teacherTimezone = invoice.teacher.timezone || 'America/Chicago';
        const formattedDueDate = formatDateInTimezone(invoice.dueDate, teacherTimezone);

        // Create email content
        const emailContent = createOverdueInvoiceEmail(
          invoice.student.user.name || 'Student',
          invoice.invoiceNumber,
          invoice.total,
          formattedDueDate,
          invoice.teacher.user.name || 'Teacher',
          paymentMethods
        );

        // Send email
        const emailSent = await sendEmail({
          to: invoice.student.user.email,
          subject: `Payment Reminder - Invoice ${invoice.invoiceNumber} is Overdue`,
          html: emailContent
        });

        if (emailSent) {
          // Update invoice to mark that overdue email was sent
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              // You could add a field to track when overdue email was sent
              // overdueEmailSentAt: new Date()
            }
          });

          results.push({
            invoiceId,
            success: true,
            message: 'Overdue notification sent successfully'
          });
        } else {
          results.push({
            invoiceId,
            success: false,
            error: 'Failed to send email'
          });
        }

      } catch (error) {
        apiLog.error('Error processing invoice ${invoiceId}:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
        results.push({
          invoiceId,
          success: false,
          error: 'Processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} of ${totalCount} overdue notifications`,
      results
    });

  } catch (error) {
    apiLog.error('Error sending overdue notifications:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/invoices/overdue - Get all overdue invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow teachers and admins
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let where: any = {
      status: 'OVERDUE'
    };

    // If teacher, only show their invoices
    if (session.user.role === 'TEACHER') {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!teacherProfile) {
        return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
      }

      where.teacherId = teacherProfile.id;
    }

    const overdueInvoices = await prisma.invoice.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: true
          }
        },
        student: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc' // Oldest overdue first
      }
    });

    return NextResponse.json(overdueInvoices);

  } catch (error) {
    apiLog.error('Error fetching overdue invoices:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
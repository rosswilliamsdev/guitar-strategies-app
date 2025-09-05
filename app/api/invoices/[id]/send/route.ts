import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, createInvoiceEmail } from '@/lib/email';
import { format } from 'date-fns';
import { apiLog, dbLog, emailLog, invoiceLog } from '@/lib/logger';

export async function POST(
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

    if (invoice.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Determine recipient email and name
    const recipientEmail = invoice.student ? invoice.student.user.email : invoice.customEmail;
    const recipientName = invoice.student ? invoice.student.user.name : invoice.customFullName;

    if (!recipientEmail || !recipientName) {
      return NextResponse.json({ 
        error: 'No valid recipient email found for this invoice' 
      }, { status: 400 });
    }

    // Prepare payment methods
    const paymentMethods = {
      venmoHandle: invoice.teacher.venmoHandle || undefined,
      paypalEmail: invoice.teacher.paypalEmail || undefined,
      zelleEmail: invoice.teacher.zelleEmail || undefined,
    };

    // Format month for display
    const monthDisplay = format(new Date(invoice.month + '-01'), 'MMMM yyyy');

    // Create email content
    const emailHtml = createInvoiceEmail(
      recipientName,
      invoice.invoiceNumber,
      invoice.total,
      format(invoice.dueDate, 'MMMM d, yyyy'),
      invoice.teacher.user.name,
      monthDisplay,
      invoice.items.length,
      paymentMethods
    );

    // Send the email
    const emailSent = await sendEmail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.teacher.user.name}`,
      html: emailHtml,
    });

    if (!emailSent) {
      return NextResponse.json({ 
        error: 'Failed to send email. Please try again.' 
      }, { status: 500 });
    }

    // Update invoice status to SENT
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'SENT',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      message: `Invoice sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
    });

  } catch (error) {
    apiLog.error('Error sending invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
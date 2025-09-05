import { prisma } from '@/lib/db';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { sendEmail, createInvoiceEmail } from '@/lib/email';
import { getSystemSettings, isEmailTypeEnabled } from '@/lib/admin-settings';
import { invoiceLog, emailLog } from '@/lib/logger';

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  lessonDate?: Date;
  lessonId?: string;
}

export interface CreateInvoiceData {
  teacherId: string;
  studentId: string;
  month: string;
  dueDate: Date;
  items: InvoiceItem[];
}

/**
 * Generate invoice number for a teacher
 */
async function generateInvoiceNumber(teacherId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      teacherId,
      invoiceNumber: {
        startsWith: `INV-${year}-`,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `INV-${year}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Create an invoice automatically
 */
export async function createAutomaticInvoice(data: CreateInvoiceData) {
  const invoiceNumber = await generateInvoiceNumber(data.teacherId);
  
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal;

  const invoice = await prisma.invoice.create({
    data: {
      teacherId: data.teacherId,
      studentId: data.studentId,
      invoiceNumber,
      month: data.month,
      dueDate: data.dueDate,
      subtotal,
      total,
      items: {
        create: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          lessonDate: item.lessonDate,
          lessonId: item.lessonId,
        })),
      },
    },
    include: {
      teacher: {
        include: {
          user: true,
          lessonSettings: true,
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

  return invoice;
}

/**
 * Create invoice for a single lesson immediately after booking
 */
export async function createSingleLessonInvoice(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: {
        include: {
          user: true,
          lessonSettings: true,
        },
      },
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!lesson || !lesson.teacher.lessonSettings) {
    throw new Error('Lesson or teacher settings not found');
  }

  // Get system settings for due date calculation
  const systemSettings = await getSystemSettings();

  // Calculate price based on duration
  const rate = lesson.duration === 60 
    ? lesson.teacher.lessonSettings.price60Min || 0
    : lesson.teacher.lessonSettings.price30Min || 0;

  const items: InvoiceItem[] = [{
    description: `Guitar Lesson - ${format(lesson.date, 'MMM dd, yyyy')}`,
    quantity: 1,
    rate,
    amount: rate,
    lessonDate: lesson.date,
    lessonId: lesson.id,
  }];

  const dueDate = addDays(new Date(), systemSettings.defaultInvoiceDueDays);

  const invoice = await createAutomaticInvoice({
    teacherId: lesson.teacherId,
    studentId: lesson.studentId,
    month: format(lesson.date, 'yyyy-MM'),
    dueDate,
    items,
  });

  // Send invoice email to student (only if enabled)
  if (await isEmailTypeEnabled('invoice')) {
    try {
      const paymentInfo = buildPaymentInfo(lesson.teacher);
      
      const emailContent = createInvoiceEmail(
        lesson.student.user.name || 'Student',
        invoice.invoiceNumber,
        invoice.total,
        format(invoice.dueDate, 'MMM dd, yyyy'),
        lesson.teacher.user.name || 'Teacher',
        invoice.month,
        paymentInfo
      );

      await sendEmail({
        to: lesson.student.user.email,
        subject: `Invoice ${invoice.invoiceNumber} - Guitar Lesson Payment`,
        html: emailContent,
      });
    } catch (error) {
      emailLog.error('Failed to send single lesson invoice email', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        invoiceId: invoice.id,
        studentEmail: invoice.student.user.email
      });
    }
  }

  return invoice;
}

/**
 * Generate monthly invoices for all recurring lessons
 * This should be run on the 1st of each month
 */
export async function generateMonthlyRecurringInvoices(targetMonth: Date = new Date()) {
  const monthString = format(targetMonth, 'yyyy-MM');
  const startDate = startOfMonth(targetMonth);
  const endDate = endOfMonth(targetMonth);

  invoiceLog.info('Starting monthly invoice generation', {
    month: monthString,
    year,
    month: month
  });

  // Get all active recurring slots
  const recurringSlots = await prisma.recurringSlot.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      teacher: {
        include: {
          user: true,
          lessonSettings: true,
        },
      },
      student: {
        include: {
          user: true,
        },
      },
      lessons: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['SCHEDULED', 'COMPLETED'],
          },
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  });

  const results = {
    invoicesCreated: 0,
    errors: [] as string[],
  };

  for (const slot of recurringSlots) {
    try {
      // Check if invoice already exists for this month
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          teacherId: slot.teacherId,
          studentId: slot.studentId,
          month: monthString,
        },
      });

      if (existingInvoice) {
        invoiceLog.debug('Invoice already exists', {
          studentName: slot.student.user.name,
          month: monthString,
          studentId: slot.student.id
        });
        continue;
      }

      if (slot.lessons.length === 0) {
        invoiceLog.debug('No lessons found for student in month', {
          studentName: slot.student.user.name,
          month: monthString,
          studentId: slot.student.id
        });
        continue;
      }

      if (!slot.teacher.lessonSettings) {
        invoiceLog.warn('No lesson settings for teacher', {
          teacherName: slot.teacher.user.name,
          teacherId: slot.teacher.id
        });
        continue;
      }

      // Calculate price based on duration
      const rate = slot.duration === 60
        ? slot.teacher.lessonSettings.price60Min || 0
        : slot.teacher.lessonSettings.price30Min || 0;

      // Create invoice items for each lesson in the month
      const items: InvoiceItem[] = slot.lessons.map(lesson => ({
        description: `Guitar Lesson - ${format(lesson.date, 'MMM dd, yyyy')}`,
        quantity: 1,
        rate,
        amount: rate,
        lessonDate: lesson.date,
        lessonId: lesson.id,
      }));

      // Get system settings for due date calculation
      const systemSettings = await getSystemSettings();
      const dueDate = addDays(new Date(), systemSettings.defaultInvoiceDueDays);

      const invoice = await createAutomaticInvoice({
        teacherId: slot.teacherId,
        studentId: slot.studentId,
        month: monthString,
        dueDate,
        items,
      });

      // Send invoice email to student (only if enabled)
      if (await isEmailTypeEnabled('invoice')) {
        try {
          const paymentInfo = buildPaymentInfo(slot.teacher);
          
          const emailContent = createInvoiceEmail(
            slot.student.user.name || 'Student',
            invoice.invoiceNumber,
            invoice.total,
            format(invoice.dueDate, 'MMM dd, yyyy'),
            slot.teacher.user.name || 'Teacher',
            invoice.month,
            paymentInfo
          );

          await sendEmail({
            to: slot.student.user.email,
            subject: `Monthly Invoice ${invoice.invoiceNumber} - Guitar Lessons`,
            html: emailContent,
          });

          invoiceLog.info('Invoice created and sent', {
            invoiceNumber: invoice.invoiceNumber,
            studentName: slot.student.user.name,
            studentId: slot.student.id,
            total: invoice.total
          });
        } catch (emailError) {
          emailLog.error('Failed to send monthly invoice email', {
            studentName: slot.student.user.name,
            studentId: slot.student.id,
            error: emailError instanceof Error ? emailError.message : String(emailError),
            stack: emailError instanceof Error ? emailError.stack : undefined,
            invoiceNumber: invoice.invoiceNumber
          });
          results.errors.push(`Failed to send email for ${slot.student.user.name}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        }
      } else {
        invoiceLog.info('Invoice created (email disabled)', {
          invoiceNumber: invoice.invoiceNumber,
          studentName: slot.student.user.name,
          studentId: slot.student.id,
          total: invoice.total
        });
      }

      results.invoicesCreated++;

    } catch (error) {
      const errorMessage = `Failed to create invoice for ${slot.student.user.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      invoiceLog.error('Failed to create invoice', {
        studentName: slot.student.user.name,
        studentId: slot.student.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      results.errors.push(errorMessage);
    }
  }

  invoiceLog.info('Monthly invoice generation completed', {
    invoicesCreated: results.invoicesCreated,
    errorsCount: results.errors.length,
    success: results.errors.length === 0,
    month: monthString
  });
  return results;
}

/**
 * Build payment information string from teacher profile
 */
function buildPaymentInfo(teacher: any): string {
  const paymentMethods = [];
  
  if (teacher.venmoHandle) {
    paymentMethods.push(`<strong>Venmo:</strong> ${teacher.venmoHandle}`);
  }
  
  if (teacher.paypalEmail) {
    paymentMethods.push(`<strong>PayPal:</strong> ${teacher.paypalEmail}`);
  }
  
  if (teacher.zelleEmail) {
    paymentMethods.push(`<strong>Zelle:</strong> ${teacher.zelleEmail}`);
  }
  
  return paymentMethods.length > 0 
    ? paymentMethods.join('<br>')
    : 'Please contact your teacher for payment instructions.';
}
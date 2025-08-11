import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { dollarsToCents, centsToDollars } from '@/lib/currency';
import type { PaymentCalculation, TeacherPaymentSummary } from '@/types';
import { addMonths, format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Calculate monthly payment for a teacher-student pair
 */
export async function calculateMonthlyPayment(
  teacherId: string,
  studentId: string,
  month: string // "2024-01" format
): Promise<PaymentCalculation> {
  // Get teacher's hourly rate
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Parse month and get date range
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = startOfMonth(new Date(year, monthNum - 1));
  const endDate = endOfMonth(new Date(year, monthNum - 1));

  // Get completed lessons in the month with their durations
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
    select: {
      duration: true,
    },
  });

  const hourlyRate = teacher.hourlyRate || 6000; // Default $60/hour in cents
  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.duration, 0);
  const totalAmount = Math.round((totalMinutes / 60) * hourlyRate);
  const lessonsCount = lessons.length;

  return {
    teacherId,
    studentId,
    month,
    lessonsCount,
    hourlyRate,
    totalAmount,
    currency: 'usd',
  };
}

/**
 * Get payment summary for a teacher for a specific month
 */
export async function getTeacherPaymentSummary(
  teacherId: string,
  month: string
): Promise<TeacherPaymentSummary> {
  // Get all students for this teacher
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      students: {
        where: { isActive: true },
        include: { user: true },
      },
    },
  });

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Get existing payments for this month
  const existingPayments = await prisma.payment.findMany({
    where: {
      teacherId,
      month,
    },
    include: {
      student: {
        include: { user: true },
      },
    },
  });

  const students = [];
  let totalEarnings = 0;
  let pendingPayments = 0;
  let completedPayments = 0;

  for (const student of teacher.students) {
    // Calculate what should be owed for this month
    const calculation = await calculateMonthlyPayment(teacherId, student.id, month);
    
    // Find existing payment for this student
    const existingPayment = existingPayments.find(p => p.studentId === student.id);
    
    if (calculation.lessonsCount > 0) {
      students.push({
        studentId: student.id,
        studentName: student.user.name,
        amount: calculation.totalAmount,
        lessonsCount: calculation.lessonsCount,
        status: existingPayment?.status || 'PENDING',
      });

      totalEarnings += calculation.totalAmount;
      
      if (existingPayment?.status === 'COMPLETED') {
        completedPayments++;
      } else {
        pendingPayments++;
      }
    }
  }

  return {
    month,
    totalEarnings,
    paymentCount: students.length,
    pendingPayments,
    completedPayments,
    students,
  };
}

/**
 * Create payment intent for a student's monthly payment
 */
export async function createPaymentIntent(
  teacherId: string,
  studentId: string,
  month: string,
  description?: string
): Promise<{ paymentIntentId: string; clientSecret: string; amount: number }> {
  // Calculate payment amount
  const calculation = await calculateMonthlyPayment(teacherId, studentId, month);
  
  if (calculation.totalAmount <= 0) {
    throw new Error('No lessons found for this month');
  }

  // Get teacher and student info
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!teacher || !student) {
    throw new Error('Teacher or student not found');
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculation.totalAmount,
    currency: 'usd',
    description: description || `Guitar lessons for ${format(new Date(), 'MMMM yyyy')} - ${student.user.name}`,
    metadata: {
      teacherId,
      studentId,
      month,
      lessonsCount: calculation.lessonsCount.toString(),
    },
    // If teacher has Stripe Connect account, transfer funds
    ...(teacher.stripeAccountId && {
      transfer_data: {
        destination: teacher.stripeAccountId,
      },
    }),
  });

  // Create payment record in database
  await prisma.payment.create({
    data: {
      teacherId,
      studentId,
      amount: calculation.totalAmount,
      month,
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING',
      lessonsIncluded: calculation.lessonsCount,
      description: paymentIntent.description,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    amount: calculation.totalAmount,
  };
}

/**
 * Update payment status after Stripe webhook
 */
export async function updatePaymentStatus(
  paymentIntentId: string,
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED'
): Promise<void> {
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status },
  });
}

/**
 * Get teacher's monthly earnings for multiple months
 */
export async function getTeacherEarningsHistory(
  teacherId: string,
  monthsBack: number = 6
): Promise<Array<{ month: string; earnings: number; lessonsCount: number }>> {
  const results = [];
  const currentDate = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const targetDate = addMonths(currentDate, -i);
    const month = format(targetDate, 'yyyy-MM');
    
    const summary = await getTeacherPaymentSummary(teacherId, month);
    
    results.push({
      month,
      earnings: summary.totalEarnings,
      lessonsCount: summary.students.reduce((sum, s) => sum + s.lessonsCount, 0),
    });
  }

  return results.reverse(); // Show oldest to newest
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTeacherPaymentSummary, createPaymentIntent } from '@/lib/payments';
import { format } from 'date-fns';

// GET /api/payments - Get payment summary for teacher
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');

    // Get payment summary for the month
    const summary = await getTeacherPaymentSummary(teacherProfile.id, month);

    return NextResponse.json({ 
      summary,
      stripeConnected: !!teacherProfile.stripeAccountId,
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/payments - Create payment intent for a student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { studentId, month, description } = body;

    if (!studentId || !month) {
      return NextResponse.json({ 
        error: 'Student ID and month are required' 
      }, { status: 400 });
    }

    // Verify teacher owns this student
    const studentProfile = await prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        teacherId: teacherProfile.id,
        isActive: true,
      }
    });

    if (!studentProfile) {
      return NextResponse.json({ 
        error: 'Student not found or access denied' 
      }, { status: 404 });
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        teacherId: teacherProfile.id,
        studentId,
        month,
      }
    });

    if (existingPayment) {
      return NextResponse.json({ 
        error: 'Payment already exists for this month' 
      }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      teacherProfile.id,
      studentId,
      month,
      description
    );

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
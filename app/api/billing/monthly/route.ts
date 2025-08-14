import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthlyBillingSchema, updateBillingSchema } from "@/lib/validations";
import { calculateMonthlyBilling, calculateMonthlyOccurrences } from "@/lib/slot-helpers";
import { format } from 'date-fns';

// Generate monthly billing for all active subscriptions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: "Invalid month format. Use YYYY-MM" },
        { status: 400 }
      );
    }

    // Get all active subscriptions that should be billed for this month
    const activeSubscriptions = await prisma.slotSubscription.findMany({
      where: {
        status: 'ACTIVE',
        startMonth: { lte: month },
        OR: [
          { endMonth: null }, // Ongoing subscriptions
          { endMonth: { gte: month } } // Subscriptions that haven't ended yet
        ]
      },
      include: {
        slot: {
          include: {
            teacher: true,
            student: { include: { user: true } }
          }
        },
        billingRecords: {
          where: { month }
        }
      }
    });

    const billingResults = [];

    // Process each subscription
    for (const subscription of activeSubscriptions) {
      // Skip if already billed for this month
      if (subscription.billingRecords.length > 0) {
        continue;
      }

      const slot = subscription.slot;
      const billing = calculateMonthlyBilling(
        subscription.monthlyRate,
        slot.dayOfWeek,
        month
      );

      // Create billing record
      const billingRecord = await prisma.monthlyBilling.create({
        data: {
          subscriptionId: subscription.id,
          studentId: slot.studentId,
          teacherId: slot.teacherId,
          month,
          expectedLessons: billing.expectedLessons,
          actualLessons: 0, // Will be updated as lessons are completed
          ratePerLesson: billing.ratePerLesson,
          totalAmount: billing.totalAmount,
          status: 'PENDING'
        }
      });

      billingResults.push({
        subscriptionId: subscription.id,
        studentName: slot.student.user.name,
        billingRecord
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        month,
        processedSubscriptions: billingResults.length,
        billingRecords: billingResults
      },
      message: `Generated billing for ${billingResults.length} subscriptions`
    });

  } catch (error) {
    console.error("Error generating monthly billing:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get monthly billing summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');

    if (!month) {
      return NextResponse.json(
        { success: false, error: "Month parameter is required" },
        { status: 400 }
      );
    }

    // Build where clause based on user role and filters
    const whereClause: any = { month };

    if (session.user.role === 'TEACHER') {
      whereClause.teacherId = session.user.teacherProfile?.id;
    } else if (session.user.role === 'STUDENT') {
      whereClause.studentId = session.user.studentProfile?.id;
    } else {
      // Admin can filter by teacher or student
      if (teacherId) whereClause.teacherId = teacherId;
      if (studentId) whereClause.studentId = studentId;
    }

    const billingRecords = await prisma.monthlyBilling.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            slot: {
              include: {
                teacher: { include: { user: true } },
                student: { include: { user: true } }
              }
            }
          }
        },
        teacher: { include: { user: true } },
        student: { include: { user: true } }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate summary statistics
    const summary = {
      totalBillings: billingRecords.length,
      totalAmount: billingRecords.reduce((sum, record) => sum + record.totalAmount, 0),
      statusBreakdown: {
        pending: billingRecords.filter(r => r.status === 'PENDING').length,
        billed: billingRecords.filter(r => r.status === 'BILLED').length,
        paid: billingRecords.filter(r => r.status === 'PAID').length,
        overdue: billingRecords.filter(r => r.status === 'OVERDUE').length,
        cancelled: billingRecords.filter(r => r.status === 'CANCELLED').length,
      },
      expectedLessons: billingRecords.reduce((sum, record) => sum + record.expectedLessons, 0),
      actualLessons: billingRecords.reduce((sum, record) => sum + record.actualLessons, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        month,
        summary,
        billingRecords
      }
    });

  } catch (error) {
    console.error("Error fetching monthly billing:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
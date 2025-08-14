import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only teachers can access this endpoint
    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { success: false, error: "Only teachers can access their slots" },
        { status: 403 }
      );
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { success: false, error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    // Get all recurring slots for this teacher
    const slots = await prisma.recurringSlot.findMany({
      where: { teacherId: teacherProfile.id },
      include: {
        student: {
          include: { user: true }
        },
        subscriptions: {
          include: {
            billingRecords: {
              orderBy: { month: 'desc' },
              take: 12 // Last 12 months
            }
          }
        },
        lessons: {
          where: {
            date: { gte: new Date() }
          },
          take: 5,
          orderBy: { date: 'asc' }
        }
      },
      orderBy: [
        { status: 'asc' }, // Active slots first
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Calculate summary statistics
    const activeSlots = slots.filter(slot => slot.status === 'ACTIVE');
    const monthlyRevenue = activeSlots.reduce((total, slot) => total + slot.monthlyRate, 0);
    
    const summary = {
      totalSlots: slots.length,
      activeSlots: activeSlots.length,
      monthlyRevenue,
      totalStudents: new Set(slots.map(slot => slot.studentId)).size
    };

    return NextResponse.json({
      success: true,
      data: slots,
      summary
    });

  } catch (error) {
    console.error("Error fetching teacher's recurring slots:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
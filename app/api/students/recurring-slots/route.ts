import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog, dbLog, schedulerLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only students can access this endpoint
    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Only students can access their slots" },
        { status: 403 }
      );
    }

    // Get student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get all recurring slots for this student
    const slots = await prisma.recurringSlot.findMany({
      where: { studentId: studentProfile.id },
      include: {
        teacher: {
          include: { user: true }
        },
        subscriptions: {
          include: {
            billingRecords: {
              orderBy: { month: 'desc' }
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

    return NextResponse.json({
      success: true,
      data: slots
    });

  } catch (error) {
    apiLog.error("Error fetching student's recurring slots", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  handleApiError
} from "@/lib/api-responses";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return createAuthErrorResponse();
    }

    // Only teachers can access this endpoint
    if (session.user.role !== "TEACHER") {
      return createForbiddenResponse("Only teachers can access their slots");
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return createNotFoundResponse("Teacher profile");
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

    return createSuccessResponse({
      slots,
      summary
    });

  } catch (error) {
    return handleApiError(error);
  }
}
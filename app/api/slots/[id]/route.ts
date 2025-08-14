import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateSlotSchema, cancelSlotSchema } from "@/lib/validations";
import { calculateRefundAmount } from "@/lib/slot-helpers";

// Get slot details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const slotId = params.id;

    const slot = await prisma.recurringSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: {
          include: { user: true }
        },
        student: {
          include: { user: true }
        },
        subscriptions: {
          include: {
            billingRecords: true
          }
        },
        lessons: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    // Check permissions - only the teacher, student, or admin can view
    const userRole = session.user.role;
    const isTeacher = userRole === 'TEACHER' && slot.teacherId === session.user.teacherProfile?.id;
    const isStudent = userRole === 'STUDENT' && slot.studentId === session.user.studentProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: slot
    });

  } catch (error) {
    console.error("Error fetching slot:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update slot (for rate changes, status changes)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const slotId = params.id;
    const body = await request.json();
    
    const validation = updateSlotSchema.safeParse({ ...body, slotId });

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid data",
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { status, monthlyRate } = validation.data;

    // Get the slot to check permissions
    const slot = await prisma.recurringSlot.findUnique({
      where: { id: slotId },
      include: { teacher: true }
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    // Only teacher or admin can update slots
    const userRole = session.user.role;
    const isTeacher = userRole === 'TEACHER' && slot.teacherId === session.user.teacherProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only teachers and admins can update slots" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (monthlyRate !== undefined) updateData.monthlyRate = monthlyRate;

    const updatedSlot = await prisma.recurringSlot.update({
      where: { id: slotId },
      data: updateData,
      include: {
        teacher: { include: { user: true } },
        student: { include: { user: true } },
        subscriptions: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedSlot,
      message: "Slot updated successfully"
    });

  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Cancel slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const slotId = params.id;
    const body = await request.json();
    
    const validation = cancelSlotSchema.safeParse({ ...body, slotId });

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid data",
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { cancelDate, reason, refundAmount } = validation.data;

    // Get the slot to check permissions
    const slot = await prisma.recurringSlot.findUnique({
      where: { id: slotId },
      include: { 
        teacher: true,
        student: true,
        subscriptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    // Students can cancel their own slots, teachers and admins can cancel any
    const userRole = session.user.role;
    const isStudent = userRole === 'STUDENT' && slot.studentId === session.user.studentProfile?.id;
    const isTeacher = userRole === 'TEACHER' && slot.teacherId === session.user.teacherProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isStudent && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Cancel all future lessons and update slot status
    const result = await prisma.$transaction(async (tx) => {
      // Update slot status
      const cancelledSlot = await tx.recurringSlot.update({
        where: { id: slotId },
        data: {
          status: 'CANCELLED',
          cancelledAt: cancelDate
        }
      });

      // Cancel all active subscriptions
      await tx.slotSubscription.updateMany({
        where: {
          slotId,
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED'
        }
      });

      // Cancel all future scheduled lessons
      await tx.lesson.updateMany({
        where: {
          recurringSlotId: slotId,
          date: { gte: cancelDate },
          status: 'SCHEDULED'
        },
        data: {
          status: 'CANCELLED'
        }
      });

      return cancelledSlot;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Slot cancelled successfully"
    });

  } catch (error) {
    console.error("Error cancelling slot:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateBillingSchema } from "@/lib/validations";

// Update billing record (mark as paid, update actual lessons, etc.)
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

    const billingId = params.id;
    const body = await request.json();
    
    const validation = updateBillingSchema.safeParse({ ...body, billingId });

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

    const { actualLessons, status, paymentMethod, paidAt } = validation.data;

    // Get the billing record to check permissions
    const billing = await prisma.monthlyBilling.findUnique({
      where: { id: billingId },
      include: {
        subscription: {
          include: {
            slot: true
          }
        },
        teacher: true,
        student: true
      }
    });

    if (!billing) {
      return NextResponse.json(
        { success: false, error: "Billing record not found" },
        { status: 404 }
      );
    }

    // Check permissions - only teacher, student, or admin can update
    const userRole = session.user.role;
    const isTeacher = userRole === 'TEACHER' && billing.teacherId === session.user.teacherProfile?.id;
    const isStudent = userRole === 'STUDENT' && billing.studentId === session.user.studentProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Students can only mark as paid, teachers and admins can update everything
    if (userRole === 'STUDENT' && (actualLessons !== undefined || (status && status !== 'PAID'))) {
      return NextResponse.json(
        { success: false, error: "Students can only mark bills as paid" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (actualLessons !== undefined) updateData.actualLessons = actualLessons;
    if (status !== undefined) updateData.status = status;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paidAt !== undefined) updateData.paidAt = paidAt;

    // If marking as paid, set paidAt to now if not provided
    if (status === 'PAID' && !paidAt) {
      updateData.paidAt = new Date();
    }

    const updatedBilling = await prisma.monthlyBilling.update({
      where: { id: billingId },
      data: updateData,
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
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedBilling,
      message: "Billing record updated successfully"
    });

  } catch (error) {
    console.error("Error updating billing record:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get billing record details
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

    const billingId = params.id;

    const billing = await prisma.monthlyBilling.findUnique({
      where: { id: billingId },
      include: {
        subscription: {
          include: {
            slot: {
              include: {
                teacher: { include: { user: true } },
                student: { include: { user: true } },
                lessons: {
                  where: {
                    date: {
                      gte: new Date(`${billing?.month}-01`),
                      lt: new Date(new Date(`${billing?.month}-01`).getTime() + 32 * 24 * 60 * 60 * 1000)
                    }
                  },
                  orderBy: { date: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!billing) {
      return NextResponse.json(
        { success: false, error: "Billing record not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = session.user.role;
    const isTeacher = userRole === 'TEACHER' && billing.teacherId === session.user.teacherProfile?.id;
    const isStudent = userRole === 'STUDENT' && billing.studentId === session.user.studentProfile?.id;
    const isAdmin = userRole === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: billing
    });

  } catch (error) {
    console.error("Error fetching billing record:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateStudentChecklistItemSchema, toggleChecklistItemSchema } from "@/lib/validations";
import { sendEmail, createChecklistCompletionEmail } from "@/lib/email";
import { z } from "zod";
import { apiLog, dbLog, emailLog } from '@/lib/logger';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/student-checklists/items/[id] - Get a single checklist item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id },
      include: {
        checklist: {
          include: {
            student: true,
          }
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Check authorization based on role
    if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile || item.checklist.studentId !== studentProfile.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    } else if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile || item.checklist.student.teacherId !== teacherProfile.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    apiLog.error('Error fetching checklist item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to fetch checklist item" },
      { status: 500 }
    );
  }
}

// PUT /api/student-checklists/items/[id] - Update a checklist item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["STUDENT", "TEACHER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id },
      include: {
        checklist: {
          include: {
            student: true,
          }
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Check authorization based on role
    if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile || item.checklist.studentId !== studentProfile.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    } else if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile || item.checklist.student.teacherId !== teacherProfile.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = updateStudentChecklistItemSchema.parse({
      ...body,
      id,
    });

    const { id: validatedId, ...updateData } = validatedData;

    // Handle completion status change
    if (updateData.isCompleted !== undefined) {
      updateData.completedAt = updateData.isCompleted ? new Date() : undefined;
    }

    const updatedItem = await prisma.studentChecklistItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error updating checklist item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-checklists/items/[id] - Delete a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    const { id } = await params;
    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id },
      include: {
        checklist: true,
      },
    });

    if (!item || item.checklist.studentId !== studentProfile.id) {
      return NextResponse.json(
        { error: "Item not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.studentChecklistItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    apiLog.error('Error deleting checklist item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}

// PATCH /api/student-checklists/items/[id] - Toggle completion status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = toggleChecklistItemSchema.parse({
      itemId: id,
      isCompleted: body.isCompleted,
    });

    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id },
      include: {
        checklist: {
          include: {
            student: {
              include: {
                user: true,
                teacher: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!item || item.checklist.studentId !== studentProfile.id) {
      return NextResponse.json(
        { error: "Item not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedItem = await prisma.studentChecklistItem.update({
      where: { id },
      data: {
        isCompleted: validatedData.isCompleted,
        completedAt: validatedData.isCompleted ? new Date() : null,
      },
    });

    // Check if the checklist is now complete and send email if needed
    if (validatedData.isCompleted) {
      // Get all items for this checklist to check completion status
      const allItems = await prisma.studentChecklistItem.findMany({
        where: { checklistId: item.checklist.id },
      });

      const totalItems = allItems.length;
      const completedItems = allItems.filter(item => item.isCompleted).length;

      // If this was the last item to complete the checklist
      if (completedItems === totalItems && totalItems > 0) {
        const student = item.checklist.student;
        const teacher = student.teacher;

        if (student.user.email) {
          try {
            const emailContent = createChecklistCompletionEmail(
              student.user.name || 'Student',
              item.checklist.title,
              totalItems,
              teacher?.user.name
            );

            await sendEmail({
              to: student.user.email,
              subject: `🎉 Congratulations! You completed "${item.checklist.title}"`,
              html: emailContent
            });
          } catch (error) {
            apiLog.error('Failed to send checklist completion email:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
          }
        }
      }
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error toggling checklist item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to toggle checklist item" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateStudentChecklistItemSchema, toggleChecklistItemSchema } from "@/lib/validations";
import { z } from "zod";

// PUT /api/student-checklists/items/[id] - Update a checklist item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id: params.id },
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

    const body = await request.json();
    const validatedData = updateStudentChecklistItemSchema.parse({
      ...body,
      id: params.id,
    });

    const { id, ...updateData } = validatedData;

    // Handle completion status change
    if (updateData.isCompleted !== undefined) {
      updateData.completedAt = updateData.isCompleted ? new Date() : null;
    }

    const updatedItem = await prisma.studentChecklistItem.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to update checklist item" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-checklists/items/[id] - Delete a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id: params.id },
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
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}

// PATCH /api/student-checklists/items/[id] - Toggle completion status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const validatedData = toggleChecklistItemSchema.parse({
      itemId: params.id,
      isCompleted: body.isCompleted,
    });

    // Verify ownership through the checklist
    const item = await prisma.studentChecklistItem.findFirst({
      where: { id: params.id },
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

    const updatedItem = await prisma.studentChecklistItem.update({
      where: { id: params.id },
      data: {
        isCompleted: validatedData.isCompleted,
        completedAt: validatedData.isCompleted ? new Date() : null,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error toggling checklist item:", error);
    return NextResponse.json(
      { error: "Failed to toggle checklist item" },
      { status: 500 }
    );
  }
}
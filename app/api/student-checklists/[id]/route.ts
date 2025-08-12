import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateStudentChecklistSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/student-checklists/[id] - Get a specific checklist
export async function GET(
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

    const checklist = await prisma.studentChecklist.findFirst({
      where: {
        id: params.id,
        studentId: studentProfile.id,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // Calculate completion stats
    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter(
      (item) => item.isCompleted
    ).length;
    const progressPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      ...checklist,
      stats: {
        totalItems,
        completedItems,
        progressPercent,
      },
    });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// PUT /api/student-checklists/[id] - Update a checklist
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

    // Verify ownership
    const existingChecklist = await prisma.studentChecklist.findFirst({
      where: {
        id: params.id,
        studentId: studentProfile.id,
      },
    });

    if (!existingChecklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateStudentChecklistSchema.parse({
      ...body,
      id: params.id,
    });

    const { id, ...updateData } = validatedData;

    const updatedChecklist = await prisma.studentChecklist.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(updatedChecklist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating checklist:", error);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-checklists/[id] - Delete a checklist
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

    // Verify ownership
    const existingChecklist = await prisma.studentChecklist.findFirst({
      where: {
        id: params.id,
        studentId: studentProfile.id,
      },
    });

    if (!existingChecklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    await prisma.studentChecklist.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Checklist deleted successfully" });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}
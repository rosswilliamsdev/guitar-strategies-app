import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStudentChecklistItemSchema } from "@/lib/validations";
import { z } from "zod";

// POST /api/student-checklists/items - Create a new checklist item
export async function POST(request: NextRequest) {
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
    const validatedData = createStudentChecklistItemSchema.parse(body);

    // Verify ownership of the checklist
    const checklist = await prisma.studentChecklist.findFirst({
      where: {
        id: validatedData.checklistId,
        studentId: studentProfile.id,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get the highest sortOrder for the checklist
    const maxSortOrder = await prisma.studentChecklistItem.findFirst({
      where: { checklistId: validatedData.checklistId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder || 0) + 1;

    const item = await prisma.studentChecklistItem.create({
      data: {
        ...validatedData,
        sortOrder: validatedData.sortOrder || newSortOrder,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating checklist item:", error);
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
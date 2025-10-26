import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStudentChecklistItemSchema } from "@/lib/validations";
import { z } from "zod";
import { apiLog, dbLog } from '@/lib/logger';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const item = await prisma.studentChecklistItem.create({
      data: validatedData,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error creating checklist item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
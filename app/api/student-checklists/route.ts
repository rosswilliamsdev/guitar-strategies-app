import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStudentChecklistSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/student-checklists - Get all checklists for a student
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const whereClause: any = {
      studentId: studentProfile.id,
      ...(includeArchived ? {} : { isArchived: false }),
    };

    const checklists = await prisma.studentChecklist.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate completion stats for each checklist
    const checklistsWithStats = checklists.map((checklist) => {
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.isCompleted
      ).length;
      const progressPercent =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...checklist,
        stats: {
          totalItems,
          completedItems,
          progressPercent,
        },
      };
    });

    return NextResponse.json(checklistsWithStats);
  } catch (error) {
    console.error("Error fetching student checklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

// POST /api/student-checklists - Create a new checklist
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
    const validatedData = createStudentChecklistSchema.parse(body);

    const checklist = await prisma.studentChecklist.create({
      data: {
        ...validatedData,
        studentId: studentProfile.id,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating checklist:", error);
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
}
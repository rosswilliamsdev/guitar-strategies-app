import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateStudentChecklistSchema } from "@/lib/validations";
import { z } from "zod";
import { apiLog, dbLog } from '@/lib/logger';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/student-checklists/[id] - Get a specific checklist
export async function GET(
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

    // Try to find as student checklist first
    const checklist = await prisma.studentChecklist.findFirst({
      where: {
        id,
        studentId: studentProfile.id,
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (checklist) {
      // Calculate completion stats for student checklist
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.isCompleted
      ).length;
      const progressPercent =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return NextResponse.json({
        ...checklist,
        createdByRole: "STUDENT",
        stats: {
          totalItems,
          completedItems,
          progressPercent,
        },
      });
    }

    // If not found, try to find as a curriculum
    const curriculum = await prisma.curriculum.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            }
          },
          orderBy: { sortOrder: "asc" }
        },
        teacher: {
          select: {
            userId: true,
            user: {
              select: { name: true, role: true }
            }
          }
        },
        studentProgress: {
          where: {
            studentId: studentProfile.id
          },
          include: {
            itemProgress: true
          }
        }
      }
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Checklist or curriculum not found" },
        { status: 404 }
      );
    }

    // Get student progress for this curriculum
    const studentProgress = curriculum.studentProgress?.[0];

    // Flatten all items from all sections
    const allItems = curriculum.sections.flatMap((section) =>
      section.items.map((item) => {
        const itemProgress = studentProgress?.itemProgress?.find((progress) => progress.itemId === item.id);
        const isCompleted = itemProgress?.status === "COMPLETED";

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          isCompleted: isCompleted,
          completedAt: itemProgress?.completedAt || null,
          sortOrder: item.sortOrder,
        };
      })
    );

    const totalItems = allItems.length;
    const completedItems = allItems.filter((item) => item.isCompleted).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      id: curriculum.id,
      title: curriculum.title,
      isActive: curriculum.isActive,
      isArchived: false,
      createdAt: curriculum.createdAt,
      updatedAt: curriculum.updatedAt,
      studentId: studentProfile.id,
      createdBy: curriculum.teacher.userId,
      createdByRole: "TEACHER",
      creator: {
        name: curriculum.teacher.user.name,
        role: curriculum.teacher.user.role
      },
      items: allItems,
      stats: {
        totalItems,
        completedItems,
        progressPercent,
      }
    });
  } catch (error) {
    apiLog.error('Error fetching checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

// PUT /api/student-checklists/[id] - Update a checklist
export async function PUT(
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
    // Verify ownership
    const existingChecklist = await prisma.studentChecklist.findFirst({
      where: {
        id,
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
      id,
    });

    const { id: validatedId, ...updateData } = validatedData;

    const updatedChecklist = await prisma.studentChecklist.update({
      where: { id },
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
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error updating checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

// DELETE /api/student-checklists/[id] - Delete a checklist
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
    // Verify ownership
    const existingChecklist = await prisma.studentChecklist.findFirst({
      where: {
        id,
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
      where: { id },
    });

    return NextResponse.json({ message: "Checklist deleted successfully" });
  } catch (error) {
    apiLog.error('Error deleting checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}
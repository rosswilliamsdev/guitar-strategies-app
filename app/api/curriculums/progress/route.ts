import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/curriculums/progress - Update curriculum item progress for a student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, curriculumId, itemId, status } = body;

    if (!studentId || !curriculumId || !itemId) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, curriculumId, itemId" },
        { status: 400 }
      );
    }

    // Verify the teacher owns this student (if teacher)
    if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }

      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
      });

      if (!studentProfile || studentProfile.teacherId !== teacherProfile.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get or create StudentCurriculumProgress
    let curriculumProgress = await prisma.studentCurriculumProgress.findUnique({
      where: {
        studentId_curriculumId: {
          studentId,
          curriculumId,
        },
      },
      include: {
        itemProgress: true,
      },
    });

    if (!curriculumProgress) {
      // Create new progress record
      curriculumProgress = await prisma.studentCurriculumProgress.create({
        data: {
          studentId,
          curriculumId,
        },
        include: {
          itemProgress: true,
        },
      });
    }

    // Update or create item progress
    const itemProgress = await prisma.studentItemProgress.upsert({
      where: {
        curriculumProgressId_itemId: {
          curriculumProgressId: curriculumProgress.id,
          itemId,
        },
      },
      update: {
        status: status || "COMPLETED",
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      create: {
        curriculumProgressId: curriculumProgress.id,
        itemId,
        status: status || "COMPLETED",
        startedAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    // Recalculate overall curriculum progress
    const allItemProgress = await prisma.studentItemProgress.findMany({
      where: { curriculumProgressId: curriculumProgress.id },
    });

    // Get the actual total number of items in the curriculum
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: curriculumId },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });

    const totalItems = curriculum?.sections.reduce((sum, section) => sum + section.items.length, 0) || 0;
    const completedItems = allItemProgress.filter(p => p.status === "COMPLETED").length;
    const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Update curriculum progress stats
    await prisma.studentCurriculumProgress.update({
      where: { id: curriculumProgress.id },
      data: {
        totalItems,
        completedItems,
        progressPercent,
      },
    });

    apiLog.info("Curriculum item progress updated", {
      studentId,
      curriculumId,
      itemId,
      status: status || "COMPLETED",
    });

    return NextResponse.json({ success: true, itemProgress });
  } catch (error) {
    apiLog.error("Error updating curriculum progress:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to update curriculum progress" },
      { status: 500 }
    );
  }
}
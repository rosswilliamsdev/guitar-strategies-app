import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProgressSchema, teacherProgressUpdateSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/curriculums/progress - Get student's progress
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const curriculumId = searchParams.get("curriculumId");
    const studentId = searchParams.get("studentId");

    if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }

      const progress = await prisma.studentCurriculumProgress.findMany({
        where: {
          studentId: studentProfile.id,
          ...(curriculumId && { curriculumId }),
        },
        include: {
          curriculum: {
            include: {
              sections: {
                include: {
                  items: true,
                },
              },
            },
          },
          itemProgress: true,
        },
      });

      return NextResponse.json(progress);
    } else if (session.user.role === "TEACHER") {
      if (!studentId) {
        return NextResponse.json(
          { error: "Student ID is required for teachers" },
          { status: 400 }
        );
      }

      // Verify the student belongs to the teacher
      const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
      });

      if (!student || student.teacherId !== session.user.teacherProfile?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const progress = await prisma.studentCurriculumProgress.findMany({
        where: {
          studentId,
          ...(curriculumId && { curriculumId }),
        },
        include: {
          curriculum: true,
          itemProgress: true,
        },
      });

      return NextResponse.json(progress);
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

// POST /api/curriculums/progress - Start or update progress
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (session.user.role === "STUDENT") {
      const validatedData = updateProgressSchema.parse(body);

      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }

      // Verify the curriculum is available to the student
      const curriculum = await prisma.curriculum.findUnique({
        where: { id: validatedData.curriculumId },
      });

      if (
        !curriculum ||
        curriculum.teacherId !== studentProfile.teacherId ||
        !curriculum.isPublished
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Find or create curriculum progress
      let curriculumProgress = await prisma.studentCurriculumProgress.findUnique({
        where: {
          studentId_curriculumId: {
            studentId: studentProfile.id,
            curriculumId: validatedData.curriculumId,
          },
        },
      });

      if (!curriculumProgress) {
        // Count total items in curriculum
        const totalItems = await prisma.curriculumItem.count({
          where: {
            section: {
              curriculumId: validatedData.curriculumId,
            },
          },
        });

        curriculumProgress = await prisma.studentCurriculumProgress.create({
          data: {
            studentId: studentProfile.id,
            curriculumId: validatedData.curriculumId,
            totalItems,
            completedItems: 0,
            progressPercent: 0,
          },
        });
      }

      // Update or create item progress
      const itemProgress = await prisma.studentItemProgress.upsert({
        where: {
          curriculumProgressId_itemId: {
            curriculumProgressId: curriculumProgress.id,
            itemId: validatedData.itemId,
          },
        },
        update: {
          status: validatedData.status,
          studentNotes: validatedData.studentNotes,
          ...(validatedData.status === "IN_PROGRESS" && !body.startedAt && { startedAt: new Date() }),
          ...(validatedData.status === "COMPLETED" && { completedAt: new Date() }),
        },
        create: {
          curriculumProgressId: curriculumProgress.id,
          itemId: validatedData.itemId,
          status: validatedData.status,
          studentNotes: validatedData.studentNotes,
          ...(validatedData.status === "IN_PROGRESS" && { startedAt: new Date() }),
          ...(validatedData.status === "COMPLETED" && { completedAt: new Date() }),
        },
      });

      // Update curriculum progress stats
      const completedCount = await prisma.studentItemProgress.count({
        where: {
          curriculumProgressId: curriculumProgress.id,
          status: "COMPLETED",
        },
      });

      const updatedProgress = await prisma.studentCurriculumProgress.update({
        where: { id: curriculumProgress.id },
        data: {
          completedItems: completedCount,
          progressPercent: (completedCount / curriculumProgress.totalItems) * 100,
          ...(completedCount === curriculumProgress.totalItems && { completedAt: new Date() }),
        },
        include: {
          itemProgress: true,
        },
      });

      return NextResponse.json(updatedProgress);
    } else if (session.user.role === "TEACHER") {
      const validatedData = teacherProgressUpdateSchema.parse(body);

      // Verify the student belongs to the teacher
      const student = await prisma.studentProfile.findUnique({
        where: { id: validatedData.studentId },
      });

      if (!student || student.teacherId !== session.user.teacherProfile?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Find or create curriculum progress
      let curriculumProgress = await prisma.studentCurriculumProgress.findUnique({
        where: {
          studentId_curriculumId: {
            studentId: validatedData.studentId,
            curriculumId: validatedData.curriculumId,
          },
        },
      });

      if (!curriculumProgress) {
        const totalItems = await prisma.curriculumItem.count({
          where: {
            section: {
              curriculumId: validatedData.curriculumId,
            },
          },
        });

        curriculumProgress = await prisma.studentCurriculumProgress.create({
          data: {
            studentId: validatedData.studentId,
            curriculumId: validatedData.curriculumId,
            totalItems,
            completedItems: 0,
            progressPercent: 0,
          },
        });
      }

      // Update item progress with teacher notes
      const itemProgress = await prisma.studentItemProgress.upsert({
        where: {
          curriculumProgressId_itemId: {
            curriculumProgressId: curriculumProgress.id,
            itemId: validatedData.itemId,
          },
        },
        update: {
          status: validatedData.status,
          teacherNotes: validatedData.teacherNotes,
          ...(validatedData.status === "COMPLETED" && { completedAt: new Date() }),
        },
        create: {
          curriculumProgressId: curriculumProgress.id,
          itemId: validatedData.itemId,
          status: validatedData.status,
          teacherNotes: validatedData.teacherNotes,
          ...(validatedData.status === "COMPLETED" && { completedAt: new Date() }),
        },
      });

      // Update curriculum progress stats
      const completedCount = await prisma.studentItemProgress.count({
        where: {
          curriculumProgressId: curriculumProgress.id,
          status: "COMPLETED",
        },
      });

      await prisma.studentCurriculumProgress.update({
        where: { id: curriculumProgress.id },
        data: {
          completedItems: completedCount,
          progressPercent: (completedCount / curriculumProgress.totalItems) * 100,
        },
      });

      return NextResponse.json(itemProgress);
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateCurriculumSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/curriculums/[id] - Get a specific curriculum
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: params.id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        sections: {
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        studentProgress: session.user.role === "TEACHER" ? {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            itemProgress: true,
          },
        } : undefined,
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    if (session.user.role === "TEACHER") {
      if (curriculum.teacherId !== session.user.teacherProfile?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (
        !studentProfile ||
        curriculum.teacherId !== studentProfile.teacherId ||
        !curriculum.isPublished
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Add student's progress
      const progress = await prisma.studentCurriculumProgress.findUnique({
        where: {
          studentId_curriculumId: {
            studentId: studentProfile.id,
            curriculumId: curriculum.id,
          },
        },
        include: {
          itemProgress: true,
        },
      });

      return NextResponse.json({ ...curriculum, studentProgress: progress });
    }

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error("Error fetching curriculum:", error);
    return NextResponse.json(
      { error: "Failed to fetch curriculum" },
      { status: 500 }
    );
  }
}

// PUT /api/curriculums/[id] - Update a curriculum
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: params.id },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found" },
        { status: 404 }
      );
    }

    if (curriculum.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCurriculumSchema.parse({ ...body, id: params.id });

    const updatedCurriculum = await prisma.curriculum.update({
      where: { id: params.id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        level: validatedData.level,
        isPublished: validatedData.isPublished,
      },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
        studentProgress: true,
      },
    });

    return NextResponse.json(updatedCurriculum);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating curriculum:", error);
    return NextResponse.json(
      { error: "Failed to update curriculum" },
      { status: 500 }
    );
  }
}

// DELETE /api/curriculums/[id] - Delete a curriculum
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const curriculum = await prisma.curriculum.findUnique({
      where: { id: params.id },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found" },
        { status: 404 }
      );
    }

    if (curriculum.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    await prisma.curriculum.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Curriculum deleted successfully" });
  } catch (error) {
    console.error("Error deleting curriculum:", error);
    return NextResponse.json(
      { error: "Failed to delete curriculum" },
      { status: 500 }
    );
  }
}
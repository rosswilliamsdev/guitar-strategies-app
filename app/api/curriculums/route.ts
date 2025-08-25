import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/curriculums - Get all curriculums for a teacher or student
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");

    let curriculums;

    if (session.user.role === "TEACHER") {
      // Teachers see their own curriculums
      curriculums = await prisma.curriculum.findMany({
        where: {
          teacherId: session.user.teacherProfile?.id,
        },
        include: {
          sections: {
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          studentProgress: {
            include: {
              student: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (session.user.role === "STUDENT") {
      // Students see their teacher's published curriculums
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }

      curriculums = await prisma.curriculum.findMany({
        where: {
          teacherId: studentProfile.teacherId,
          isPublished: true,
          isActive: true,
        },
        include: {
          sections: {
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          studentProgress: {
            where: {
              studentId: studentProfile.id,
            },
            include: {
              itemProgress: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Admin can see all curriculums
      curriculums = await prisma.curriculum.findMany({
        where: teacherId ? { teacherId } : {},
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
          studentProgress: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json(curriculums);
  } catch (error) {
    console.error("Error fetching curriculums:", error);
    return NextResponse.json(
      { error: "Failed to fetch curriculums" },
      { status: 500 }
    );
  }
}

// POST /api/curriculums - Create a new curriculum (teachers only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createCurriculumSchema.parse(body);

    const curriculum = await prisma.curriculum.create({
      data: {
        ...validatedData,
        teacherId: teacherProfile.id,
      },
      include: {
        sections: true,
        studentProgress: true,
      },
    });

    return NextResponse.json(curriculum, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating curriculum:", error);
    return NextResponse.json(
      { error: "Failed to create curriculum" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumSchema } from "@/lib/validations";
import { apiLog } from "@/lib/logger";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Teachers see their own curriculums
    if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Get all curriculums for this teacher
      const curriculums = await prisma.curriculum.findMany({
        where: {
          teacherId: teacherProfile.id,
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      apiLog.info("Fetched curriculums for teacher from database", {
        teacherId: teacherProfile.id,
        count: curriculums.length,
        curriculumIds: curriculums.map(c => c.id),
        curriculumTitles: curriculums.map(c => c.title),
      });

      return NextResponse.json({ curriculums }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Students see curriculums from their assigned teacher
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

      // Get all published curriculums from student's teacher with student progress
      const curriculums = await prisma.curriculum.findMany({
        where: {
          teacherId: studentProfile.teacherId,
          isPublished: true,
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
        orderBy: {
          createdAt: "desc",
        },
      });

      apiLog.info("Fetched curriculums for student", {
        studentId: studentProfile.id,
        teacherId: studentProfile.teacherId,
        count: curriculums.length,
        curriculumIds: curriculums.map(c => c.id),
        progressData: curriculums.map(c => ({
          id: c.id,
          title: c.title,
          hasProgress: !!c.studentProgress?.[0],
          totalItems: c.studentProgress?.[0]?.totalItems,
          completedItems: c.studentProgress?.[0]?.completedItems,
        })),
      });

      return NextResponse.json({ curriculums }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Other roles not supported
    return NextResponse.json(
      { error: "Invalid role for accessing curriculums" },
      { status: 403 }
    );
  } catch (error) {
    apiLog.error("Error fetching curriculums", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers can create curriculums
    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can create curriculums" },
        { status: 403 }
      );
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

    // Sanitize inputs
    const sanitizedTitle = sanitizePlainText(validatedData.title);
    const sanitizedDescription = validatedData.description
      ? sanitizeRichText(validatedData.description)
      : null;

    // Create curriculum
    const curriculum = await prisma.curriculum.create({
      data: {
        teacherId: teacherProfile.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        isPublished: validatedData.isPublished || false,
      },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });

    apiLog.info("Created curriculum", {
      curriculumId: curriculum.id,
      teacherId: teacherProfile.id,
      title: curriculum.title,
    });

    return NextResponse.json({ curriculum }, { status: 201 });
  } catch (error) {
    apiLog.error("Error creating curriculum", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
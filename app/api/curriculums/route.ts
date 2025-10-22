import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumSchema } from "@/lib/validations";
import { apiLog } from "@/lib/logger";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers can create/manage curriculums
    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Only teachers can access curriculums" },
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

    apiLog.info("Fetched curriculums", {
      teacherId: teacherProfile.id,
      count: curriculums.length,
    });

    return NextResponse.json({ curriculums });
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
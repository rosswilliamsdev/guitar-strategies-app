import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateCurriculumSchema } from "@/lib/validations";
import { apiLog } from "@/lib/logger";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch curriculum with all relations
    const curriculum = await prisma.curriculum.findUnique({
      where: { id },
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
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found" },
        { status: 404 }
      );
    }

    // Check access: Teachers can only view their own curriculums
    // Students can view curriculums assigned to them
    if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (curriculum.teacherId !== teacherProfile?.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    apiLog.info("Fetched curriculum", {
      curriculumId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ curriculum });
  } catch (error) {
    apiLog.error("Error fetching curriculum", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateCurriculumSchema.parse(body);

    // Verify the curriculum belongs to this teacher
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });

    const curriculum = await prisma.curriculum.findFirst({
      where: {
        id,
        teacherId: teacherProfile?.id,
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found or access denied" },
        { status: 404 }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = validatedData.title
      ? sanitizePlainText(validatedData.title)
      : undefined;
    const sanitizedDescription = validatedData.description
      ? sanitizeRichText(validatedData.description)
      : undefined;

    // Update curriculum
    const updatedCurriculum = await prisma.curriculum.update({
      where: { id },
      data: {
        ...(sanitizedTitle && { title: sanitizedTitle }),
        ...(sanitizedDescription !== undefined && {
          description: sanitizedDescription,
        }),
        ...(validatedData.isPublished !== undefined && {
          isPublished: validatedData.isPublished,
        }),
      },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });

    apiLog.info("Updated curriculum", {
      curriculumId: id,
    });

    return NextResponse.json({ curriculum: updatedCurriculum });
  } catch (error) {
    apiLog.error("Error updating curriculum", {
      error: error instanceof Error ? error.message : String(error),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the curriculum belongs to this teacher
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
    });

    const curriculum = await prisma.curriculum.findFirst({
      where: {
        id,
        teacherId: teacherProfile?.id,
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found or access denied" },
        { status: 404 }
      );
    }

    // Delete curriculum (cascade will delete sections, items, and progress)
    await prisma.curriculum.delete({
      where: { id },
    });

    apiLog.info("Deleted curriculum", {
      curriculumId: id,
      teacherId: teacherProfile?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("Error deleting curriculum", {
      error: error instanceof Error ? error.message : String(error),
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
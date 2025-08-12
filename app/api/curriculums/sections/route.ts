import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumSectionSchema } from "@/lib/validations";
import { z } from "zod";

// POST /api/curriculums/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCurriculumSectionSchema.parse(body);

    // Verify the curriculum belongs to the teacher
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: validatedData.curriculumId },
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

    // Get the max sort order for existing sections
    const maxSortOrder = await prisma.curriculumSection.findFirst({
      where: { curriculumId: validatedData.curriculumId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const section = await prisma.curriculumSection.create({
      data: {
        ...validatedData,
        sortOrder: validatedData.sortOrder ?? ((maxSortOrder?.sortOrder ?? -1) + 1),
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating section:", error);
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}

// PUT /api/curriculums/sections - Update multiple sections (for reordering)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sections } = body as { sections: Array<{ id: string; sortOrder: number }> };

    // Verify all sections belong to the teacher's curriculum
    const sectionIds = sections.map(s => s.id);
    const existingSections = await prisma.curriculumSection.findMany({
      where: { id: { in: sectionIds } },
      include: {
        curriculum: true,
      },
    });

    const teacherId = session.user.teacherProfile?.id;
    if (existingSections.some(s => s.curriculum.teacherId !== teacherId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update sort orders in a transaction
    await prisma.$transaction(
      sections.map(section =>
        prisma.curriculumSection.update({
          where: { id: section.id },
          data: { sortOrder: section.sortOrder },
        })
      )
    );

    return NextResponse.json({ message: "Sections reordered successfully" });
  } catch (error) {
    console.error("Error updating sections:", error);
    return NextResponse.json(
      { error: "Failed to update sections" },
      { status: 500 }
    );
  }
}
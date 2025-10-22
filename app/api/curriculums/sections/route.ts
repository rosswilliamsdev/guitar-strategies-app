import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createCurriculumSectionSchema,
  updateCurriculumSectionSchema,
} from "@/lib/validations";
import { apiLog } from "@/lib/logger";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCurriculumSectionSchema.parse(body);

    // Verify the curriculum belongs to this teacher
    const curriculum = await prisma.curriculum.findFirst({
      where: {
        id: validatedData.curriculumId,
        teacher: { userId: session.user.id },
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum not found or access denied" },
        { status: 404 }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizePlainText(validatedData.title);
    const sanitizedDescription = validatedData.description
      ? sanitizeRichText(validatedData.description)
      : null;

    // Build data object conditionally to avoid undefined category
    const createData: any = {
      curriculumId: validatedData.curriculumId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      sortOrder: validatedData.sortOrder || 0,
    };

    // Only add category if it's provided
    if (validatedData.category) {
      createData.category = validatedData.category;
    }

    // Create section
    const section = await prisma.curriculumSection.create({
      data: createData,
      include: {
        items: true,
      },
    });

    apiLog.info("Created curriculum section", {
      sectionId: section.id,
      curriculumId: curriculum.id,
      title: section.title,
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    apiLog.error("Error creating curriculum section", {
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateCurriculumSectionSchema.parse(body);

    // Verify the section belongs to this teacher's curriculum
    const section = await prisma.curriculumSection.findFirst({
      where: {
        id: validatedData.id,
        curriculum: {
          teacher: { userId: session.user.id },
        },
      },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found or access denied" },
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

    // Update section
    const updatedSection = await prisma.curriculumSection.update({
      where: { id: validatedData.id },
      data: {
        ...(sanitizedTitle && { title: sanitizedTitle }),
        ...(sanitizedDescription !== undefined && {
          description: sanitizedDescription,
        }),
        ...(validatedData.category && { category: validatedData.category }),
        ...(validatedData.sortOrder !== undefined && {
          sortOrder: validatedData.sortOrder,
        }),
      },
      include: {
        items: true,
      },
    });

    apiLog.info("Updated curriculum section", {
      sectionId: updatedSection.id,
    });

    return NextResponse.json({ section: updatedSection });
  } catch (error) {
    apiLog.error("Error updating curriculum section", {
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
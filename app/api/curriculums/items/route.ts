import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumItemSchema } from "@/lib/validations";
import { apiLog } from "@/lib/logger";
import { sanitizePlainText, sanitizeRichText, sanitizeUrl } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCurriculumItemSchema.parse(body);

    // Verify the section belongs to this teacher's curriculum
    const section = await prisma.curriculumSection.findFirst({
      where: {
        id: validatedData.sectionId,
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
    const sanitizedTitle = sanitizePlainText(validatedData.title);
    const sanitizedDescription = validatedData.description
      ? sanitizeRichText(validatedData.description)
      : null;
    const sanitizedResourceUrl = validatedData.resourceUrl
      ? sanitizeUrl(validatedData.resourceUrl)
      : null;
    const sanitizedNotes = validatedData.notes
      ? sanitizeRichText(validatedData.notes)
      : null;

    // Create item
    const item = await prisma.curriculumItem.create({
      data: {
        sectionId: validatedData.sectionId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        sortOrder: validatedData.sortOrder || 0,
        difficulty: validatedData.difficulty,
        estimatedMinutes: validatedData.estimatedMinutes,
        resourceUrl: sanitizedResourceUrl,
        notes: sanitizedNotes,
      },
    });

    apiLog.info("Created curriculum item", {
      itemId: item.id,
      sectionId: section.id,
      title: item.title,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    apiLog.error("Error creating curriculum item", {
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
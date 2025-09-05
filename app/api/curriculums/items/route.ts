import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCurriculumItemSchema, updateCurriculumItemSchema } from "@/lib/validations";
import { z } from "zod";
import { apiLog, dbLog } from '@/lib/logger';

// POST /api/curriculums/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCurriculumItemSchema.parse(body);

    // Verify the section belongs to the teacher's curriculum
    const section = await prisma.curriculumSection.findUnique({
      where: { id: validatedData.sectionId },
      include: {
        curriculum: true,
      },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    if (section.curriculum.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the max sort order for existing items
    const maxSortOrder = await prisma.curriculumItem.findFirst({
      where: { sectionId: validatedData.sectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const item = await prisma.curriculumItem.create({
      data: {
        ...validatedData,
        sortOrder: validatedData.sortOrder ?? ((maxSortOrder?.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    apiLog.error('Error creating item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}

// PUT /api/curriculums/items - Update an item or reorder items
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if it's a reorder request
    if (Array.isArray(body.items)) {
      const { items } = body as { items: Array<{ id: string; sortOrder: number }> };

      // Verify all items belong to the teacher's curriculum
      const itemIds = items.map(i => i.id);
      const existingItems = await prisma.curriculumItem.findMany({
        where: { id: { in: itemIds } },
        include: {
          section: {
            include: {
              curriculum: true,
            },
          },
        },
      });

      const teacherId = session.user.teacherProfile?.id;
      if (existingItems.some(i => i.section.curriculum.teacherId !== teacherId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Update sort orders in a transaction
      await prisma.$transaction(
        items.map(item =>
          prisma.curriculumItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      return NextResponse.json({ message: "Items reordered successfully" });
    } else {
      // Single item update
      const validatedData = updateCurriculumItemSchema.parse(body);

      // Verify the item belongs to the teacher's curriculum
      const existingItem = await prisma.curriculumItem.findUnique({
        where: { id: validatedData.id },
        include: {
          section: {
            include: {
              curriculum: true,
            },
          },
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      if (existingItem.section.curriculum.teacherId !== session.user.teacherProfile?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { id, ...updateData } = validatedData;
      const updatedItem = await prisma.curriculumItem.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json(updatedItem);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    apiLog.error('Error updating item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/curriculums/items/[id] - Delete an item
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify the item belongs to the teacher's curriculum
    const item = await prisma.curriculumItem.findUnique({
      where: { id: itemId },
      include: {
        section: {
          include: {
            curriculum: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (item.section.curriculum.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.curriculumItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    apiLog.error('Error deleting item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
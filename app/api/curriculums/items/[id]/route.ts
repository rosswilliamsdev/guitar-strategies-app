import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/curriculums/items/[id] - Get a single curriculum item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the item
    const item = await prisma.curriculumItem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        sortOrder: true,
        difficulty: true,
        estimatedMinutes: true,
        resourceUrl: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    apiLog.error("Error fetching curriculum item", {
      error: error instanceof Error ? error.message : String(error),
    });

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
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the item belongs to this teacher's curriculum
    const item = await prisma.curriculumItem.findFirst({
      where: {
        id,
        section: {
          curriculum: {
            teacher: { userId: session.user.id },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 404 }
      );
    }

    // Delete item
    await prisma.curriculumItem.delete({
      where: { id },
    });

    apiLog.info("Deleted curriculum item", {
      itemId: id,
      title: item.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("Error deleting curriculum item", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

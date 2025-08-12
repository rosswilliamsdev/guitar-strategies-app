import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isActive } = await request.json();

    // Update student profile active status
    await prisma.studentProfile.update({
      where: {
        userId: params.id,
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling student status:", error);
    return NextResponse.json(
      { error: "Failed to update student status" },
      { status: 500 }
    );
  }
}
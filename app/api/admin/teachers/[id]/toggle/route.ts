import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog, dbLog } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === "ADMIN" ||
      (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isActive } = await request.json();

    // Update teacher profile active status
    await prisma.teacherProfile.update({
      where: {
        userId: id,
      },
      data: {
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error('Error toggling teacher status:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to update teacher status" },
      { status: 500 }
    );
  }
}
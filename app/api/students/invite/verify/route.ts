/**
 * GET /api/students/invite/verify?token=xxx
 *
 * Validates student invitation token and returns details for signup form.
 * This endpoint is for Flow B (student self-signup) only.
 *
 * Returns:
 * - Student name (pre-fill)
 * - Student email (pre-fill)
 * - Teacher name
 * - Token validity status
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiLog } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // Validate token parameter
    if (!token) {
      apiLog.warn("Token verification attempted without token");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (token.length !== 64) {
      apiLog.warn("Invalid token format", { tokenLength: token.length });
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Find invitation with token
    const invitation = await prisma.studentInvitation.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
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

    if (!invitation) {
      apiLog.warn("Token not found", { token: token.substring(0, 10) + "..." });
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid invitation token",
        },
        { status: 404 }
      );
    }

    // Check if token has expired
    const now = new Date();
    if (invitation.expires < now) {
      apiLog.warn("Expired token used", {
        studentId: invitation.studentId,
        expiresAt: invitation.expires,
      });
      return NextResponse.json(
        {
          valid: false,
          error:
            "This invitation has expired. Please request a new invitation from your teacher.",
        },
        { status: 410 }
      );
    }

    // Check if student already has an account
    if (invitation.student.userId) {
      apiLog.warn("Token used for student who already has account", {
        studentId: invitation.studentId,
        userId: invitation.student.userId,
      });
      return NextResponse.json(
        {
          valid: false,
          error: "You already have an account. Please log in instead.",
        },
        { status: 400 }
      );
    }

    apiLog.info("Token verified successfully", {
      studentId: invitation.studentId,
      teacherId: invitation.teacherId,
    });

    // Return invitation details for signup form
    return NextResponse.json({
      valid: true,
      data: {
        studentName: invitation.student.user.name,
        studentEmail: invitation.student.user.email,
        teacherName: invitation.teacher.user.name,
        studentId: invitation.studentId,
        teacherId: invitation.teacherId,
        expiresAt: invitation.expires,
      },
    });
  } catch (error) {
    apiLog.error("Error verifying invitation token", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DEBUG ENDPOINT - Remove after troubleshooting
 * Bypasses all caching to verify database connectivity and data retrieval
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    apiLog.info("Debug lessons endpoint called", {
      userId: session.user.id,
      role: session.user.role,
    });

    let profileId: string | undefined;
    let whereClause: any = {};

    if (session.user.role === "TEACHER") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      apiLog.info("Teacher profile lookup", {
        found: !!teacherProfile,
        profileId: teacherProfile?.id,
      });

      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      profileId = teacherProfile.id;
      whereClause.teacherId = teacherProfile.id;
    } else if (session.user.role === "STUDENT") {
      // For FAMILY accounts, use activeStudentProfileId
      // For INDIVIDUAL accounts, find by userId
      const studentProfile = session.user.activeStudentProfileId
        ? await prisma.studentProfile.findUnique({
            where: { id: session.user.activeStudentProfileId },
          })
        : await prisma.studentProfile.findFirst({
            where: { userId: session.user.id, isActive: true },
          });

      apiLog.info("Student profile lookup", {
        found: !!studentProfile,
        profileId: studentProfile?.id,
        accountType: session.user.accountType,
        activeStudentProfileId: session.user.activeStudentProfileId,
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }

      profileId = studentProfile.id;
      whereClause.studentId = studentProfile.id;
    }

    // Raw database query - NO caching
    const lessons = await prisma.lesson.findMany({
      where: whereClause,
      include: {
        student: {
          include: { user: true },
        },
        teacher: {
          include: { user: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    apiLog.info("Lessons retrieved from database", {
      count: lessons.length,
      profileId,
      role: session.user.role,
      whereClause,
    });

    // Return diagnostic information
    return NextResponse.json(
      {
        success: true,
        debug: {
          userId: session.user.id,
          userRole: session.user.role,
          profileId,
          whereClause,
          timestamp: new Date().toISOString(),
        },
        lessonsCount: lessons.length,
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          date: lesson.date,
          studentName: lesson.student.user.name,
          teacherName: lesson.teacher.user.name,
          duration: lesson.duration,
          status: lesson.status,
          notes: lesson.notes ? lesson.notes.substring(0, 100) : null,
          createdAt: lesson.createdAt,
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    apiLog.error("Debug endpoint error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

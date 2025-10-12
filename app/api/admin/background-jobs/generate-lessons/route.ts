import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFutureLessons } from "@/lib/background-jobs";
import { apiLog, emailLog } from '@/lib/logger';

/**
 * POST /api/admin/background-jobs/generate-lessons
 * Manually trigger the automatic lesson generation job
 * Admin-only endpoint for testing or emergency use
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === "ADMIN" ||
      (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    apiLog.info('Admin ${session.user.email} manually triggered lesson generation job');

    // Run the background job
    const result = await generateFutureLessons();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully generated ${result.lessonsGenerated} lessons for ${result.teachersProcessed} teachers`
        : "Job completed with errors",
      data: {
        lessonsGenerated: result.lessonsGenerated,
        teachersProcessed: result.teachersProcessed,
        errors: result.errors,
      },
    });
  } catch (error) {
    apiLog.error('Error in manual job trigger:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { 
        error: "Failed to execute background job",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
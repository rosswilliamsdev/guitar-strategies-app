import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJobHistory, validateSystemHealth } from "@/lib/background-jobs";
import { apiLog } from '@/lib/logger';

/**
 * GET /api/admin/background-jobs/history
 * Get background job execution history and system health
 * Admin-only endpoint for monitoring
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Get job history and system health in parallel
    const [jobHistory, systemHealth] = await Promise.all([
      getJobHistory(limit),
      validateSystemHealth(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        jobHistory,
        systemHealth,
        summary: {
          totalJobs: jobHistory.length,
          recentSuccess: jobHistory.length > 0 ? jobHistory[0].success : null,
          lastRun: jobHistory.length > 0 ? jobHistory[0].executedAt : null,
          healthIssues: systemHealth.issues.length,
        },
      },
    });
  } catch (error) {
    apiLog.error('Error fetching job history:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { 
        error: "Failed to fetch job history",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
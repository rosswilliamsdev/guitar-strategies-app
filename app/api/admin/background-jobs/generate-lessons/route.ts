import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFutureLessons } from "@/lib/background-jobs";

/**
 * POST /api/admin/background-jobs/generate-lessons
 * Manually trigger the automatic lesson generation job
 * Admin-only endpoint for testing or emergency use
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    console.log(`Admin ${session.user.email} manually triggered lesson generation job`);

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
    console.error("Error in manual job trigger:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute background job",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
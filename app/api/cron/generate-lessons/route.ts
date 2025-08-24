import { NextRequest, NextResponse } from "next/server";
import { generateFutureLessons, cleanupJobLogs } from "@/lib/background-jobs";

/**
 * GET /api/cron/generate-lessons
 * Cron endpoint for automatic lesson generation
 * This endpoint is meant to be called by external cron services like Vercel Cron
 * or can be called manually for testing
 * 
 * Expected to run daily or weekly
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("Unauthorized cron request - invalid secret");
      return NextResponse.json(
        { error: "Unauthorized - Invalid cron secret" },
        { status: 401 }
      );
    }

    console.log("Starting scheduled lesson generation job...");

    // Run the main job
    const result = await generateFutureLessons();

    // Clean up old logs (keep last 30 days)
    await cleanupJobLogs();

    // Log the result
    if (result.success) {
      console.log(`Cron job completed successfully: ${result.lessonsGenerated} lessons generated for ${result.teachersProcessed} teachers`);
    } else {
      console.error(`Cron job completed with errors: ${result.errors.join(", ")}`);
    }

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      data: {
        lessonsGenerated: result.lessonsGenerated,
        teachersProcessed: result.teachersProcessed,
        errors: result.errors,
      },
    });
  } catch (error) {
    const errorMessage = `Cron job failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(errorMessage);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Cron job execution failed",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/generate-lessons
 * Alternative method for cron job execution (some services prefer POST)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
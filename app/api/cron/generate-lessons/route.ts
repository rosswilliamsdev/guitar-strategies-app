import { NextRequest, NextResponse } from "next/server";
import { generateFutureLessons, cleanupJobLogs } from "@/lib/background-jobs";
import { apiLog, schedulerLog } from '@/lib/logger';

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
      apiLog.info('Unauthorized cron request - invalid secret');
      return NextResponse.json(
        { error: "Unauthorized - Invalid cron secret" },
        { status: 401 }
      );
    }

    apiLog.info('Starting scheduled lesson generation job...');

    // Run the main job
    const result = await generateFutureLessons();

    // Clean up old logs (keep last 30 days)
    await cleanupJobLogs();

    // Log the result
    if (result.success) {
      apiLog.info('Cron job completed successfully', {
        lessonsGenerated: result.lessonsGenerated,
        teachersProcessed: result.teachersProcessed,
        success: true
      });
    } else {
      apiLog.error('Cron job completed with errors', {
        errors: result.errors,
        success: false,
        teachersProcessed: result.teachersProcessed
      });
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
    apiLog.error('Error occurred', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
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
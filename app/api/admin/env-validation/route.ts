import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  validateEnv, 
  formatValidationResults,
  isEmailServiceConfigured,
  isFileStorageConfigured,
  getEnvironmentMode,
  isProduction 
} from "@/lib/env-validation";
import { apiLog, emailLog } from '@/lib/logger';

/**
 * Admin endpoint for checking environment validation status
 * GET /api/admin/env-validation
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === "ADMIN" ||
      (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Run environment validation
    const validationResult = validateEnv();
    
    // Get additional status information
    const status = {
      validation: validationResult,
      formattedResults: formatValidationResults(validationResult),
      services: {
        email: {
          configured: isEmailServiceConfigured(),
          status: isEmailServiceConfigured() ? "ready" : "disabled",
        },
        fileStorage: {
          configured: isFileStorageConfigured(),
          status: isFileStorageConfigured() ? "ready" : "disabled",
        },
      },
      environment: {
        mode: getEnvironmentMode(),
        isProduction: isProduction(),
      },
      checkedAt: new Date().toISOString(),
    };

    // Determine overall health
    const overallHealth = validationResult.success ? "healthy" : "unhealthy";
    const httpStatus = validationResult.success ? 200 : 500;

    return NextResponse.json(
      {
        health: overallHealth,
        ...status,
      },
      { status: httpStatus }
    );
  } catch (error) {
    apiLog.error('Environment validation check error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    return NextResponse.json(
      {
        error: "Failed to validate environment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
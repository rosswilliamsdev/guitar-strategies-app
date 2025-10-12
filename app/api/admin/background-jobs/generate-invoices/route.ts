import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMonthlyInvoices } from "@/lib/background-jobs";
import { apiLog, emailLog, invoiceLog } from '@/lib/logger';

/**
 * POST /api/admin/background-jobs/generate-invoices
 * Manually trigger the monthly invoice generation job
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

    apiLog.info('Admin ${session.user.email} manually triggered monthly invoice generation job');

    // Run the background job
    const result = await generateMonthlyInvoices();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully generated ${result.invoicesCreated} invoices`
        : "Job completed with errors",
      data: {
        invoicesCreated: result.invoicesCreated,
        errors: result.errors,
      },
    });
  } catch (error) {
    apiLog.error('Error in manual invoice job trigger:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { 
        error: "Failed to execute invoice generation job",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
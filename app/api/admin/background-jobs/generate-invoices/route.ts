import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMonthlyInvoices } from "@/lib/background-jobs";

/**
 * POST /api/admin/background-jobs/generate-invoices
 * Manually trigger the monthly invoice generation job
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

    console.log(`Admin ${session.user.email} manually triggered monthly invoice generation job`);

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
    console.error("Error in manual invoice job trigger:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute invoice generation job",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
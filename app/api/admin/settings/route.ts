import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { apiLog, dbLog, emailLog, invoiceLog } from '@/lib/logger';

// Admin settings validation schema
const adminSettingsSchema = z.object({
  // Invoice Configuration
  defaultInvoiceDueDays: z.number().min(1).max(90),
  latePaymentReminderDays: z.number().min(1).max(30),
  invoiceNumberFormat: z.string().min(1),
  
  // Email System Settings
  emailSenderName: z.string().min(1),
  emailSenderAddress: z.string().email(),
  enableBookingConfirmations: z.boolean(),
  enableInvoiceNotifications: z.boolean(),
  enableReminderEmails: z.boolean(),
  emailFooterText: z.string().min(1),
  
  // Lesson Defaults
  defaultLessonDuration30: z.boolean(),
  defaultLessonDuration60: z.boolean(),
  defaultAdvanceBookingDays: z.number().min(1).max(90),
  cancellationPolicyText: z.string().min(1),
});

/**
 * GET /api/admin/settings
 * Get current admin settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get or create system settings
    let settings = await prisma.systemSettings.findFirst({
      where: { id: "system" }
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.systemSettings.create({
        data: { id: "system" }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    apiLog.error('Error fetching admin settings:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to fetch admin settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 * Update admin settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate the input
    const validatedData = adminSettingsSchema.parse(body);

    // Ensure at least one lesson duration is enabled
    if (!validatedData.defaultLessonDuration30 && !validatedData.defaultLessonDuration60) {
      return NextResponse.json(
        { error: "At least one lesson duration must be enabled" },
        { status: 400 }
      );
    }

    // Update or create system settings
    const settings = await prisma.systemSettings.upsert({
      where: { id: "system" },
      update: validatedData,
      create: {
        id: "system",
        ...validatedData,
      },
    });

    apiLog.info('Admin ${session.user.email} updated system settings');

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    apiLog.error('Error updating admin settings:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to update admin settings" },
      { status: 500 }
    );
  }
}
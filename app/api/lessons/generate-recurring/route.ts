import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRecurringLessons } from "@/lib/recurring-lessons";
import { z } from "zod";
import { apiLog, schedulerLog } from '@/lib/logger';

const generateRecurringSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized - Teacher access required" },
        { status: 401 }
      );
    }

    // Get teacher profile
    const teacherProfile = session.user.teacherProfile;
    if (!teacherProfile) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { startDate, endDate } = generateRecurringSchema.parse(body);

    // Generate recurring lessons for the date range
    const lessonsCreated = await generateRecurringLessons(
      teacherProfile.id,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({
      success: true,
      lessonsCreated,
      message: `Generated ${lessonsCreated} recurring lessons`,
    });
  } catch (error) {
    apiLog.error('Error generating recurring lessons:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
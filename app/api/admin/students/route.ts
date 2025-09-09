import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { apiLog, dbLog, emailLog } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      email,
      password,
      teacherId,
      instrument,
      goals,
      parentEmail,
      phoneNumber,
    } = await request.json();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Verify teacher exists and is active
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher || !teacher.isActive) {
      return NextResponse.json(
        { error: "Selected teacher is not available" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and student profile in a transaction
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          teacherId,
          instrument,
          goals,
          parentEmail,
          phoneNumber,
          isActive: true,
        },
      });

      return { user, studentProfile };
    });

    return NextResponse.json({
      id: student.user.id,
      name: student.user.name,
      email: student.user.email,
      teacherName: teacher.user.name,
    });
  } catch (error) {
    apiLog.error('Error creating student:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}

// Export rate-limited handler
export const POST = withRateLimit(handlePOST, 'API');
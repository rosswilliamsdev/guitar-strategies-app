import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { apiLog, dbLog, emailLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      email,
      password,
      bio,
      hourlyRate,
      venmoHandle,
      paypalEmail,
      zelleEmail,
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and teacher profile in a transaction
    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "TEACHER",
        },
      });

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          bio,
          hourlyRate,
          venmoHandle,
          paypalEmail,
          zelleEmail,
          isActive: true,
        },
      });

      return { user, teacherProfile };
    });

    return NextResponse.json({
      id: teacher.user.id,
      name: teacher.user.name,
      email: teacher.user.email,
    });
  } catch (error) {
    apiLog.error('Error creating teacher:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    );
  }
}
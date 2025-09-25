import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { apiLog, dbLog, emailLog } from '@/lib/logger';
import { withAdminValidation } from '@/lib/api-wrapper';
import { createStudentSchema, paginationSchema } from '@/lib/validations';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createConflictResponse,
  handleApiError
} from '@/lib/api-responses';
import { getValidatedBody, getValidatedQuery } from '@/lib/validated-request';

async function handlePOST(request: NextRequest) {
  try {
    // Get validated data from middleware
    const validatedData = getValidatedBody(request, createStudentSchema);
    if (!validatedData) {
      return createErrorResponse('Request body validation failed', 400);
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
    } = validatedData;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createConflictResponse('A user with this email address already exists');
    }

    // Verify teacher exists and is active
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher || !teacher.isActive) {
      return createErrorResponse('Selected teacher is not available', 400);
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

    return createSuccessResponse(
      {
        id: student.user.id,
        name: student.user.name,
        email: student.user.email,
        teacherName: teacher.user.name,
      },
      'Student created successfully',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Export with validation middleware
export const POST = withAdminValidation(handlePOST, createStudentSchema);
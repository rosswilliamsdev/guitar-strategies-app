import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { log, emailLog } from '@/lib/logger';
import { withTeacherValidation } from '@/lib/api-wrapper';
import { createStudentSchema } from '@/lib/validations';
import { getValidatedBody } from '@/lib/validated-request';
import { sendEmail } from '@/lib/email';
import { renderEmailWithFallback } from '@/lib/email-templates';
import {
  createSuccessResponse,
  createErrorResponse,
  createConflictResponse,
  handleApiError
} from '@/lib/api-responses';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return createErrorResponse('Teacher access required', 403);
    }

    // Get validated body from middleware (already parsed and validated)
    const body = getValidatedBody(request, createStudentSchema);

    if (!body) {
      return createErrorResponse('Request body validation failed', 400);
    }

    log.info('Teacher inviting student', {
      teacherId: body.teacherId,
      studentEmail: body.email,
      teacherUserId: session.user.id
    });

    const {
      name,
      email,
      password,
      teacherId,
      instrument,
      goals,
      parentEmail,
      phoneNumber,
    } = body;

    // Verify the teacher is inviting for their own profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: {
        id: teacherId,
        userId: session.user.id // Ensure teacher can only invite for themselves
      },
      include: { user: true },
    });

    if (!teacherProfile) {
      log.error('Teacher profile mismatch', {
        requestedTeacherId: teacherId,
        sessionUserId: session.user.id
      });
      return createErrorResponse('You can only invite students for your own teaching profile', 403);
    }

    if (!teacherProfile.isActive) {
      return createErrorResponse('Your teacher profile is not active', 400);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createConflictResponse('A user with this email address already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    log.info('Creating student account', {
      email,
      teacherId: teacherProfile.id
    });

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
          teacherId: teacherProfile.id,
          instrument: instrument || "guitar",
          goals,
          parentEmail,
          phoneNumber,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      return studentProfile;
    });

    log.info('Student account created successfully', {
      studentId: student.id,
      userId: student.userId,
      teacherId: teacherProfile.id
    });

    // Send welcome email using database template
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

    const emailTemplate = await renderEmailWithFallback('STUDENT_WELCOME', {
      studentName: name,
      studentEmail: email,
      temporaryPassword: password,
      teacherName: teacherProfile.user.name,
      loginUrl
    });

    const emailSent = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });

    if (emailSent) {
      emailLog.info('Student welcome email sent successfully', {
        studentEmail: email,
        teacherId: teacherProfile.id
      });
    } else {
      emailLog.error('Failed to send student welcome email', {
        studentEmail: email,
        teacherId: teacherProfile.id
      });
    }

    return createSuccessResponse(
      {
        student: {
          id: student.user.id,
          name: student.user.name,
          email: student.user.email,
        },
        teacher: {
          name: teacherProfile.user.name,
        },
        emailSent
      },
      'Student account created successfully',
      201
    );
  } catch (error) {
    log.error('Error creating student account', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return handleApiError(error);
  }
}

// Export with teacher validation middleware
export const POST = withTeacherValidation(handlePOST, createStudentSchema);

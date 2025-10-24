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

    // Send welcome email to student with login credentials
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #14b8b3 0%, #0d9289 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 18px; color: #0a0a0a; margin-bottom: 20px; }
            .credentials-box { background: #f0fdfc; border: 2px solid #14b8b3; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .credentials-box h3 { margin: 0 0 15px 0; color: #14b8b3; font-size: 16px; }
            .credential-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .credential-label { font-weight: 600; color: #525252; font-size: 14px; }
            .credential-value { font-family: 'Courier New', monospace; color: #0a0a0a; font-size: 16px; margin-top: 5px; }
            .button { display: inline-block; background: #14b8b3; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #0d9289; }
            .info-box { background: #f0fdfc; border-left: 4px solid #14b8b3; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
            .footer { background: #fafafa; padding: 30px; text-align: center; color: #737373; font-size: 14px; border-top: 1px solid #e5e5e5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎸 Welcome to Guitar Strategies</h1>
            </div>

            <div class="content">
              <p class="welcome">Hi ${name},</p>

              <p>Your teacher, <strong>${teacherProfile.user.name}</strong>, has created an account for you on Guitar Strategies!</p>

              <div class="credentials-box">
                <h3>Your Login Credentials</h3>
                <div class="credential-item">
                  <div class="credential-label">Email Address</div>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Temporary Password</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/login" class="button">Log In Now</a>
              </div>

              <div class="info-box">
                <p style="margin: 0;"><strong>Important:</strong> For security, please change your password after your first login.</p>
              </div>

              <p style="margin-top: 30px;">Once logged in, you'll be able to:</p>
              <ul style="color: #525252;">
                <li>View your lesson schedule and history</li>
                <li>Track your progress and goals</li>
                <li>Access learning materials shared by ${teacherProfile.user.name}</li>
                <li>Manage your student profile</li>
              </ul>

              <p style="margin-top: 30px;">If you have any questions, reach out to ${teacherProfile.user.name} directly.</p>
            </div>

            <div class="footer">
              <p style="margin: 0;">Guitar Strategies - Manage Your Music Journey</p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailSent = await sendEmail({
      to: email,
      subject: `Welcome to Guitar Strategies - Your Account is Ready!`,
      html: emailHtml
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

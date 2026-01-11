/**
 * @fileoverview API endpoint for sending student invitation emails
 *
 * POST /api/students/[id]/send-invite
 * Smart invitation system supporting two flows:
 *
 * Flow 1: Account exists (teacher created)
 *   - Sends login email with link to /login
 *   - No token needed
 *
 * Flow 2: No account yet (self-signup)
 *   - Generates secure token
 *   - Sends signup email with link to /register?token=xxx
 *   - Token expires in 7 days
 *
 * Security:
 * - Teacher-only access
 * - Must own the student profile
 * - Student must have an email on file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, createStudentInvitationEmail } from '@/lib/email';
import { apiLog, emailLog } from '@/lib/logger';
import { randomBytes } from 'crypto';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      apiLog.warn('Unauthorized send-invite attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only teachers can send invitations
    if (session.user.role !== 'TEACHER') {
      apiLog.warn('Non-teacher attempted to send invite', { userId: session.user.id });
      return NextResponse.json({ error: 'Only teachers can send invitations' }, { status: 403 });
    }

    const { id: studentId } = await params;

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teacherProfile) {
      apiLog.error('Teacher profile not found', { userId: session.user.id });
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Get student profile
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!student) {
      apiLog.warn('Student not found for invite', { studentId });
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify student belongs to this teacher
    if (student.teacherId !== teacherProfile.id) {
      apiLog.warn('Teacher attempted to invite student not assigned to them', {
        teacherId: teacherProfile.id,
        studentId,
        actualTeacherId: student.teacherId,
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get email (prefer student user email, fallback to parent email)
    const recipientEmail = student.user?.email || student.parentEmail;
    const studentName = student.user?.name || 'Student';

    if (!recipientEmail) {
      apiLog.warn('Invitation not sent - no email on file', { studentId });
      return NextResponse.json(
        { error: 'Student does not have an email address on file' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let inviteLink: string;
    let emailSubject: string;
    let expirationDays: number;
    let flowType: string;

    // FLOW 1: Student has account (teacher created) - send login email
    if (student.user) {
      inviteLink = `${baseUrl}/login`;
      emailSubject = `Welcome to Guitar Strategies - ${teacherProfile.user.name}`;
      expirationDays = 0; // No expiration - account exists
      flowType = 'login';

      apiLog.info('Sending login invitation (account exists)', {
        studentId,
        teacherId: teacherProfile.id,
        userId: student.user.id,
      });
    }
    // FLOW 2: Student has NO account - send signup email with token
    else {
      // Generate secure token (32 bytes = 64 hex characters)
      const token = randomBytes(32).toString('hex');

      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Upsert invitation (replace old token if exists)
      await prisma.studentInvitation.upsert({
        where: { studentId },
        update: {
          token,
          expires: expiresAt,
        },
        create: {
          studentId,
          teacherId: teacherProfile.id,
          token,
          expires: expiresAt,
        },
      });

      inviteLink = `${baseUrl}/register?token=${token}`;
      emailSubject = `Create Your Account - ${teacherProfile.user.name}`;
      expirationDays = 7;
      flowType = 'signup';

      apiLog.info('Sending signup invitation (token created)', {
        studentId,
        teacherId: teacherProfile.id,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Send invitation email
    const emailHtml = createStudentInvitationEmail(
      studentName,
      teacherProfile.user.name,
      teacherProfile.bio,
      inviteLink,
      expirationDays
    );

    const emailSent = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (!emailSent) {
      emailLog.error('Failed to send invitation email', {
        studentId,
        teacherId: teacherProfile.id,
        recipientEmail,
        flowType,
      });
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    emailLog.info('Invitation email sent successfully', {
      studentId,
      teacherId: teacherProfile.id,
      recipientEmail,
      flowType,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${recipientEmail}`,
      flowType,
    });
  } catch (error) {
    apiLog.error('Error sending student invitation', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

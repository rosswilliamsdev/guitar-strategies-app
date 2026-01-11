/**
 * @fileoverview API endpoint for accepting student invitations
 *
 * POST /api/students/invite/accept
 * Validates invitation token, creates user account, and links to student profile
 *
 * Security:
 * - No authentication required (creates the account)
 * - Token-based verification
 * - One-time use (token deleted after acceptance)
 * - Password validation required
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiLog } from '@/lib/logger';
import { acceptInvitationSchema } from '@/lib/validations';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = acceptInvitationSchema.safeParse(body);

    if (!validation.success) {
      apiLog.warn('Accept invitation validation failed', {
        errors: validation.error.issues,
      });
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find invitation by token
    const invitation = await prisma.studentInvitation.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      apiLog.warn('Invalid invitation token in accept request');
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (new Date() > invitation.expires) {
      apiLog.info('Expired invitation token in accept request', {
        studentId: invitation.student.id,
        expiresAt: invitation.expires.toISOString(),
      });
      return NextResponse.json(
        {
          error: 'This invitation has expired. Please contact your teacher for a new invitation.',
          expired: true,
        },
        { status: 410 } // 410 Gone
      );
    }

    // Check if student already has a user account
    if (invitation.student.userId) {
      apiLog.warn('Attempted to accept invitation for student with existing account', {
        studentId: invitation.student.id,
        userId: invitation.student.userId,
      });
      return NextResponse.json(
        { error: 'This student already has an account' },
        { status: 409 } // 409 Conflict
      );
    }

    // Get email from student profile
    const email = invitation.student.parentEmail || invitation.student.user?.email;
    const name = invitation.student.user?.name || 'Student';

    if (!email) {
      apiLog.error('No email found for student in accept invitation', {
        studentId: invitation.student.id,
      });
      return NextResponse.json(
        { error: 'No email address found for this student' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      apiLog.warn('Email already in use in accept invitation', {
        email,
        studentId: invitation.student.id,
      });
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    apiLog.info('Creating user account from invitation', {
      studentId: invitation.student.id,
      email,
    });

    // Create user and update student profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'STUDENT',
        },
      });

      // Update student profile with user ID
      const updatedStudent = await tx.studentProfile.update({
        where: { id: invitation.student.id },
        data: {
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          teacher: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Delete the invitation (one-time use)
      await tx.studentInvitation.delete({
        where: { id: invitation.id },
      });

      return { user, student: updatedStudent };
    });

    apiLog.info('User account created successfully from invitation', {
      userId: result.user.id,
      studentId: result.student.id,
      teacherId: invitation.teacherId,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      teacher: {
        name: result.student.teacher.user.name,
      },
    });
  } catch (error) {
    apiLog.error('Error accepting invitation', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

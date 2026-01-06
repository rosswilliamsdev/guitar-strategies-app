import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { sendEmail, createPasswordResetEmail } from '@/lib/email';
import { apiLog, authLog } from '@/lib/logger';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Security: Don't reveal if user exists or not
    // Always return success to prevent email enumeration
    if (!user) {
      authLog.info('Password reset requested for non-existent email', { email });
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.',
      });
    }

    // Generate secure random token (32 bytes = 256 bits)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing in database
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expires: expiresAt,
      },
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;

    // Send password reset email
    const emailHtml = createPasswordResetEmail(user.name, resetLink, 60);
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Guitar Strategies',
      html: emailHtml,
    });

    if (!emailSent) {
      authLog.error('Failed to send password reset email', {
        userId: user.id,
        email: user.email,
      });
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    authLog.info('Password reset email sent successfully', {
      userId: user.id,
      email: user.email,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link.',
    });

  } catch (error) {
    apiLog.error('Error in forgot-password endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

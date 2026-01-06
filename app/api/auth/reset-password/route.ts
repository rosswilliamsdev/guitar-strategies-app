import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations';
import { apiLog, authLog } from '@/lib/logger';
import bcrypt from 'bcrypt';

/**
 * POST /api/auth/reset-password
 * Reset user password with valid token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find all reset tokens and check each one
    // We need to do this because tokens are hashed
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        expires: {
          gt: new Date(), // Only get non-expired tokens
        },
      },
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

    // Find the matching token by comparing hashes
    let matchingToken = null;
    for (const resetToken of resetTokens) {
      const isMatch = await bcrypt.compare(token, resetToken.token);
      if (isMatch) {
        matchingToken = resetToken;
        break;
      }
    }

    // Check if token is valid
    if (!matchingToken) {
      authLog.warn('Invalid or expired password reset token used');
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: matchingToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the used reset token
    await prisma.passwordResetToken.delete({
      where: { id: matchingToken.id },
    });

    // Optional: Delete all other reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: matchingToken.userId },
    });

    authLog.info('Password reset successful', {
      userId: matchingToken.userId,
      email: matchingToken.user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });

  } catch (error) {
    apiLog.error('Error in reset-password endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

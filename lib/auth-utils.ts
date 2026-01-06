import { prisma } from "@/lib/db";
import { authLog } from "@/lib/logger";
import bcrypt from "bcrypt";

/**
 * Validation result for password reset tokens
 */
export interface PasswordResetTokenValidation {
  valid: boolean;
  userId?: string;
  error?: string;
  expired?: boolean;
}

/**
 * Validate a password reset token
 * Checks if token exists, matches hash, and hasn't expired
 *
 * @param token - The plain text token from the URL
 * @returns Validation result with status and error details
 */
export async function validatePasswordResetToken(
  token: string
): Promise<PasswordResetTokenValidation> {
  try {
    // Find all reset tokens and check each one
    // We need to do this because tokens are hashed in the database
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
      authLog.warn(
        "Password reset token validation failed - invalid or expired token"
      );
      return {
        valid: false,
        error:
          "Invalid or expired reset token. Please request a new password reset link.",
        expired: true,
      };
    }

    // Token is valid
    authLog.info("Password reset token validated successfully", {
      userId: matchingToken.userId,
      email: matchingToken.user.email,
    });

    return {
      valid: true,
      userId: matchingToken.userId,
    };
  } catch (error) {
    authLog.error("Error validating password reset token", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      valid: false,
      error: "An error occurred validating your reset link. Please try again.",
    };
  }
}

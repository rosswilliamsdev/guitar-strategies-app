import { emailLog } from './logger';

/**
 * All available email types in the system
 */
export const ALL_EMAIL_TYPES = [
  'LESSON_BOOKING',
  'LESSON_CANCELLATION',
  'LESSON_REMINDER',
  'LESSON_COMPLETED',
  'INVOICE_GENERATED',
  'INVOICE_OVERDUE',
  'CHECKLIST_COMPLETION',
  'STUDENT_WELCOME',
  'STUDENT_INVITATION',
  'SYSTEM_UPDATES',
] as const;

/**
 * Create default email preferences for a new user
 * All preferences are set to enabled by default
 *
 * @param userId - The user ID to create preferences for
 * @param tx - Prisma transaction client
 */
export async function createDefaultEmailPreferences(
  userId: string,
  tx: any
): Promise<void> {
  try {
    // Create all email type preferences with enabled: true
    await Promise.all(
      ALL_EMAIL_TYPES.map(type =>
        tx.emailPreference.create({
          data: {
            userId,
            type,
            enabled: true,
          },
        })
      )
    );

    emailLog.info('Default email preferences created', {
      userId,
      count: ALL_EMAIL_TYPES.length,
    });
  } catch (error) {
    emailLog.error('Failed to create default email preferences', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

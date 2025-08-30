-- AlterTable
ALTER TABLE "public"."SystemSettings" ADD COLUMN     "cancellationPolicyText" TEXT NOT NULL DEFAULT 'Please cancel at least 2 hours in advance to avoid charges.',
ADD COLUMN     "defaultAdvanceBookingDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "defaultInvoiceDueDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "defaultLessonDuration30" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultLessonDuration60" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailFooterText" TEXT NOT NULL DEFAULT 'Thank you for choosing Guitar Strategies!',
ADD COLUMN     "emailSenderAddress" TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
ADD COLUMN     "emailSenderName" TEXT NOT NULL DEFAULT 'Guitar Strategies',
ADD COLUMN     "enableBookingConfirmations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableInvoiceNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableReminderEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'INV-{YEAR}-{NUMBER}',
ADD COLUMN     "latePaymentReminderDays" INTEGER NOT NULL DEFAULT 7;

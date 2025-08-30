import { prisma } from "@/lib/db";

export interface SystemSettings {
  // Platform settings
  platformFeePercentage: number;
  maxFileSize: number;
  allowedFileTypes: string;
  
  // Feature flags
  paymentsEnabled: boolean;
  libraryEnabled: boolean;
  recommendationsEnabled: boolean;
  
  // Invoice Configuration
  defaultInvoiceDueDays: number;
  latePaymentReminderDays: number;
  invoiceNumberFormat: string;
  
  // Email System Settings
  emailSenderName: string;
  emailSenderAddress: string;
  enableBookingConfirmations: boolean;
  enableInvoiceNotifications: boolean;
  enableReminderEmails: boolean;
  emailFooterText: string;
  
  // Lesson Defaults
  defaultLessonDuration30: boolean;
  defaultLessonDuration60: boolean;
  defaultAdvanceBookingDays: number;
  cancellationPolicyText: string;
}

/**
 * Get current system settings, creating defaults if none exist
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  let settings = await prisma.systemSettings.findFirst({
    where: { id: "system" }
  });

  if (!settings) {
    // Create default settings if they don't exist
    settings = await prisma.systemSettings.create({
      data: { id: "system" }
    });
  }

  return {
    platformFeePercentage: settings.platformFeePercentage,
    maxFileSize: settings.maxFileSize,
    allowedFileTypes: settings.allowedFileTypes,
    paymentsEnabled: settings.paymentsEnabled,
    libraryEnabled: settings.libraryEnabled,
    recommendationsEnabled: settings.recommendationsEnabled,
    defaultInvoiceDueDays: settings.defaultInvoiceDueDays,
    latePaymentReminderDays: settings.latePaymentReminderDays,
    invoiceNumberFormat: settings.invoiceNumberFormat,
    emailSenderName: settings.emailSenderName,
    emailSenderAddress: settings.emailSenderAddress,
    enableBookingConfirmations: settings.enableBookingConfirmations,
    enableInvoiceNotifications: settings.enableInvoiceNotifications,
    enableReminderEmails: settings.enableReminderEmails,
    emailFooterText: settings.emailFooterText,
    defaultLessonDuration30: settings.defaultLessonDuration30,
    defaultLessonDuration60: settings.defaultLessonDuration60,
    defaultAdvanceBookingDays: settings.defaultAdvanceBookingDays,
    cancellationPolicyText: settings.cancellationPolicyText,
  };
}

/**
 * Get formatted email sender for email notifications
 */
export async function getEmailSender(): Promise<{ name: string; address: string }> {
  const settings = await getSystemSettings();
  return {
    name: settings.emailSenderName,
    address: settings.emailSenderAddress,
  };
}

/**
 * Get invoice due date based on system settings
 */
export async function getInvoiceDueDate(generationDate: Date = new Date()): Promise<Date> {
  const settings = await getSystemSettings();
  const dueDate = new Date(generationDate);
  dueDate.setDate(dueDate.getDate() + settings.defaultInvoiceDueDays);
  return dueDate;
}

/**
 * Get cancellation policy text
 */
export async function getCancellationPolicy(): Promise<string> {
  const settings = await getSystemSettings();
  return settings.cancellationPolicyText;
}

/**
 * Check if a specific email type is enabled
 */
export async function isEmailTypeEnabled(type: 'booking' | 'invoice' | 'reminder'): Promise<boolean> {
  const settings = await getSystemSettings();
  
  switch (type) {
    case 'booking':
      return settings.enableBookingConfirmations;
    case 'invoice':
      return settings.enableInvoiceNotifications;
    case 'reminder':
      return settings.enableReminderEmails;
    default:
      return true;
  }
}
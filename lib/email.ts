import { Resend } from 'resend';
import { withRetry, emailRetryOptions, emailRetryOptionsFast } from './retry';
import { emailLog } from './logger';
import { prisma } from './db';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export type EmailType = 
  | 'LESSON_BOOKING'
  | 'LESSON_CANCELLATION' 
  | 'LESSON_REMINDER'
  | 'INVOICE_GENERATED'
  | 'INVOICE_OVERDUE'
  | 'CHECKLIST_COMPLETION'
  | 'SYSTEM_UPDATES';

/**
 * Check if user has opted-in to receive emails of a specific type
 */
export async function checkEmailPreference(userId: string, emailType: EmailType): Promise<boolean> {
  try {
    const preference = await prisma.emailPreference.findUnique({
      where: {
        userId_type: {
          userId,
          type: emailType
        }
      }
    });

    // If no preference exists, default to enabled (opt-in by default)
    return preference?.enabled ?? true;
  } catch (error) {
    emailLog.error('Error checking email preferences', {
      userId,
      emailType,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fail safely - send email if we can't check preferences
    return true;
  }
}

/**
 * Send email with preference checking
 */
export async function sendEmailWithPreferences(
  userId: string,
  emailType: EmailType,
  emailData: EmailData
): Promise<boolean> {
  try {
    // Check if user has opted-in to this email type
    const hasOptedIn = await checkEmailPreference(userId, emailType);
    
    if (!hasOptedIn) {
      emailLog.info('Email not sent - user has opted out', {
        userId,
        emailType,
        to: emailData.to
      });
      return true; // Return true as this is not an error
    }

    // User has opted-in, send the email
    return await sendEmail(emailData);
  } catch (error) {
    emailLog.error('Error in sendEmailWithPreferences', {
      userId,
      emailType,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Send email with automatic retry logic for transient failures
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    // Wrap the email sending in retry logic
    const result = await withRetry(async () => {
      const emailResult = await resend.emails.send({
        from: data.from || 'Guitar Strategies <onboarding@resend.dev>',
        to: [data.to],
        subject: data.subject,
        html: data.html,
      });
      
      // If Resend returns an error in the result, throw it to trigger retry
      if (emailResult.error) {
        const error = new Error(emailResult.error.message || 'Email sending failed');
        // Attach status code if available for retry logic
        (error as any).status = emailResult.error.name === 'rate_limit_exceeded' ? 429 : 500;
        throw error;
      }
      
      return emailResult;
    }, emailRetryOptions);

    emailLog.info('Email sent successfully', {
      emailId: result.data?.id,
      to: data.to,
      subject: data.subject
    });
    return true;
  } catch (error) {
    // After all retry attempts failed
    emailLog.error('Email sending failed after retries', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: data.to,
      subject: data.subject,
      attempts: emailRetryOptions.maxAttempts
    });
    
    // Log additional context for debugging
    logEmailError('sendEmail', error, {
      to: data.to,
      subject: data.subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });
    
    return false;
  }
}

/**
 * Send email with fast retry (for time-sensitive notifications)
 * Uses reduced retry attempts (2 instead of 5) and shorter delays
 */
export async function sendEmailFast(data: EmailData): Promise<boolean> {
  try {
    const result = await withRetry(async () => {
      const emailResult = await resend.emails.send({
        from: data.from || 'Guitar Strategies <onboarding@resend.dev>',
        to: [data.to],
        subject: data.subject,
        html: data.html,
      });

      if (emailResult.error) {
        const error = new Error(emailResult.error.message || 'Email sending failed');
        (error as any).status = emailResult.error.name === 'rate_limit_exceeded' ? 429 : 500;
        throw error;
      }

      return emailResult;
    }, emailRetryOptionsFast);

    emailLog.info('Fast email sent successfully', {
      emailId: result.data?.id,
      to: data.to,
      subject: data.subject
    });
    return true;
  } catch (error) {
    emailLog.error('Fast email sending failed after retries', {
      error: error instanceof Error ? error.message : String(error),
      to: data.to,
      subject: data.subject,
      attempts: emailRetryOptionsFast.maxAttempts
    });
    return false;
  }
}

/**
 * Send email asynchronously without blocking (fire-and-forget)
 * Useful for non-critical notifications that shouldn't delay API responses
 */
export function sendEmailAsync(data: EmailData): void {
  // Fire and forget - don't await
  sendEmailFast(data).catch((error) => {
    emailLog.error('Async email failed', {
      error: error instanceof Error ? error.message : String(error),
      to: data.to,
      subject: data.subject
    });
  });
}

/**
 * Send email without retry (for non-critical emails)
 */
export async function sendEmailNoRetry(data: EmailData): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: data.from || 'Guitar Strategies <onboarding@resend.dev>',
      to: [data.to],
      subject: data.subject,
      html: data.html,
    });

    if (result.error) {
      emailLog.error('Failed to send email', {
        error: result.error instanceof Error ? result.error.message : String(result.error),
        to: data.to,
        subject: data.subject
      });
      return false;
    }

    emailLog.info('Email sent successfully', {
      emailId: result.data?.id,
      to: data.to,
      subject: data.subject
    });
    return true;
  } catch (error) {
    emailLog.error('Email sending error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: data.to,
      subject: data.subject
    });
    return false;
  }
}

/**
 * Batch send emails with retry logic
 */
export async function sendBatchEmails(emails: EmailData[]): Promise<{
  successful: string[];
  failed: string[];
}> {
  const results = {
    successful: [] as string[],
    failed: [] as string[],
  };
  
  // Process emails in parallel with a concurrency limit
  const concurrencyLimit = 5;
  const emailChunks = [];
  
  for (let i = 0; i < emails.length; i += concurrencyLimit) {
    emailChunks.push(emails.slice(i, i + concurrencyLimit));
  }
  
  for (const chunk of emailChunks) {
    const chunkPromises = chunk.map(async (emailData) => {
      const success = await sendEmail(emailData);
      if (success) {
        results.successful.push(emailData.to);
      } else {
        results.failed.push(emailData.to);
      }
    });
    
    await Promise.all(chunkPromises);
  }
  
  return results;
}

/**
 * Log email errors with context for monitoring
 */
function logEmailError(
  operation: string,
  error: any,
  context?: Record<string, any>
): void {
  const errorInfo = {
    operation,
    errorMessage: error?.message || String(error),
    errorStatus: error?.status,
    errorCode: error?.code,
    context,
    timestamp: new Date().toISOString(),
  };
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log structured data for monitoring
    emailLog.error('Email service error', {
      ...errorInfo,
      environment: 'production'
    });
  } else {
    // In development, log more verbosely
    emailLog.error('Email service error', {
      ...errorInfo,
      environment: 'development'
    });
  }
}

// Email template utilities
export function createBaseTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Inter, system-ui, sans-serif;
          line-height: 1.6;
          color: #0a0a0a;
          background-color: #fafafa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #14b8b3;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #14b8b3;
          font-size: 24px;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #737373;
          border-top: 1px solid #e5e5e5;
          padding-top: 20px;
        }
        .button {
          display: inline-block;
          background-color: #14b8b3;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 10px 0;
        }
        .button:hover {
          background-color: #0d9289;
        }
        .info-box {
          background-color: #f0fdfc;
          border-left: 4px solid #14b8b3;
          padding: 16px;
          margin: 20px 0;
        }
        .warning-box {
          background-color: #fef3cd;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎸 Guitar Strategies</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This email was sent from your Guitar Strategies lesson management platform.</p>
          <p>If you have any questions, please contact your teacher directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Lesson Cancellation Templates
export function createLessonCancellationEmailForStudent(
  studentName: string,
  teacherName: string,
  lessonDate: string,
  lessonTime: string,
  duration: number
): string {
  const content = `
    <h2>Lesson Cancellation Notice</h2>
    <p>Hi ${studentName},</p>
    <p>We wanted to let you know that your guitar lesson has been cancelled:</p>
    
    <div class="info-box">
      <strong>Cancelled Lesson Details:</strong><br>
      Teacher: ${teacherName}<br>
      Date: ${lessonDate}<br>
      Time: ${lessonTime}<br>
      Duration: ${duration} minutes
    </div>
    
    <p>If you have any questions about this cancellation or need to reschedule, please contact ${teacherName} directly.</p>
    
    <p>Thank you for your understanding.</p>
  `;
  
  return createBaseTemplate(content, 'Lesson Cancellation - Guitar Strategies');
}

export function createLessonCancellationEmailForTeacher(
  teacherName: string,
  studentName: string,
  lessonDate: string,
  lessonTime: string,
  duration: number
): string {
  const content = `
    <h2>Lesson Cancellation Confirmation</h2>
    <p>Hi ${teacherName},</p>
    <p>This confirms that the following lesson has been cancelled:</p>
    
    <div class="info-box">
      <strong>Cancelled Lesson Details:</strong><br>
      Student: ${studentName}<br>
      Date: ${lessonDate}<br>
      Time: ${lessonTime}<br>
      Duration: ${duration} minutes
    </div>
    
    <p>The student has been notified of this cancellation.</p>
    
    <p>You can view your updated schedule in the Guitar Strategies app.</p>
  `;
  
  return createBaseTemplate(content, 'Lesson Cancellation Confirmation - Guitar Strategies');
}

// Checklist Completion Templates
export function createChecklistCompletionEmail(
  studentName: string,
  checklistTitle: string,
  itemCount: number,
  teacherName?: string
): string {
  const content = `
    <h2>🎉 Congratulations on Completing Your Checklist!</h2>
    <p>Hi ${studentName},</p>
    <p>Amazing work! You've just completed your <strong>${checklistTitle}</strong> checklist.</p>
    
    <div class="info-box">
      <strong>Achievement Summary:</strong><br>
      Checklist: ${checklistTitle}<br>
      Items Completed: ${itemCount}<br>
      Completion Date: ${new Date().toLocaleDateString()}
    </div>
    
    <p>🏆 This is a significant milestone in your guitar journey. Every item you've checked off represents progress, practice, and dedication.</p>
    
    ${teacherName ? `<p>Your teacher ${teacherName} will be proud of your accomplishment!</p>` : ''}
    
    <p>Keep up the excellent work, and remember - every small step forward is still progress!</p>
    
    <p>Rock on! 🎸</p>
  `;
  
  return createBaseTemplate(content, 'Checklist Completed! - Guitar Strategies');
}

// Invoice Overdue Templates
export function createOverdueInvoiceEmail(
  studentName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  teacherName: string,
  paymentMethods: {
    venmoHandle?: string;
    paypalEmail?: string;
    zelleEmail?: string;
  }
): string {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  let paymentInfo = '';
  if (paymentMethods.venmoHandle) {
    paymentInfo += `<strong>Venmo:</strong> ${paymentMethods.venmoHandle}<br>`;
  }
  if (paymentMethods.paypalEmail) {
    paymentInfo += `<strong>PayPal:</strong> ${paymentMethods.paypalEmail}<br>`;
  }
  if (paymentMethods.zelleEmail) {
    paymentInfo += `<strong>Zelle:</strong> ${paymentMethods.zelleEmail}<br>`;
  }
  
  const content = `
    <h2>Payment Reminder - Invoice Overdue</h2>
    <p>Hi ${studentName},</p>
    <p>We hope you're enjoying your guitar lessons! This is a friendly reminder that your invoice payment is now overdue.</p>
    
    <div class="warning-box">
      <strong>Overdue Invoice Details:</strong><br>
      Invoice Number: ${invoiceNumber}<br>
      Amount Due: ${formatCurrency(amount)}<br>
      Original Due Date: ${dueDate}<br>
      Teacher: ${teacherName}
    </div>
    
    <p>Please submit your payment as soon as possible using one of the following methods:</p>
    
    <div class="info-box">
      <strong>Payment Methods:</strong><br>
      ${paymentInfo || 'Please contact your teacher for payment instructions.'}
    </div>
    
    <p>If you have any questions about this invoice or need to discuss payment arrangements, please contact ${teacherName} directly.</p>
    
    <p>Thank you for your prompt attention to this matter.</p>
  `;
  
  return createBaseTemplate(content, `Overdue Invoice ${invoiceNumber} - Guitar Strategies`);
}

// Lesson Booking Templates
export function createLessonBookingEmail(
  studentName: string,
  teacherName: string,
  lessonDate: string,
  lessonTime: string,
  duration: number,
  isRecurring: boolean = false,
  invoiceGenerated: boolean = false
): string {
  const content = `
    <h2>✅ Lesson Booked Successfully!</h2>
    <p>Hi ${studentName},</p>
    <p>Great news! Your guitar lesson${isRecurring ? ' series' : ''} has been booked successfully.</p>
    
    <div class="info-box">
      <strong>Lesson Details:</strong><br>
      Teacher: ${teacherName}<br>
      ${isRecurring ? 'First Lesson ' : ''}Date: ${lessonDate}<br>
      Time: ${lessonTime}<br>
      Duration: ${duration} minutes<br>
      ${isRecurring ? 'Type: Weekly recurring lessons' : 'Type: Single lesson'}
    </div>
    
    ${isRecurring ? 
      '<p><strong>Recurring Lesson Series:</strong> This booking creates a weekly recurring lesson that will continue until you decide to cancel. Future lessons will be automatically scheduled at the same time each week.</p>' 
      : ''
    }
    
    ${invoiceGenerated && !isRecurring
      ? '<div class="warning-box"><strong>📄 Invoice Generated:</strong> An invoice for this lesson has been automatically created and sent to you in a separate email. Please check your inbox for payment details.</div>'
      : ''
    }
    
    ${isRecurring
      ? '<div class="info-box"><strong>💰 Monthly Billing:</strong> You\'ll receive a monthly invoice on the 1st of each month for all lessons scheduled in that month.</div>'
      : ''
    }
    
    <div class="info-box">
      <strong>Important Reminders:</strong><br>
      • Please arrive 5 minutes early to your lesson<br>
      • Bring your guitar and any materials discussed with your teacher<br>
      • If you need to cancel, please do so at least 2 hours in advance<br>
      ${isRecurring ? '• You can cancel individual lessons or the entire recurring series from your dashboard' : ''}
    </div>
    
    <p>We're excited for your upcoming lesson${isRecurring ? 's' : ''}! If you have any questions, please contact ${teacherName} directly.</p>
    
    <p>Happy practicing! 🎸</p>
  `;
  
  return createBaseTemplate(content, `Lesson Booked${isRecurring ? ' Series' : ''} - Guitar Strategies`);
}

// Invoice Email Template
export function createInvoiceEmail(
  studentName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  teacherName: string,
  month: string,
  itemCount: number,
  paymentMethods: {
    venmoHandle?: string;
    paypalEmail?: string;
    zelleEmail?: string;
  }
): string {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  let paymentInfo = '';
  if (paymentMethods.venmoHandle) {
    paymentInfo += `<strong>Venmo:</strong> ${paymentMethods.venmoHandle}<br>`;
  }
  if (paymentMethods.paypalEmail) {
    paymentInfo += `<strong>PayPal:</strong> ${paymentMethods.paypalEmail}<br>`;
  }
  if (paymentMethods.zelleEmail) {
    paymentInfo += `<strong>Zelle:</strong> ${paymentMethods.zelleEmail}<br>`;
  }
  
  const content = `
    <h2>📄 New Invoice from ${teacherName}</h2>
    <p>Hi ${studentName},</p>
    <p>You have a new invoice for your guitar lessons. Here are the details:</p>
    
    <div class="info-box">
      <strong>Invoice Details:</strong><br>
      Invoice Number: ${invoiceNumber}<br>
      Period: ${month}<br>
      Amount Due: ${formatCurrency(amount)}<br>
      Due Date: ${dueDate}<br>
      Number of Lessons: ${itemCount}
    </div>
    
    <p>Please submit your payment by the due date using one of the following methods:</p>
    
    <div class="info-box">
      <strong>Payment Methods:</strong><br>
      ${paymentInfo || 'Please contact your teacher for payment instructions.'}
    </div>
    
    <p>When making your payment, please include the invoice number <strong>${invoiceNumber}</strong> in your payment reference.</p>
    
    <p>Thank you for your continued commitment to your guitar lessons!</p>
    
    <p>If you have any questions about this invoice, please contact ${teacherName} directly.</p>
    
    <p>Keep rocking! 🎸</p>
  `;
  
  return createBaseTemplate(content, `Invoice ${invoiceNumber} - Guitar Strategies`);
}

// Password Reset Template
export function createPasswordResetEmail(
  userName: string,
  resetLink: string,
  expirationMinutes: number = 60
): string {
  const content = `
    <h2>🔐 Password Reset Request</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password for your Guitar Strategies account. If you didn't make this request, you can safely ignore this email.</p>

    <div class="info-box">
      <strong>Important Security Information:</strong><br>
      • This link is valid for ${expirationMinutes} minutes only<br>
      • The link can only be used once<br>
      • If you didn't request this reset, no action is needed
    </div>

    <p>To reset your password, click the button below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" class="button">Reset My Password</a>
    </div>

    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #14b8b3; font-size: 14px;">${resetLink}</p>

    <div class="warning-box">
      <strong>⚠️ Security Reminder:</strong><br>
      Never share your password with anyone. Guitar Strategies staff will never ask for your password via email.
    </div>

    <p>If you're having trouble resetting your password, please contact your teacher for assistance.</p>
  `;

  return createBaseTemplate(content, 'Password Reset Request - Guitar Strategies');
}
import { prisma } from '@/lib/db';
import { EmailType } from '@prisma/client';
import { emailLog } from '@/lib/logger';

/**
 * Variable replacement mapping for email templates
 */
export type EmailVariables = Record<string, string | number>;

/**
 * Fetch email template from database and render with variables
 */
export async function renderEmailTemplate(
  type: EmailType,
  variables: EmailVariables
): Promise<{ subject: string; html: string } | null> {
  try {
    // Fetch active template from database
    const template = await prisma.emailTemplate.findUnique({
      where: {
        type,
        isActive: true
      }
    });

    if (!template) {
      emailLog.warn('Email template not found', { type });
      return null;
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let html = template.htmlBody;

    // Replace all {{variable}} placeholders with actual values
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value);

      subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
      html = html.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    emailLog.info('Email template rendered', {
      type,
      variableCount: Object.keys(variables).length
    });

    return { subject, html };
  } catch (error) {
    emailLog.error('Error rendering email template', {
      type,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Default fallback templates if database template doesn't exist
 * Used for initial setup or as backup
 */
export const DEFAULT_TEMPLATES = {
  STUDENT_WELCOME: {
    subject: 'Welcome to Guitar Strategies - Your Account is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Inter, system-ui, sans-serif; line-height: 1.6; color: #0a0a0a; margin: 0; padding: 0; background-color: #fafafa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #14b8b3; color: #ffffff; padding: 32px 24px; text-align: center; }
            .content { padding: 32px 24px; }
            .button { display: inline-block; background-color: #14b8b3; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 16px 0; }
            .credentials { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
            .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to Guitar Strategies!</h1>
            </div>
            <div class="content">
              <p>Hi {{studentName}},</p>
              <p>Your teacher {{teacherName}} has invited you to join Guitar Strategies! Your account is ready and you can log in to access your lessons, track your progress, and communicate with your teacher.</p>

              <div class="credentials">
                <strong>Your Login Credentials:</strong><br>
                Email: {{studentEmail}}<br>
                Temporary Password: {{temporaryPassword}}
              </div>

              <p style="color: #737373; font-size: 14px;">⚠️ For security, please change your password after your first login.</p>

              <div style="text-align: center; margin: 24px 0;">
                <a href="{{loginUrl}}" class="button">Log In to Your Account</a>
              </div>

              <p>Once logged in, you'll be able to:</p>
              <ul>
                <li>View your lesson schedule and history</li>
                <li>Track your progress with practice checklists</li>
                <li>Access lesson notes and materials</li>
                <li>Book and manage your lesson times</li>
              </ul>

              <p>If you have any questions, please reach out to {{teacherName}} directly.</p>

              <p>Happy practicing!<br>The Guitar Strategies Team</p>
            </div>
            <div class="footer">
              <p>This email was sent by Guitar Strategies<br>
              If you didn't expect this email, please contact your teacher.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  LESSON_COMPLETED: {
    subject: 'Lesson Summary - {{lessonDate}}',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Inter, system-ui, sans-serif; line-height: 1.6; color: #0a0a0a; margin: 0; padding: 0; background-color: #fafafa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #14b8b3; color: #ffffff; padding: 32px 24px; text-align: center; }
            .content { padding: 32px 24px; }
            .lesson-info { background-color: #f0fdfc; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
            .section { margin: 24px 0; }
            .section-title { font-weight: 600; color: #14b8b3; margin-bottom: 8px; font-size: 16px; }
            .notes-content { background-color: #f5f5f5; padding: 16px; border-radius: 6px; line-height: 1.8; }
            .button { display: inline-block; background-color: #14b8b3; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 8px 0; }
            .button:hover { background-color: #0d9289; }
            .attachment-button { display: inline-block; background-color: #ffffff; color: #14b8b3; border: 2px solid #14b8b3; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; margin: 8px 4px; }
            .attachment-button:hover { background-color: #f0fdfc; }
            .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎸 Lesson Complete!</h1>
            </div>
            <div class="content">
              <p>Hi {{studentName}},</p>
              <p>{{teacherName}} has logged your lesson. Here's a summary of what was covered:</p>

              <div class="lesson-info">
                <strong>Lesson Details:</strong><br>
                Date: {{lessonDate}}<br>
                Duration: {{duration}} minutes
              </div>

              <div class="section">
                <div class="section-title">📝 Lesson Notes</div>
                <div class="notes-content">
                  {{notes}}
                </div>
              </div>

              {{attachmentSection}}

              <p style="margin-top: 24px;">Keep up the great work! See you at your next lesson.</p>

              <div style="text-align: center; margin: 32px 0; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                <a href="{{appUrl}}/lessons/{{lessonId}}" style="color: #14b8b3; text-decoration: none; font-weight: 500;">
                  → View Full Lesson Details
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Guitar Strategies - Manage Your Music Journey</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
};

/**
 * Render email with fallback to default template
 */
export async function renderEmailWithFallback(
  type: EmailType,
  variables: EmailVariables
): Promise<{ subject: string; html: string }> {
  // Try to get template from database
  const rendered = await renderEmailTemplate(type, variables);

  if (rendered) {
    return rendered;
  }

  // Fallback to default template
  emailLog.warn('Using fallback template', { type });

  const defaultTemplate = DEFAULT_TEMPLATES[type as keyof typeof DEFAULT_TEMPLATES];

  if (!defaultTemplate) {
    throw new Error(`No template found for type: ${type}`);
  }

  // Apply variable substitution to fallback template
  let subject = defaultTemplate.subject;
  let html = defaultTemplate.html;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const stringValue = String(value);

    subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
    html = html.replace(new RegExp(placeholder, 'g'), stringValue);
  }

  return { subject, html };
}

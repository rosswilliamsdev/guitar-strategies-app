import { PrismaClient, EmailType } from "@prisma/client";

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log("🌱 Seeding email templates...");

  const templates = [
    {
      type: "STUDENT_WELCOME" as EmailType,
      subject: "Welcome to Guitar Strategies - Your Account is Ready!",
      description: "Sent when a teacher invites a new student to the platform",
      variables: JSON.stringify([
        "studentName",
        "studentEmail",
        "temporaryPassword",
        "teacherName",
        "loginUrl",
      ]),
      htmlBody: `
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
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a><br>
        If you didn't expect this email, please contact your teacher.</p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "LESSON_BOOKING" as EmailType,
      subject: "Lesson Confirmed - {{lessonDate}} at {{lessonTime}}",
      description: "Sent when a single lesson is booked",
      variables: JSON.stringify([
        "studentName",
        "teacherName",
        "lessonDate",
        "lessonTime",
        "duration",
      ]),
      htmlBody: `
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
      .lesson-details { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">Lesson Confirmed</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>Your lesson with {{teacherName}} has been confirmed!</p>

        <div class="lesson-details">
          <strong>Lesson Details:</strong><br>
          Date: {{lessonDate}}<br>
          Time: {{lessonTime}}<br>
          Duration: {{duration}} minutes
        </div>

        <p>We look forward to seeing you!</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "LESSON_BOOKING_RECURRING" as EmailType,
      subject:
        "🎉 Recurring Lessons Confirmed - Every {{lessonDayOfWeek}} at {{lessonTime}}",
      description: "Sent when recurring weekly lessons are booked",
      variables: JSON.stringify([
        "studentName",
        "teacherName",
        "lessonDayOfWeek",
        "lessonDate",
        "lessonTime",
        "duration",
      ]),
      htmlBody: `
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
      .celebration { background-color: #f0fdfc; border: 2px solid #14b8b3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
      .lesson-details { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .info-box { background-color: #f0fdfc; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>

        <div class="celebration">
          <h2 style="margin: 0 0 8px 0; color: #14b8b3; font-size: 22px;">You've Booked Recurring Lessons!</h2>
          <p style="margin: 8px 0 0 0; font-size: 16px; color: #0a0a0a;">Weekly lessons with {{teacherName}} on <strong>{{lessonDayOfWeek}}s at {{lessonTime}}</strong></p>
        </div>

        <div class="lesson-details">
          <strong>Weekly Lesson Details:</strong><br>
          Teacher: {{teacherName}}<br>
          Day: Every {{lessonDayOfWeek}}<br>
          Time: {{lessonTime}}<br>
          Duration: {{duration}} minutes<br>
          First Lesson: {{lessonDate}}
        </div>

        <div class="info-box">
          <strong>📅 What This Means:</strong><br>
          Your lessons will continue weekly at this time until you decide to cancel. This is a great commitment to your guitar journey!
        </div>

        <p>We're excited to see you every {{lessonDayOfWeek}}! Your dedication to regular practice and lessons will help you reach your musical goals faster.</p>

        <p style="margin-top: 24px;">See you soon!<br>The Guitar Strategies Team</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "LESSON_CANCELLATION" as EmailType,
      subject: "Lesson Cancelled - {{lessonDate}} at {{lessonTime}}",
      description: "Sent when a lesson is cancelled",
      variables: JSON.stringify([
        "studentName",
        "teacherName",
        "lessonDate",
        "lessonTime",
      ]),
      htmlBody: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Inter, system-ui, sans-serif; line-height: 1.6; color: #0a0a0a; margin: 0; padding: 0; background-color: #fafafa; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background-color: #737373; color: #ffffff; padding: 32px 24px; text-align: center; }
      .content { padding: 32px 24px; }
      .lesson-details { background-color: #f5f5f5; border-left: 4px solid #737373; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">Lesson Cancelled</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>Your lesson with {{teacherName}} has been cancelled.</p>

        <div class="lesson-details">
          <strong>Cancelled Lesson:</strong><br>
          Date: {{lessonDate}}<br>
          Time: {{lessonTime}}
        </div>

        <p>Please contact {{teacherName}} if you need to reschedule.</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "LESSON_COMPLETED" as EmailType,
      subject: "Lesson Summary - {{lessonDate}}",
      description: "Sent when a teacher logs a completed lesson",
      variables: JSON.stringify([
        "studentName",
        "teacherName",
        "lessonDate",
        "duration",
        "notes",
        "attachments",
        "links",
      ]),
      htmlBody: `
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
      .section-title { font-weight: 600; color: #14b8b3; margin-bottom: 8px; }
      .notes-content { background-color: #f5f5f5; padding: 16px; border-radius: 6px; }
      .attachment-item { background-color: #f5f5f5; padding: 0; margin: 8px 0; border-radius: 6px; width: 100%; }
      .attachment-table { width: 100%; border-collapse: collapse; }
      .attachment-name { color: #0a0a0a; font-size: 14px; padding: 12px 16px; text-align: left; }
      .attachment-button-cell { padding: 12px 16px; text-align: right; white-space: nowrap; }
      .download-button { display: inline-block; background-color: #14b8b3; color: #ffffff !important; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 500; white-space: nowrap; }
      .download-button:hover { background-color: #0d9289; }
      .link-item { background-color: #f0fdfc; padding: 12px 16px; margin: 8px 0; border-radius: 6px; }
      .link-item a { color: #14b8b3; text-decoration: none; font-weight: 500; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">Lesson Complete!</h1>
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
          <div class="section-title">Lesson Notes</div>
          <div class="notes-content">
            {{notes}}
          </div>
        </div>

        {{attachments}}

        {{links}}

        <p style="margin-top: 24px;">Keep up the great work! See you at your next lesson.</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "LESSON_REMINDER" as EmailType,
      subject: "Reminder: Lesson Tomorrow with {{teacherName}}",
      description: "Sent 24 hours before a lesson",
      variables: JSON.stringify([
        "studentName",
        "lessonDate",
        "lessonTime",
        "teacherName",
      ]),
      htmlBody: `
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
      .lesson-details { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">Lesson Reminder</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>This is a friendly reminder about your upcoming lesson!</p>

        <div class="lesson-details">
          <strong>Lesson Tomorrow:</strong><br>
          Date: {{lessonDate}}<br>
          Time: {{lessonTime}}<br>
          Teacher: {{teacherName}}
        </div>

        <p>See you soon!</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "INVOICE_GENERATED" as EmailType,
      subject: "New Invoice #{{invoiceNumber}} - Due {{dueDate}}",
      description: "Sent when a new invoice is created",
      variables: JSON.stringify([
        "studentName",
        "invoiceNumber",
        "amount",
        "dueDate",
      ]),
      htmlBody: `
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
      .invoice-details { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">New Invoice</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>A new invoice has been generated for your lessons.</p>

        <div class="invoice-details">
          <strong>Invoice Details:</strong><br>
          Invoice #: {{invoiceNumber}}<br>
          Amount: \${{amount}}<br>
          Due Date: {{dueDate}}
        </div>

        <p>Please arrange payment at your earliest convenience.</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "INVOICE_OVERDUE" as EmailType,
      subject: "Payment Reminder - Invoice #{{invoiceNumber}} is Overdue",
      description: "Sent for overdue invoices",
      variables: JSON.stringify([
        "studentName",
        "invoiceNumber",
        "amount",
        "daysPastDue",
      ]),
      htmlBody: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Inter, system-ui, sans-serif; line-height: 1.6; color: #0a0a0a; margin: 0; padding: 0; background-color: #fafafa; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background-color: #ef4444; color: #ffffff; padding: 32px 24px; text-align: center; }
      .content { padding: 32px 24px; }
      .invoice-details { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">Payment Reminder</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>This is a reminder that your invoice is now overdue.</p>

        <div class="invoice-details">
          <strong>Overdue Invoice:</strong><br>
          Invoice #: {{invoiceNumber}}<br>
          Amount: \${{amount}}<br>
          Days Past Due: {{daysPastDue}}
        </div>

        <p>Please arrange payment as soon as possible to avoid service interruption.</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "CHECKLIST_COMPLETION" as EmailType,
      subject: "🎉 Congratulations! You Completed {{checklistName}}",
      description: "Sent when a student completes a checklist",
      variables: JSON.stringify([
        "studentName",
        "checklistName",
        "teacherName",
      ]),
      htmlBody: `
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
      .achievement { background-color: #f0fdfc; border: 2px solid #14b8b3; border-radius: 8px; padding: 24px; margin: 16px 0; text-align: center; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">🎉 Achievement Unlocked!</h1>
      </div>
      <div class="content">
        <p>Hi {{studentName}},</p>
        <p>Congratulations on completing your checklist!</p>

        <div class="achievement">
          <h2 style="margin: 0 0 16px 0; color: #14b8b3;">{{checklistName}}</h2>
          <p style="margin: 0; font-size: 18px;">✅ 100% Complete</p>
        </div>

        <p>{{teacherName}} is proud of your progress. Keep up the great work!</p>

        <p>Ready for your next challenge? Check your dashboard for more checklists.</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
    {
      type: "SYSTEM_UPDATES" as EmailType,
      subject: "Guitar Strategies Update",
      description: "System announcements and updates",
      variables: JSON.stringify(["recipientName", "updateMessage"]),
      htmlBody: `
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
      .update-box { background-color: #f5f5f5; border-left: 4px solid #14b8b3; padding: 16px; margin: 16px 0; }
      .footer { background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 14px; color: #737373; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 28px;">System Update</h1>
      </div>
      <div class="content">
        <p>Hi {{recipientName}},</p>

        <div class="update-box">
          {{updateMessage}}
        </div>

        <p>Thank you for using Guitar Strategies!</p>
      </div>
      <div class="footer">
        <p>Guitar Strategies - Manage Your Music Journey<br>
        <a href="https://app.guitarstrategies.com" style="color: #14b8b3; text-decoration: none; font-weight: 500;">Visit App</a></p>
      </div>
    </div>
  </body>
</html>
      `.trim(),
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      await prisma.emailTemplate.upsert({
        where: { type: template.type },
        create: template,
        update: {
          subject: template.subject,
          description: template.description,
          variables: template.variables,
          htmlBody: template.htmlBody,
        },
      });
      created++;
      console.log(`✅ Created/updated template: ${template.type}`);
    } catch (error) {
      console.error(`❌ Error creating template ${template.type}:`, error);
      skipped++;
    }
  }

  console.log(`\n✨ Email template seeding complete!`);
  console.log(`   Created/Updated: ${created}`);
  console.log(`   Skipped: ${skipped}`);
}

seedEmailTemplates()
  .catch((e) => {
    console.error("Error seeding email templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

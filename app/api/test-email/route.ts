import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, createBaseTemplate } from '@/lib/email';
import { apiLog, emailLog, invoiceLog } from '@/lib/logger';

// POST /api/test-email - Send a test email to verify the system is working
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to send test emails
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { to, testType } = body;

    if (!to) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    let subject = 'Guitar Strategies - Test Email';
    let content = `
      <h2>🎸 Email System Test</h2>
      <p>Hello!</p>
      <p>This is a test email from your Guitar Strategies email notification system.</p>
      <div class="info-box">
        <strong>Test Details:</strong><br>
        Sent: ${new Date().toLocaleString()}<br>
        To: ${to}<br>
        Test Type: ${testType || 'Basic'}<br>
        Status: ✅ Email system is working correctly!
      </div>
      <p>If you received this email, your email notification system is configured properly.</p>
      <p>This was sent by an administrator for testing purposes.</p>
    `;

    // Create different test content based on test type
    switch (testType) {
      case 'lesson-booking':
        subject = 'Test: Lesson Booking Notification';
        content = `
          <h2>✅ Test Lesson Booking Notification</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the lesson booking email system.</p>
          <div class="info-box">
            <strong>Test Lesson Details:</strong><br>
            Teacher: Test Teacher<br>
            Date: Monday, January 1, 2025<br>
            Time: 3:00 PM<br>
            Duration: 30 minutes<br>
            Type: Single lesson (test)
          </div>
          <p><strong>This is a test email.</strong> No actual lesson has been booked.</p>
        `;
        break;
        
      case 'lesson-cancellation':
        subject = 'Test: Lesson Cancellation Notification';
        content = `
          <h2>Lesson Cancellation Notice (TEST)</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the lesson cancellation email system.</p>
          <div class="info-box">
            <strong>Test Cancelled Lesson Details:</strong><br>
            Teacher: Test Teacher<br>
            Date: Monday, January 1, 2025<br>
            Time: 3:00 PM<br>
            Duration: 30 minutes
          </div>
          <p><strong>This is a test email.</strong> No actual lesson has been cancelled.</p>
        `;
        break;
        
      case 'checklist-completion':
        subject = 'Test: Checklist Completion Notification';
        content = `
          <h2>🎉 Test Checklist Completion!</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the checklist completion email system.</p>
          <div class="info-box">
            <strong>Test Achievement Summary:</strong><br>
            Checklist: Test Beginner Checklist<br>
            Items Completed: 5<br>
            Completion Date: ${new Date().toLocaleDateString()}
          </div>
          <p>🏆 <strong>This is a test email.</strong> No actual checklist has been completed.</p>
        `;
        break;
        
      case 'invoice-created':
        subject = 'Test: New Invoice Created';
        content = `
          <h2>📄 Test Invoice from Test Teacher</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the invoice creation email system.</p>
          <div class="info-box">
            <strong>Test Invoice Details:</strong><br>
            Invoice Number: INV-TEST-001<br>
            Period: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}<br>
            Amount Due: $120.00<br>
            Due Date: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
            Number of Lessons: 4
          </div>
          <div class="info-box">
            <strong>Payment Methods:</strong><br>
            Venmo: @test-teacher<br>
            PayPal: test@paypal.com<br>
            Zelle: test@zelle.com
          </div>
          <p>When making your payment, please include the invoice number <strong>INV-TEST-001</strong> in your payment reference.</p>
          <p><strong>⚠️ This is a test email.</strong> No actual invoice has been created.</p>
        `;
        break;
        
      case 'invoice-overdue':
        subject = 'Test: Invoice Overdue Reminder';
        content = `
          <h2>Payment Reminder - Test Invoice Overdue</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the overdue invoice reminder email system.</p>
          <div class="warning-box">
            <strong>Test Overdue Invoice Details:</strong><br>
            Invoice Number: INV-TEST-002<br>
            Amount Due: $150.00<br>
            Original Due Date: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
            Teacher: Test Teacher
          </div>
          <div class="info-box">
            <strong>Payment Methods:</strong><br>
            Venmo: @test-teacher<br>
            PayPal: test@paypal.com<br>
            Zelle: test@zelle.com
          </div>
          <p>Please make payment as soon as possible to avoid any disruption to your lessons.</p>
          <p><strong>⚠️ This is a test email.</strong> No actual invoice is overdue.</p>
        `;
        break;
        
      case 'invoice-paid':
        subject = 'Test: Payment Confirmation';
        content = `
          <h2>✅ Payment Received - Thank You!</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the invoice payment confirmation email system.</p>
          <div class="info-box">
            <strong>Payment Details:</strong><br>
            Invoice Number: INV-TEST-003<br>
            Amount Paid: $90.00<br>
            Payment Method: Venmo<br>
            Payment Date: ${new Date().toLocaleDateString()}<br>
            Teacher: Test Teacher
          </div>
          <p>Thank you for your prompt payment. Your account is now up to date.</p>
          <p><strong>This is a test email.</strong> No actual payment has been processed.</p>
        `;
        break;
        
      case 'invoice-upcoming':
        subject = 'Test: Payment Due Soon Reminder';
        content = `
          <h2>📅 Payment Due Soon</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the upcoming payment reminder email system.</p>
          <div class="info-box">
            <strong>Upcoming Invoice:</strong><br>
            Invoice Number: INV-TEST-004<br>
            Amount Due: $120.00<br>
            Due Date: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}<br>
            Teacher: Test Teacher
          </div>
          <div class="info-box">
            <strong>Payment Methods:</strong><br>
            Venmo: @test-teacher<br>
            PayPal: test@paypal.com<br>
            Zelle: test@zelle.com
          </div>
          <p>Please ensure payment is made by the due date to avoid any late fees or disruption to your lessons.</p>
          <p><strong>This is a test email.</strong> No actual payment is due.</p>
        `;
        break;
    }

    const htmlContent = createBaseTemplate(content, subject);

    const emailSent = await sendEmail({
      to: to,
      subject: subject,
      html: htmlContent
    });

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        testType: testType || 'basic'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email'
      }, { status: 500 });
    }

  } catch (error) {
    apiLog.error('Error sending test email:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
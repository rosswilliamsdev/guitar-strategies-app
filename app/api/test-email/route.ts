import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, createBaseTemplate } from '@/lib/email';

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
        
      case 'overdue-invoice':
        subject = 'Test: Overdue Invoice Notification';
        content = `
          <h2>Payment Reminder - Test Invoice Overdue</h2>
          <p>Hi Test Student,</p>
          <p>This is a test of the overdue invoice email system.</p>
          <div class="warning-box">
            <strong>Test Overdue Invoice Details:</strong><br>
            Invoice Number: INV-TEST-001<br>
            Amount Due: $120.00<br>
            Original Due Date: December 1, 2024<br>
            Teacher: Test Teacher
          </div>
          <p><strong>This is a test email.</strong> No actual invoice is overdue.</p>
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
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
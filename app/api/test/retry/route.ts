/**
 * Test endpoint for retry functionality
 * This endpoint simulates various failure scenarios to test retry logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dbQuery, criticalDbQuery } from '@/lib/db-with-retry';
import { withRetry, databaseRetryOptions, emailRetryOptions } from '@/lib/retry';
import { sendEmail } from '@/lib/email';

// Track attempts for testing
let testAttempts: Record<string, number> = {};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Admin only endpoint
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const scenario = url.searchParams.get('scenario');
    
    // Reset attempts counter for test
    const testId = `test-${Date.now()}`;
    testAttempts[testId] = 0;
    
    switch (scenario) {
      case 'database-timeout':
        // Test database retry on simulated timeout
        const dbResult = await testDatabaseRetry(testId);
        return NextResponse.json({
          scenario,
          attempts: testAttempts[testId],
          success: dbResult.success,
          data: dbResult.data,
          message: 'Database retry test completed'
        });
        
      case 'email-failure':
        // Test email retry on simulated failures
        const emailResult = await testEmailRetry(testId);
        return NextResponse.json({
          scenario,
          attempts: testAttempts[testId],
          success: emailResult.success,
          message: 'Email retry test completed'
        });
        
      case 'critical-operation':
        // Test critical operation retry
        const criticalResult = await testCriticalOperation(testId);
        return NextResponse.json({
          scenario,
          attempts: testAttempts[testId],
          success: criticalResult.success,
          data: criticalResult.data,
          message: 'Critical operation retry test completed'
        });
        
      case 'real-database':
        // Test with actual database query
        const realDbResult = await testRealDatabaseQuery();
        return NextResponse.json({
          scenario,
          success: realDbResult.success,
          userCount: realDbResult.count,
          message: 'Real database query with retry completed'
        });
        
      default:
        return NextResponse.json({
          message: 'Retry test endpoint',
          availableScenarios: [
            'database-timeout',
            'email-failure',
            'critical-operation',
            'real-database'
          ]
        });
    }
    
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: error.message || 'Test failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Test database retry with simulated failures
async function testDatabaseRetry(testId: string) {
  try {
    const result = await withRetry(async () => {
      testAttempts[testId]++;
      
      // Simulate failure for first 2 attempts
      if (testAttempts[testId] < 3) {
        const error = new Error('Simulated connection timeout') as any;
        error.code = 'P2024'; // Prisma connection pool timeout
        throw error;
      }
      
      return { data: 'Database query successful after retries' };
    }, databaseRetryOptions);
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error };
  }
}

// Test email retry with simulated failures
async function testEmailRetry(testId: string) {
  try {
    const result = await withRetry(async () => {
      testAttempts[testId]++;
      
      // Simulate rate limiting for first 3 attempts
      if (testAttempts[testId] < 4) {
        const error = new Error('Rate limit exceeded') as any;
        error.status = 429;
        throw error;
      }
      
      return { success: true };
    }, emailRetryOptions);
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Test critical operation retry
async function testCriticalOperation(testId: string) {
  try {
    const result = await criticalDbQuery(async () => {
      testAttempts[testId]++;
      
      // Simulate network error for first attempt
      if (testAttempts[testId] === 1) {
        const error = new Error('Network connection lost') as any;
        error.code = 'ECONNRESET';
        throw error;
      }
      
      // Simulate database deadlock for second attempt
      if (testAttempts[testId] === 2) {
        const error = new Error('Database deadlock detected') as any;
        error.code = 'P2023';
        throw error;
      }
      
      return { data: 'Critical operation successful after retries' };
    });
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error };
  }
}

// Test with real database query
async function testRealDatabaseQuery() {
  try {
    // This will use the retry wrapper for a real database query
    const userCount = await dbQuery(async () => {
      const count = await prisma.user.count();
      return count;
    });
    
    return { success: true, count: userCount };
  } catch (error) {
    return { success: false, error };
  }
}

// POST endpoint to test email retry with actual email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Admin only endpoint
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }
    
    // Test sending an email with retry logic
    const success = await sendEmail({
      to: email,
      subject: 'Retry Test Email',
      html: `
        <h2>Retry Functionality Test</h2>
        <p>This email was sent to test the retry functionality.</p>
        <p>If you received this, the retry logic is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    });
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Email sent successfully (possibly after retries)'
        : 'Email failed after all retry attempts'
    });
    
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json({ 
      error: error.message || 'Email test failed'
    }, { status: 500 });
  }
}
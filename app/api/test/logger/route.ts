import { NextRequest, NextResponse } from 'next/server';
import { log, apiLog, dbLog, emailLog, schedulerLog, invoiceLog, logAPIRequest, logAPIResponse, logAPIError } from '@/lib/logger';

/**
 * Test endpoint for validating structured logging implementation
 * Demonstrates all logger features and outputs sample logs
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Log the API request
  logAPIRequest('GET', '/api/test/logger', {
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  });

  try {
    // Test basic logger
    log.info('Testing basic logger functionality');
    log.debug('Debug message with context', {
      testId: 'logger-test-1',
      timestamp: new Date().toISOString()
    });

    // Test domain-specific loggers
    apiLog.info('API logger test', {
      endpoint: '/api/test/logger',
      method: 'GET'
    });

    dbLog.info('Database logger test', {
      operation: 'SELECT',
      table: 'users',
      duration: 25
    });

    emailLog.info('Email logger test', {
      event: 'test_email_sent',
      to: 'test@example.com'
    });

    schedulerLog.info('Scheduler logger test', {
      event: 'lesson_generated',
      teacherId: 'test-teacher-id'
    });

    invoiceLog.info('Invoice logger test', {
      event: 'invoice_created',
      invoiceId: 'INV-2025-001'
    });

    // Test different log levels
    log.error('Test error message', {
      error: 'This is a test error',
      component: 'logger-test'
    });

    log.warn('Test warning message', {
      warning: 'This is a test warning',
      component: 'logger-test'
    });

    // Test child logger
    const childLogger = log.child({ requestId: 'req-12345', userId: 'user-67890' });
    childLogger.info('Child logger test', {
      action: 'test_child_logger',
      data: { key: 'value' }
    });

    // Test performance logging
    const duration = Date.now() - startTime;
    
    // Log successful response
    logAPIResponse('GET', '/api/test/logger', 200, duration, {
      testsPassed: 7
    });

    return NextResponse.json({
      message: 'Logger test completed successfully',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      logLevelsAvailable: ['error', 'warn', 'info', 'http', 'debug'],
      domainLoggers: ['apiLog', 'dbLog', 'emailLog', 'schedulerLog', 'invoiceLog'],
      features: [
        'Structured JSON logging in production',
        'Colorized console output in development',
        'Context-aware logging with metadata',
        'Domain-specific loggers',
        'Child loggers for request tracking',
        'Performance and API logging utilities',
        'Error handling with stack traces',
        'File rotation in production'
      ],
      instructions: [
        'Check your console to see the formatted log output',
        'In production, logs will be written to files in the /logs directory',
        'Use appropriate log levels: error, warn, info, debug',
        'Include structured context data for better searchability',
        'Use domain-specific loggers for better organization'
      ]
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logAPIError('GET', '/api/test/logger', error as Error, {
      duration
    });

    return NextResponse.json(
      { error: 'Logger test failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to test different logging scenarios
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { scenario = 'default', level = 'info', message = 'Test message' } = body;

    logAPIRequest('POST', '/api/test/logger', { scenario, level });

    // Test different scenarios
    switch (scenario) {
      case 'error':
        log.error('Simulated error scenario', {
          scenario,
          error: 'This is a simulated error for testing',
          stack: new Error('Test error').stack
        });
        break;

      case 'database':
        dbLog.info('Simulated database operation', {
          operation: 'INSERT',
          table: 'test_table',
          rowsAffected: 1,
          duration: Math.floor(Math.random() * 100)
        });
        break;

      case 'email':
        emailLog.info('Simulated email sending', {
          to: 'test@example.com',
          subject: 'Test Email',
          provider: 'test-provider',
          success: true
        });
        break;

      case 'performance':
        const performanceData = {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version
        };
        
        log.info('Performance metrics snapshot', performanceData);
        break;

      default:
        log[level as keyof typeof log](message, {
          scenario,
          timestamp: new Date().toISOString(),
          requestMethod: 'POST'
        });
    }

    const duration = Date.now() - startTime;
    logAPIResponse('POST', '/api/test/logger', 200, duration, { scenario });

    return NextResponse.json({
      success: true,
      scenario,
      level,
      message: `Logged ${scenario} scenario with ${level} level`,
      duration: `${duration}ms`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logAPIError('POST', '/api/test/logger', error as Error, { duration });

    return NextResponse.json(
      { error: 'Failed to process logging test' },
      { status: 400 }
    );
  }
}
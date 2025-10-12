/**
 * @fileoverview Admin endpoint for database connection pool monitoring.
 * 
 * Provides detailed information about database connection pooling,
 * performance metrics, and configuration validation.
 * 
 * Requires admin authentication to access sensitive system information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConnectionPoolStatus } from '@/lib/db';
import { validateConnectionPooling } from '@/lib/startup-validation';
import { apiLog, dbLog } from '@/lib/logger';

/**
 * GET /api/admin/database/pool-status
 * 
 * Returns comprehensive database connection pool information for admin monitoring.
 * 
 * @param request - Next.js request object
 * @returns JSON response with pool status and configuration details
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === 'ADMIN' ||
      (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Get connection pool status
    const startTime = Date.now();
    const poolStatus = await getConnectionPoolStatus();
    const poolValidation = validateConnectionPooling();
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      responseTime,
      connectionPool: poolStatus,
      validation: poolValidation,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        databaseUrl: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]*@/, '//***:***@') : 
          'Not configured',
      },
      systemInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      }
    });
    
  } catch (error) {
    apiLog.error('Failed to get database pool status:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve database pool status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/database/pool-status
 * 
 * Performs a connection pool stress test (admin only).
 * Tests multiple concurrent connections to validate pool behavior.
 * 
 * @param request - Next.js request object with optional test parameters
 * @returns JSON response with stress test results
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === 'ADMIN' ||
      (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const concurrentTests = Math.min(body.concurrentTests || 3, 10); // Limit to prevent overload
    
    apiLog.info('🧪 Starting database connection pool stress test with ${concurrentTests} concurrent connections...');
    
    // Run concurrent connection tests
    const startTime = Date.now();
    const testPromises = Array.from({ length: concurrentTests }, async (_, index) => {
      const testStart = Date.now();
      
      try {
        const poolStatus = await getConnectionPoolStatus();
        const testTime = Date.now() - testStart;
        
        return {
          testIndex: index + 1,
          success: true,
          responseTime: testTime,
          isHealthy: poolStatus.isHealthy,
        };
        
      } catch (error) {
        return {
          testIndex: index + 1,
          success: false,
          responseTime: Date.now() - testStart,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
    
    const results = await Promise.all(testPromises);
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
    
    apiLog.info('✅ Connection pool stress test completed: ${successfulTests.length}/${concurrentTests} successful in ${totalTime}ms');
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      testParameters: {
        concurrentTests,
        totalTime,
      },
      results: {
        total: concurrentTests,
        successful: successfulTests.length,
        failed: failedTests.length,
        successRate: (successfulTests.length / concurrentTests) * 100,
        averageResponseTime: avgResponseTime || 0,
      },
      details: results,
      analysis: {
        status: failedTests.length === 0 ? 'excellent' : 
                failedTests.length < concurrentTests / 2 ? 'good' : 'concerning',
        recommendations: [
          ...(failedTests.length > 0 ? ['Some connections failed - check database server capacity'] : []),
          ...(avgResponseTime > 1000 ? ['Response time is high - consider optimizing queries'] : []),
          ...(avgResponseTime < 100 ? ['Excellent response time - connection pool is performing well'] : []),
        ]
      }
    });
    
  } catch (error) {
    apiLog.error('Database pool stress test failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection pool stress test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
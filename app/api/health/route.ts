/**
 * @fileoverview Health check endpoint for production monitoring.
 * 
 * Provides comprehensive system health status including:
 * - Database connectivity and performance
 * - Email service status
 * - System uptime and memory usage
 * - Authentication service status
 * - File storage availability
 * 
 * This endpoint is public and doesn't require authentication
 * to allow monitoring services to check system health.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Health check response interface
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    email: HealthCheck;
    memory: HealthCheck;
    auth: HealthCheck;
    storage?: HealthCheck;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: any;
}

/**
 * GET /api/health
 * 
 * Returns comprehensive health check information for monitoring services.
 * This endpoint is intentionally public to allow health check monitoring
 * without authentication.
 * 
 * @param request - Next.js request object
 * @returns JSON health check response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Initialize response
    const healthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: await checkDatabase(),
        email: await checkEmailService(),
        memory: checkMemory(),
        auth: await checkAuthService(),
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        responseTime: 0, // Will be calculated at the end
      }
    };

    // Check file storage if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      healthResponse.checks.storage = await checkFileStorage();
    }

    // Calculate overall health status
    healthResponse.status = calculateOverallStatus(healthResponse.checks);
    
    // Calculate response time
    healthResponse.metrics.responseTime = Date.now() - startTime;
    
    // Return appropriate HTTP status code based on health
    const httpStatus = healthResponse.status === 'healthy' ? 200 :
                      healthResponse.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthResponse, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        error: 'Health check endpoint failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          responseTime: Date.now() - startTime,
        }
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simple connectivity test
    await prisma.$queryRaw`SELECT 1`;
    
    // Performance test - count users (should be fast)
    const userCount = await prisma.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'pass' : 'warn',
      responseTime,
      message: `Database connected. ${userCount} users registered.`,
      details: {
        userCount,
        responseTimeThreshold: 1000,
      }
    };
    
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

/**
 * Check email service availability
 */
async function checkEmailService(): Promise<HealthCheck> {
  try {
    // Check if email service is configured
    if (!process.env.RESEND_API_KEY) {
      return {
        status: 'warn',
        message: 'Email service not configured',
        details: {
          reason: 'RESEND_API_KEY not set'
        }
      };
    }
    
    // In a real implementation, you might want to make a test API call
    // For now, just verify the key exists and has correct format
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey.startsWith('re_')) {
      return {
        status: 'warn',
        message: 'Email API key format invalid',
      };
    }
    
    return {
      status: 'pass',
      message: 'Email service configured',
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Email service check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

/**
 * Check memory usage and system resources
 */
function checkMemory(): HealthCheck {
  const memUsage = process.memoryUsage();
  const totalMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  // Warn if heap usage is over 80% of total heap
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  return {
    status: heapUsagePercent > 90 ? 'fail' : heapUsagePercent > 80 ? 'warn' : 'pass',
    message: `Memory usage: ${totalMemoryMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap (${Math.round(heapUsagePercent)}%)`,
    details: {
      rss: totalMemoryMB,
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      heapUsagePercent: Math.round(heapUsagePercent),
      external: Math.round(memUsage.external / 1024 / 1024),
    }
  };
}

/**
 * Check authentication service status
 */
async function checkAuthService(): Promise<HealthCheck> {
  try {
    // Check if auth is properly configured
    if (!process.env.NEXTAUTH_SECRET) {
      return {
        status: 'fail',
        message: 'Authentication not configured - NEXTAUTH_SECRET missing',
      };
    }
    
    if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
      return {
        status: 'fail',
        message: 'Authentication using insecure default secret',
      };
    }
    
    if (!process.env.NEXTAUTH_URL) {
      return {
        status: 'warn',
        message: 'NEXTAUTH_URL not configured',
      };
    }
    
    return {
      status: 'pass',
      message: 'Authentication service configured',
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'Authentication check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

/**
 * Check file storage service availability
 */
async function checkFileStorage(): Promise<HealthCheck> {
  try {
    // Check if storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        status: 'warn',
        message: 'File storage not configured',
      };
    }
    
    // Validate token format (basic check)
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token.startsWith('vercel_blob_rw_')) {
      return {
        status: 'warn',
        message: 'File storage token format invalid',
      };
    }
    
    return {
      status: 'pass',
      message: 'File storage configured',
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: 'File storage check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

/**
 * Calculate overall system health based on individual checks
 */
function calculateOverallStatus(checks: HealthCheckResponse['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  // If any critical check fails, system is unhealthy
  if (statuses.includes('fail')) {
    return 'unhealthy';
  }
  
  // If any check has warnings, system is degraded
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  // All checks pass
  return 'healthy';
}
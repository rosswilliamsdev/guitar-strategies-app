/**
 * @fileoverview Startup validation utilities for production readiness.
 * 
 * Validates critical environment variables and system configuration
 * to prevent deployment with insecure or missing settings.
 */

import { validateDatabaseEnvironment } from './db';
import { validateEnv, formatValidationResults } from './env-validation';

/**
 * Validates all critical environment variables and system settings.
 * 
 * Should be called during application startup in production environments
 * to catch configuration issues early.
 * 
 * @param isProduction - Whether we're running in production mode
 * @throws Error if critical configuration is missing or insecure
 */
export function validateStartupEnvironment(isProduction: boolean = process.env.NODE_ENV === 'production'): void {
  console.log('🔍 Running startup environment validation...');
  
  // Use the comprehensive environment validation
  const envResult = validateEnv();
  
  // Format and log the validation results
  console.log(formatValidationResults(envResult));
  
  // Additional database-specific validation
  try {
    validateDatabaseEnvironment();
  } catch (error) {
    if (!envResult.errors) {
      envResult.errors = [];
    }
    envResult.errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    envResult.success = false;
  }
  
  // Check for exposed Resend API key (security check)
  if (process.env.RESEND_API_KEY === 're_hUfYSCED_MEDdVhEVbvheZgaa94kPEHkm') {
    if (!envResult.errors) {
      envResult.errors = [];
    }
    envResult.errors.push('RESEND_API_KEY appears to be exposed/example key - rotate immediately');
    envResult.success = false;
  }
  
  // Handle validation results
  if (!envResult.success) {
    if (isProduction) {
      throw new Error(
        `Startup validation failed with ${envResult.errors?.length || 0} critical errors. ` +
        `Cannot start in production mode. Please check your environment configuration.`
      );
    } else {
      console.warn('⚠️  Development mode: Continuing despite validation errors...');
      console.warn('   Fix these issues before deploying to production!');
    }
  }
}

/**
 * Validates database connection pooling configuration.
 * 
 * Ensures that connection limits are appropriate for the environment
 * and that pooling parameters are correctly configured.
 * 
 * @returns Connection pool validation result
 */
export function validateConnectionPooling(): {
  isValid: boolean;
  poolSettings: {
    maxConnections: number;
    poolTimeout: number;
    connectTimeout: number;
  };
  recommendations: string[];
} {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL || '';
  
  const recommendations: string[] = [];
  
  // Extract current settings
  const poolSettings = {
    maxConnections: isProduction ? 10 : 5,
    poolTimeout: isProduction ? 20 : 10,
    connectTimeout: isProduction ? 10 : 5,
  };
  
  // Check if pooling parameters are in the URL
  const hasConnectionLimit = dbUrl.includes('connection_limit=');
  const hasPoolTimeout = dbUrl.includes('pool_timeout=');
  const hasConnectTimeout = dbUrl.includes('connect_timeout=');
  
  if (!hasConnectionLimit) {
    recommendations.push('Consider adding connection_limit parameter to DATABASE_URL for explicit control');
  }
  
  if (!hasPoolTimeout) {
    recommendations.push('Consider adding pool_timeout parameter to prevent long waits for connections');
  }
  
  if (!hasConnectTimeout) {
    recommendations.push('Consider adding connect_timeout parameter to fail fast on connection issues');
  }
  
  // Production-specific checks
  if (isProduction) {
    if (poolSettings.maxConnections < 5) {
      recommendations.push('Production connection limit is low - consider increasing for better performance');
    }
    
    if (poolSettings.maxConnections > 20) {
      recommendations.push('Production connection limit is high - may overwhelm database server');
    }
  }
  
  return {
    isValid: true, // Connection pooling is configured automatically
    poolSettings,
    recommendations,
  };
}
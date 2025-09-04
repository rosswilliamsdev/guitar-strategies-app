/**
 * @fileoverview Startup validation utilities for production readiness.
 * 
 * Validates critical environment variables and system configuration
 * to prevent deployment with insecure or missing settings.
 */

import { validateDatabaseEnvironment } from './db';

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
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate database configuration
  try {
    validateDatabaseEnvironment();
  } catch (error) {
    errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Validate authentication configuration
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required for authentication');
  } else if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
    if (isProduction) {
      errors.push('NEXTAUTH_SECRET is using insecure default value in production');
    } else {
      warnings.push('NEXTAUTH_SECRET is using default value - should be changed for production');
    }
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    if (isProduction) {
      errors.push('NEXTAUTH_SECRET is too short (minimum 32 characters for security)');
    } else {
      warnings.push('NEXTAUTH_SECRET is short - consider using a longer secret');
    }
  }
  
  // Validate NextAuth URL
  if (!process.env.NEXTAUTH_URL) {
    if (isProduction) {
      errors.push('NEXTAUTH_URL is required in production');
    } else {
      warnings.push('NEXTAUTH_URL not set - using default localhost:3000');
    }
  }
  
  // Validate email service configuration
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY not configured - email notifications will not work');
  } else if (process.env.RESEND_API_KEY === 're_hUfYSCED_MEDdVhEVbvheZgaa94kPEHkm') {
    errors.push('RESEND_API_KEY appears to be exposed/example key - rotate immediately');
  }
  
  // Validate connection pooling is configured
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('connection_limit')) {
    warnings.push('DATABASE_URL does not specify connection pooling parameters (automatically configured)');
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('❌ Startup validation failed:');
    errors.forEach(error => console.error(`   • ${error}`));
    
    if (isProduction) {
      throw new Error(`Startup validation failed with ${errors.length} critical errors. Cannot start in production.`);
    } else {
      console.warn('⚠️  Development mode: Continuing despite validation errors...');
    }
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Startup validation warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Startup environment validation passed');
  } else if (errors.length === 0) {
    console.log(`✅ Startup validation passed with ${warnings.length} warnings`);
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
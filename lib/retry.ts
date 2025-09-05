/**
 * Retry utility with exponential backoff for handling transient failures
 * in database and external service operations
 */

import { log, dbLog, emailLog } from '@/lib/logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Retry on network errors, timeouts, and specific database errors
    if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') {
      return true;
    }
    
    // Retry on Prisma connection errors
    if (error?.code === 'P2024' || // Connection pool timeout
        error?.code === 'P2025' || // Operation timed out
        error?.code === 'P2034') { // Transaction failed
      return true;
    }
    
    // Retry on 5xx status codes
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    // Retry on specific error messages
    if (error?.message?.includes('connection') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('ECONNRESET')) {
      return true;
    }
    
    return false;
  },
  onRetry: (error, attempt) => {
    log.debug('Retry attempt', {
      attempt,
      error: error?.message || String(error),
      stack: error?.stack
    });
  }
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }
      
      // Call retry callback
      opts.onRetry(error, attempt);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}

/**
 * Database-specific retry configuration
 */
export const databaseRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 5000,
  shouldRetry: (error) => {
    // Retry on connection pool exhaustion
    if (error?.code === 'P2024') {
      dbLog.warn('Database connection pool exhausted, retrying', {
        errorCode: 'P2024',
        message: error?.message
      });
      return true;
    }
    
    // Retry on transaction timeouts
    if (error?.code === 'P2034' || error?.code === 'P2025') {
      dbLog.warn('Database transaction timeout, retrying', {
        errorCode: error?.code,
        message: error?.message
      });
      return true;
    }
    
    // Retry on deadlocks
    if (error?.code === 'P2023') {
      dbLog.warn('Database deadlock detected, retrying', {
        errorCode: 'P2023',
        message: error?.message
      });
      return true;
    }
    
    // Don't retry on validation errors or unique constraints
    if (error?.code === 'P2002' || // Unique constraint
        error?.code === 'P2003' || // Foreign key constraint
        error?.code === 'P2011' || // Null constraint
        error?.code === 'P2012') { // Missing required value
      return false;
    }
    
    return DEFAULT_OPTIONS.shouldRetry(error);
  },
  onRetry: (error, attempt) => {
    dbLog.debug('Database retry attempt', {
      attempt,
      errorCode: error?.code,
      error: error?.message || String(error),
      stack: error?.stack
    });
  }
};

/**
 * Email-specific retry configuration
 */
export const emailRetryOptions: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 3,
  shouldRetry: (error) => {
    // Retry on rate limiting
    if (error?.status === 429) {
      emailLog.warn('Email service rate limited, retrying', {
        status: 429,
        message: error?.message
      });
      return true;
    }
    
    // Retry on temporary email service failures
    if (error?.status >= 500 && error?.status < 600) {
      emailLog.warn('Email service error, retrying', {
        status: error?.status,
        message: error?.message
      });
      return true;
    }
    
    // Retry on network issues
    if (error?.code === 'ETIMEDOUT' || 
        error?.code === 'ECONNREFUSED' ||
        error?.message?.includes('network')) {
      emailLog.warn('Email network error, retrying', {
        error: error?.message || String(error)
      });
      return true;
    }
    
    // Don't retry on invalid email addresses or auth errors
    if (error?.status === 400 || error?.status === 401) {
      return false;
    }
    
    return true;
  },
  onRetry: (error, attempt) => {
    emailLog.debug('Email retry attempt', {
      attempt,
      status: error?.status,
      error: error?.message || String(error),
      stack: error?.stack
    });
  }
};

/**
 * Critical operation retry configuration (for financial transactions, etc.)
 */
export const criticalRetryOptions: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2.5,
  shouldRetry: (error) => {
    // Be more aggressive about retrying critical operations
    if (error?.code === 'ETIMEDOUT' || 
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ECONNRESET' ||
        error?.message?.includes('network') ||
        error?.message?.includes('connection')) {
      return true;
    }
    
    // Retry database connection issues
    if (error?.code?.startsWith('P2')) {
      return true;
    }
    
    // Retry 5xx errors
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    return false;
  },
  onRetry: (error, attempt) => {
    log.warn('Critical operation retry attempt', {
      attempt,
      maxAttempts: 5,
      error: error?.message || error?.code || error,
      timestamp: new Date().toISOString()
    });
  }
};
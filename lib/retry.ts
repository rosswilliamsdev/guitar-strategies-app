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
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Type guard for error objects
    const err = error as { code?: string; status?: number; message?: string };

    // Retry on network errors, timeouts, and specific database errors
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      return true;
    }

    // Retry on Prisma connection errors
    if (err.code === 'P2024' || // Connection pool timeout
        err.code === 'P2025' || // Operation timed out
        err.code === 'P2034') { // Transaction failed
      return true;
    }

    // Retry on 5xx status codes
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    // Retry on specific error messages
    if (err.message?.includes('connection') ||
        err.message?.includes('timeout') ||
        err.message?.includes('ECONNRESET')) {
      return true;
    }

    return false;
  },
  onRetry: (error, attempt) => {
    const err = error as { message?: string; stack?: string };
    log.debug('Retry attempt', {
      attempt,
      error: err.message || String(error),
      stack: err.stack
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
  let lastError: unknown;
  
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
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
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
    const err = error as { code?: string; message?: string };

    // Retry on connection pool exhaustion
    if (err.code === 'P2024') {
      dbLog.warn('Database connection pool exhausted, retrying', {
        errorCode: 'P2024',
        message: err.message
      });
      return true;
    }

    // Retry on transaction timeouts
    if (err.code === 'P2034' || err.code === 'P2025') {
      dbLog.warn('Database transaction timeout, retrying', {
        errorCode: err.code,
        message: err.message
      });
      return true;
    }

    // Retry on deadlocks
    if (err.code === 'P2023') {
      dbLog.warn('Database deadlock detected, retrying', {
        errorCode: 'P2023',
        message: err.message
      });
      return true;
    }

    // Don't retry on validation errors or unique constraints
    if (err.code === 'P2002' || // Unique constraint
        err.code === 'P2003' || // Foreign key constraint
        err.code === 'P2011' || // Null constraint
        err.code === 'P2012') { // Missing required value
      return false;
    }

    return DEFAULT_OPTIONS.shouldRetry(error);
  },
  onRetry: (error, attempt) => {
    const err = error as { code?: string; message?: string; stack?: string };
    dbLog.debug('Database retry attempt', {
      attempt,
      errorCode: err.code,
      error: err.message || String(error),
      stack: err.stack
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
    const err = error as { code?: string; status?: number; message?: string };

    // Retry on rate limiting
    if (err.status === 429) {
      emailLog.warn('Email service rate limited, retrying', {
        status: 429,
        message: err.message
      });
      return true;
    }

    // Retry on temporary email service failures
    if (err.status && err.status >= 500 && err.status < 600) {
      emailLog.warn('Email service error, retrying', {
        status: err.status,
        message: err.message
      });
      return true;
    }

    // Retry on network issues
    if (err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNREFUSED' ||
        err.message?.includes('network')) {
      emailLog.warn('Email network error, retrying', {
        error: err.message || String(error)
      });
      return true;
    }

    // Don't retry on invalid email addresses or auth errors
    if (err.status === 400 || err.status === 401) {
      return false;
    }

    return true;
  },
  onRetry: (error, attempt) => {
    const err = error as { status?: number; message?: string; stack?: string };
    emailLog.debug('Email retry attempt', {
      attempt,
      status: err.status,
      error: err.message || String(error),
      stack: err.stack
    });
  }
};

/**
 * Fast email retry for time-sensitive notifications (e.g., cancellations)
 * Reduces retries to 2 attempts with shorter delays
 */
export const emailRetryOptionsFast: RetryOptions = {
  maxAttempts: 2,
  initialDelay: 500,
  maxDelay: 2000,
  backoffMultiplier: 2,
  shouldRetry: emailRetryOptions.shouldRetry, // Reuse same retry logic
  onRetry: (error, attempt) => {
    const err = error as { status?: number; message?: string };
    emailLog.debug('Fast email retry attempt', {
      attempt,
      status: err.status,
      error: err.message || String(error)
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
    const err = error as { code?: string; status?: number; message?: string };

    // Be more aggressive about retrying critical operations
    if (err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ECONNRESET' ||
        err.message?.includes('network') ||
        err.message?.includes('connection')) {
      return true;
    }

    // Retry database connection issues
    if (err.code?.startsWith('P2')) {
      return true;
    }

    // Retry 5xx errors
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    return false;
  },
  onRetry: (error, attempt) => {
    const err = error as { message?: string; code?: string };
    log.warn('Critical operation retry attempt', {
      attempt,
      maxAttempts: 5,
      error: err.message || err.code || String(error),
      timestamp: new Date().toISOString()
    });
  }
};
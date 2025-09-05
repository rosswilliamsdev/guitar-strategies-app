/**
 * Structured Logging System
 * 
 * Provides centralized, structured logging for the Guitar Strategies application.
 * Replaces console.log with proper logging levels, formatting, and production-ready output.
 * 
 * Server-side: Uses Winston for structured logging
 * Client-side: Falls back to console methods with structured formatting
 */

// Context-aware logging functions
interface LogContext {
  userId?: string;
  email?: string;
  role?: string;
  teacherId?: string;
  studentId?: string;
  lessonId?: string;
  invoiceId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  stack?: string;
  domain?: string;
  [key: string]: any;
}

// Check if we're on the server or client
const isServer = typeof window === 'undefined';

/**
 * Server-side Winston logger (lazy loaded)
 */
let winstonInstance: any = null;

const getWinstonLogger = () => {
  if (!isServer) return null;
  
  if (!winstonInstance) {
    try {
      const winston = require('winston');
      
      // Define log levels and colors
      const logLevels = {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
      };

      const logColors = {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
      };

      // Configure colors for development
      winston.addColors(logColors);

      // Custom format for development (colorized and readable)
      const developmentFormat = winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      );

      // Custom format for production (structured JSON)
      const productionFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info: any) => {
          const { timestamp, level, message, ...meta } = info;
          return JSON.stringify({
            timestamp,
            level,
            message,
            service: 'guitar-strategies',
            environment: process.env.NODE_ENV || 'development',
            ...meta
          });
        })
      );

      winstonInstance = winston.createLogger({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        levels: logLevels,
        format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
        defaultMeta: {
          service: 'guitar-strategies',
          environment: process.env.NODE_ENV || 'development',
        },
        transports: [
          // Console output
          new winston.transports.Console({
            handleExceptions: true,
            handleRejections: true,
          }),
          
          // File output for production
          ...(process.env.NODE_ENV === 'production' ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              maxsize: 5242880, // 5MB
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              maxsize: 5242880, // 5MB
              maxFiles: 10,
            }),
          ] : []),
        ],
        exitOnError: false,
      });
    } catch (error) {
      console.warn('Failed to initialize Winston logger, falling back to console:', error);
      winstonInstance = null;
    }
  }
  
  return winstonInstance;
};

/**
 * Universal Logger class that works on both server and client
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  private log(level: 'error' | 'warn' | 'info' | 'http' | 'debug', message: string, meta: LogContext = {}) {
    const combinedMeta = { ...this.context, ...meta };
    const winston = getWinstonLogger();
    
    if (winston && isServer) {
      // Server-side: use Winston
      winston.log(level, message, combinedMeta);
    } else {
      // Client-side or fallback: use console with structured format
      const timestamp = new Date().toLocaleTimeString();
      const metaStr = Object.keys(combinedMeta).length ? ` ${JSON.stringify(combinedMeta)}` : '';
      const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
      
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'debug':
          console.debug(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
  }

  error(message: string, meta: LogContext = {}) {
    this.log('error', message, meta);
  }

  warn(message: string, meta: LogContext = {}) {
    this.log('warn', message, meta);
  }

  info(message: string, meta: LogContext = {}) {
    this.log('info', message, meta);
  }

  http(message: string, meta: LogContext = {}) {
    this.log('http', message, meta);
  }

  debug(message: string, meta: LogContext = {}) {
    this.log('debug', message, meta);
  }

  // Create a child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

// Default logger instance
export const log = new Logger();

// Specialized loggers for different domains
export const authLog = new Logger({ domain: 'auth' });
export const dbLog = new Logger({ domain: 'database' });
export const emailLog = new Logger({ domain: 'email' });
export const schedulerLog = new Logger({ domain: 'scheduler' });
export const invoiceLog = new Logger({ domain: 'invoice' });
export const apiLog = new Logger({ domain: 'api' });

// Utility functions for common logging patterns
export const logAPIRequest = (method: string, endpoint: string, context: LogContext = {}) => {
  apiLog.info(`${method} ${endpoint}`, {
    method,
    endpoint,
    ...context,
  });
};

export const logAPIResponse = (method: string, endpoint: string, statusCode: number, duration: number, context: LogContext = {}) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  apiLog[level](`${method} ${endpoint} - ${statusCode}`, {
    method,
    endpoint,
    statusCode,
    duration,
    ...context,
  });
};

export const logAPIError = (method: string, endpoint: string, error: Error, context: LogContext = {}) => {
  apiLog.error(`${method} ${endpoint} - Error: ${error.message}`, {
    method,
    endpoint,
    error: error.stack,
    errorMessage: error.message,
    ...context,
  });
};

export const logDatabaseOperation = (operation: string, table: string, duration?: number, context: LogContext = {}) => {
  dbLog.debug(`DB ${operation} ${table}`, {
    operation,
    table,
    duration,
    ...context,
  });
};

export const logDatabaseError = (operation: string, table: string, error: Error, context: LogContext = {}) => {
  dbLog.error(`DB ${operation} ${table} - Error: ${error.message}`, {
    operation,
    table,
    error: error.stack,
    errorMessage: error.message,
    ...context,
  });
};

export const logAuthEvent = (event: string, context: LogContext = {}) => {
  authLog.info(`Auth: ${event}`, context);
};

export const logEmailEvent = (event: string, to?: string, context: LogContext = {}) => {
  emailLog.info(`Email: ${event}`, {
    to,
    ...context,
  });
};

export const logEmailError = (event: string, error: Error, to?: string, context: LogContext = {}) => {
  emailLog.error(`Email: ${event} - Error: ${error.message}`, {
    to,
    error: error.stack,
    errorMessage: error.message,
    ...context,
  });
};

export const logSchedulerEvent = (event: string, context: LogContext = {}) => {
  schedulerLog.info(`Scheduler: ${event}`, context);
};

export const logInvoiceEvent = (event: string, context: LogContext = {}) => {
  invoiceLog.info(`Invoice: ${event}`, context);
};

// Health check and system monitoring
export const logSystemEvent = (event: string, context: LogContext = {}) => {
  log.info(`System: ${event}`, context);
};

export const logPerformanceMetric = (metric: string, value: number, unit: string, context: LogContext = {}) => {
  log.info(`Performance: ${metric}`, {
    metric,
    value,
    unit,
    ...context,
  });
};

// Export the base winston logger for advanced use cases (server-side only)
export const winstonLogger = isServer ? getWinstonLogger() : null;

export default log;
/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * It's the ideal place for startup validation and initialization.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import logger for system startup
    const { logSystemEvent } = await import('./lib/logger');
    
    logSystemEvent('Application startup initiated', {
      nodeVersion: process.version,
      runtime: process.env.NEXT_RUNTIME,
      environment: process.env.NODE_ENV || 'development'
    });
    
    // Import and run startup validation
    const { validateStartupEnvironment } = await import('./lib/startup-validation');
    
    try {
      // Run comprehensive environment validation
      validateStartupEnvironment();
      
      logSystemEvent('Application startup validation completed successfully');
    } catch (error) {
      const { log } = await import('./lib/logger');
      log.error('Application startup validation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // In production, fail fast to prevent running with bad configuration
      if (process.env.NODE_ENV === 'production') {
        log.error('Shutting down due to configuration errors in production mode');
        process.exit(1);
      }
      
      // In development, allow continuation but with warnings
      log.warn('Continuing in development mode despite validation errors');
      log.warn('Please fix these issues before deploying to production!');
    }
    
    // Check for optional services
    const { isEmailServiceConfigured, isFileStorageConfigured } = await import('./lib/env-validation');
    
    logSystemEvent('Service configuration check completed', {
      emailService: isEmailServiceConfigured(),
      fileStorage: isFileStorageConfigured()
    });
    
    logSystemEvent('Guitar Strategies App is ready', {
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  }
}
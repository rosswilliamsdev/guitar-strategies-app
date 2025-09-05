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
    console.log('🚀 Starting Guitar Strategies App...');
    
    // Import and run startup validation
    const { validateStartupEnvironment } = await import('./lib/startup-validation');
    
    try {
      // Run comprehensive environment validation
      validateStartupEnvironment();
      
      console.log('✅ Application startup validation completed successfully');
    } catch (error) {
      console.error('❌ Application startup validation failed:', error);
      
      // In production, fail fast to prevent running with bad configuration
      if (process.env.NODE_ENV === 'production') {
        console.error('🛑 Shutting down due to configuration errors in production mode');
        process.exit(1);
      }
      
      // In development, allow continuation but with warnings
      console.warn('⚠️  Continuing in development mode despite validation errors');
      console.warn('   Please fix these issues before deploying to production!');
    }
    
    // Log application information
    console.log('📋 Application Information:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Node Version: ${process.version}`);
    console.log(`   Next.js Runtime: ${process.env.NEXT_RUNTIME}`);
    
    // Check for optional services
    const { isEmailServiceConfigured, isFileStorageConfigured } = await import('./lib/env-validation');
    
    console.log('🔌 Service Status:');
    console.log(`   Email Service: ${isEmailServiceConfigured() ? '✅ Configured' : '⚠️  Not configured'}`);
    console.log(`   File Storage: ${isFileStorageConfigured() ? '✅ Configured' : '⚠️  Not configured'}`);
    
    console.log('='.repeat(60));
    console.log('🎸 Guitar Strategies App is ready!');
    console.log('='.repeat(60));
  }
}
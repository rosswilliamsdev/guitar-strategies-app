# Logging Migration Checklist

## Overview
The structured logging system using Winston has been implemented. This checklist tracks the migration from `console.log` statements to the new structured logging system.

**Current Status**: 
- ✅ Winston logging system implemented (`lib/logger.ts`)
- ✅ Domain-specific loggers created
- ✅ Test endpoints and migration tools ready
- 🔄 **329 console statements** remaining across **113 files**

## Migration Priority Order

### 🔴 Critical Files (High Priority)
These files have the most console statements and are critical for production monitoring:

- [ ] `lib/background-jobs.ts` - **20 statements** (partially migrated)
- [ ] `app/api/lessons/cancel-all-recurring/route.ts` - **17 statements**
- [ ] `components/lessons/lesson-form.tsx` - **16 statements**
- [ ] `lib/scheduler.ts` - **12 statements**
- [ ] `app/api/lessons/links/route.ts` - **11 statements**
- [ ] `lib/invoice-automation.ts` - **10 statements**
- [ ] `lib/retry.ts` - **10 statements**
- [ ] `app/api/lessons/book/route.ts` - **8 statements**
- [ ] `components/scheduling/AvailabilityCalendar.tsx` - **8 statements**
- [ ] `lib/email.ts` - **7 statements**

### 🟡 API Routes (Medium Priority)
Critical for debugging production issues:

- [ ] `app/api/billing/**` - All billing endpoints
- [ ] `app/api/invoices/**` - Invoice generation and management
- [ ] `app/api/settings/**` - User settings updates
- [ ] `app/api/slots/**` - Slot booking operations
- [ ] `app/api/students/**` - Student management
- [ ] `app/api/teacher/**` - Teacher operations
- [ ] `app/api/admin/**` - Admin functions
- [ ] `app/api/health/route.ts` - Health check endpoint

### 🟢 Components (Lower Priority)
UI components with console statements:

- [ ] `components/dashboard/**` - Dashboard components
- [ ] `components/settings/**` - Settings forms
- [ ] `components/admin/**` - Admin interfaces
- [ ] `components/library/**` - Library management

## Migration Tasks

### Phase 1: Core Infrastructure (Week 1)
- [ ] **1.1 High-Traffic API Routes**
  - [ ] Import appropriate domain loggers
  - [ ] Replace console.error with log.error including stack traces
  - [ ] Add structured context (userId, requestId, etc.)
  - [ ] Test error scenarios

- [ ] **1.2 Background Jobs & Schedulers**
  - [ ] Complete `lib/background-jobs.ts` migration
  - [ ] Migrate `lib/scheduler.ts` with schedulerLog
  - [ ] Add job execution metrics
  - [ ] Include job status and duration logging

- [ ] **1.3 Database Operations**
  - [ ] Update `lib/db.ts` with dbLog
  - [ ] Add query duration logging
  - [ ] Log connection pool metrics
  - [ ] Track transaction success/failure

### Phase 2: Business Logic (Week 2)
- [ ] **2.1 Invoice & Billing**
  - [ ] Migrate `lib/invoice-automation.ts`
  - [ ] Update all `/api/invoices/*` routes
  - [ ] Add payment tracking logs
  - [ ] Include invoice generation metrics

- [ ] **2.2 Email System**
  - [ ] Complete `lib/email.ts` migration
  - [ ] Add delivery status logging
  - [ ] Track email template usage
  - [ ] Log retry attempts

- [ ] **2.3 Lesson Management**
  - [ ] Update lesson booking APIs
  - [ ] Migrate lesson cancellation logic
  - [ ] Add booking conflict logging
  - [ ] Track recurring lesson generation

### Phase 3: Frontend & Components (Week 3)
- [ ] **3.1 Form Components**
  - [ ] Remove console.log from validation
  - [ ] Add error boundary logging
  - [ ] Track form submission errors

- [ ] **3.2 Dashboard Components**
  - [ ] Migrate data fetching logs
  - [ ] Add performance metrics
  - [ ] Track user interactions

- [ ] **3.3 Admin Components**
  - [ ] Update admin operation logs
  - [ ] Add audit trail logging
  - [ ] Track admin actions

## Implementation Guidelines

### For Each File Migration:

1. **Import the appropriate logger:**
   ```typescript
   import { log, apiLog, dbLog, emailLog, schedulerLog } from '@/lib/logger';
   ```

2. **Replace console methods:**
   - `console.log()` → `log.info()`
   - `console.error()` → `log.error()`
   - `console.warn()` → `log.warn()`
   - `console.debug()` → `log.debug()`

3. **Add structured context:**
   ```typescript
   // Before
   console.log(`User ${userId} logged in`);
   
   // After
   log.info('User login successful', { 
     userId, 
     timestamp: new Date().toISOString(),
     ip: request.ip 
   });
   ```

4. **Include error details:**
   ```typescript
   // Before
   console.error('Database error:', error);
   
   // After
   dbLog.error('Database query failed', {
     error: error.message,
     stack: error.stack,
     query: queryName,
     duration: executionTime
   });
   ```

## Production Readiness Checklist

### Security & Privacy
- [ ] Remove all console.log statements that might expose sensitive data
- [ ] Ensure no passwords, tokens, or API keys are logged
- [ ] Sanitize PII (Personally Identifiable Information) in logs
- [ ] Add data masking for sensitive fields

### Performance Monitoring
- [ ] Add request ID generation middleware
- [ ] Implement request/response timing
- [ ] Track database query performance
- [ ] Monitor API endpoint latency
- [ ] Add memory usage logging for critical operations

### Error Tracking
- [ ] Ensure all try/catch blocks use structured error logging
- [ ] Include stack traces for debugging
- [ ] Add error categorization (retryable vs fatal)
- [ ] Implement error rate monitoring

### Log Management
- [ ] Configure log rotation (5MB max, 10 files)
- [ ] Set up log aggregation service integration
- [ ] Create alerting rules for error thresholds
- [ ] Implement log retention policies
- [ ] Test log file permissions and storage

## Testing & Validation

### Testing Checklist
- [ ] Test all error scenarios with new logging
- [ ] Verify log output format in development
- [ ] Test production log file creation
- [ ] Validate log rotation works correctly
- [ ] Ensure no performance degradation
- [ ] Check log levels are appropriate

### Validation Steps
1. Run migration analysis: `node scripts/migrate-logging.js`
2. Test logging endpoint: `curl http://localhost:3000/api/test/logger`
3. Check development console output for formatting
4. Verify production JSON structure
5. Test error scenarios and stack trace capture

## Monitoring & Alerts

### Set Up Monitoring For:
- [ ] Error rate exceeds threshold (e.g., >1% of requests)
- [ ] Critical errors in payment/invoice operations
- [ ] Database connection failures
- [ ] Email delivery failures
- [ ] Background job failures
- [ ] Authentication errors spike

### Dashboard Metrics:
- [ ] Requests per second by endpoint
- [ ] Error rate by category
- [ ] Response time percentiles (p50, p95, p99)
- [ ] Database query performance
- [ ] Email delivery success rate
- [ ] Background job completion rate

## Tools & Resources

### Available Tools
- **Migration Script**: `node scripts/migrate-logging.js` - Analyzes console.log usage
- **Migration Guide**: `logs-migration-guide.md` - Line-by-line conversion examples
- **Test Endpoint**: `/api/test/logger` - Validates logging implementation
- **Logger Library**: `lib/logger.ts` - Core logging implementation

### Documentation
- **CLAUDE.md**: Updated with logging system documentation
- **Logger Types**: TypeScript interfaces in `lib/logger.ts`
- **Best Practices**: See "Structured Context Pattern" in CLAUDE.md

## Success Criteria

The migration is complete when:
- ✅ Zero console.log/warn/error statements in production code
- ✅ All API routes use structured logging
- ✅ Error tracking includes stack traces and context
- ✅ Performance metrics are logged for critical paths
- ✅ Log aggregation service is configured
- ✅ Alerts are set up for critical errors
- ✅ Documentation is updated
- ✅ Team is trained on new logging patterns

## Notes

- **Current Progress**: Core logging system implemented, 329 statements to migrate
- **Estimated Completion**: 3 weeks with phased approach
- **Priority**: Focus on production-critical paths first
- **Testing**: Each migration should be tested in development before deployment

---

*Last Updated: September 5, 2025*
*Created as part of structured logging system implementation*
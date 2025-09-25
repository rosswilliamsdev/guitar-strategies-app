# Database Backup Strategy - Guitar Strategies

## Overview

This document outlines the comprehensive database backup and disaster recovery strategy for the Guitar Strategies application. The strategy is designed to protect against data loss, ensure business continuity, and meet recovery time objectives (RTO) and recovery point objectives (RPO).

## Business Requirements

### Recovery Time Objective (RTO)
- **Target**: 4 hours maximum downtime
- **Critical**: Restore core functionality within 1 hour
- **Priority**: Student lesson data and teacher schedules

### Recovery Point Objective (RPO)
- **Target**: Maximum 1 hour of data loss
- **Critical**: Lessons, payments, and schedule changes
- **Acceptable**: Non-critical data like logs and analytics

### Data Classification

#### Critical Data (RPO: 15 minutes)
- User accounts and authentication data
- Student profiles and teacher assignments
- Lesson records and progress tracking
- Payment records and invoices
- Teacher availability and scheduling

#### Important Data (RPO: 1 hour)
- Library items and recommendations
- Curriculum and progress data
- System settings and configurations

#### Non-Critical Data (RPO: 24 hours)
- Application logs and analytics
- Temporary files and cache data
- Email notification history

## Backup Strategy

### 1. Automated Daily Backups

#### Production Database (Primary Strategy)
```bash
#!/bin/bash
# Location: scripts/backup-production.sh

# Configuration
DB_HOST="${DATABASE_HOST}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
DB_PASSWORD="${DATABASE_PASSWORD}"
BACKUP_PATH="/backups/daily"
RETENTION_DAYS=30
S3_BUCKET="guitar-strategies-backups"

# Create timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="guitar_strategies_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Create database dump with compression
echo "Starting database backup at $(date)"
pg_dump \
  --host="${DB_HOST}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-password \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_PATH}/${BACKUP_FILE}"

# Check backup success
if [ $? -eq 0 ]; then
    echo "Database backup completed successfully: ${BACKUP_FILE}"

    # Upload to S3 (if configured)
    if [ ! -z "${S3_BUCKET}" ]; then
        aws s3 cp "${BACKUP_PATH}/${BACKUP_FILE}" "s3://${S3_BUCKET}/daily/${BACKUP_FILE}"
        echo "Backup uploaded to S3: s3://${S3_BUCKET}/daily/${BACKUP_FILE}"
    fi

    # Create checksum for integrity verification
    sha256sum "${BACKUP_PATH}/${BACKUP_FILE}" > "${BACKUP_PATH}/${BACKUP_FILE}.sha256"

    # Remove old backups (keep last 30 days)
    find "${BACKUP_PATH}" -name "guitar_strategies_*.sql" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_PATH}" -name "guitar_strategies_*.sql.sha256" -mtime +${RETENTION_DAYS} -delete

    echo "Cleanup completed - retained last ${RETENTION_DAYS} days"
else
    echo "ERROR: Database backup failed!" >&2
    # Send alert notification
    curl -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-type: application/json' \
        --data '{"text":"🚨 Database backup FAILED for Guitar Strategies production"}'
    exit 1
fi

echo "Backup process completed at $(date)"
```

#### Cron Schedule
```bash
# Add to crontab: crontab -e
# Daily backup at 2:00 AM
0 2 * * * /path/to/scripts/backup-production.sh >> /var/log/backup.log 2>&1

# Weekly full backup on Sundays at 1:00 AM
0 1 * * 0 /path/to/scripts/backup-weekly.sh >> /var/log/backup-weekly.log 2>&1
```

### 2. Point-in-Time Recovery Setup

#### PostgreSQL WAL Archiving
```sql
-- In postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://guitar-strategies-wal-archive/%f'
max_wal_senders = 3
checkpoint_segments = 32
```

#### Continuous WAL Backup Script
```bash
#!/bin/bash
# Location: scripts/wal-backup.sh

WAL_ARCHIVE_PATH="/var/lib/postgresql/wal_archive"
S3_WAL_BUCKET="guitar-strategies-wal-archive"

# Sync WAL files to S3 every 5 minutes
while true; do
    aws s3 sync "${WAL_ARCHIVE_PATH}" "s3://${S3_WAL_BUCKET}/" --delete
    sleep 300
done
```

### 3. Real-Time Replication (Recommended for Production)

#### Primary-Replica Setup
```bash
# On replica server
# postgresql.conf
hot_standby = on
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s

# recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=primary.db.example.com port=5432 user=replication'
trigger_file = '/tmp/postgresql.trigger'
```

### 4. Hosting Provider Specific Solutions

#### Vercel Postgres
```javascript
// Use Vercel's built-in backup features
// Configure in vercel.json
{
  "functions": {
    "app/api/backup/route.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### Railway PostgreSQL
```yaml
# railway.toml
[build]
  builder = "nixpacks"

[deploy]
  startCommand = "npm start"
  restartPolicyType = "on-failure"

# Railway provides automatic daily backups
# Configure retention in Railway dashboard
```

#### AWS RDS
```json
{
  "DBInstanceIdentifier": "guitar-strategies-prod",
  "BackupRetentionPeriod": 7,
  "PreferredBackupWindow": "02:00-03:00",
  "PreferredMaintenanceWindow": "sun:03:00-sun:04:00",
  "EnablePerformanceInsights": true,
  "DeletionProtection": true
}
```

## Backup Testing & Verification

### 1. Automated Backup Verification

```bash
#!/bin/bash
# Location: scripts/verify-backup.sh

BACKUP_FILE="$1"
TEST_DB="guitar_strategies_test_restore"

echo "Verifying backup: ${BACKUP_FILE}"

# Create test database
createdb "${TEST_DB}"

# Restore backup
pg_restore \
    --dbname="${TEST_DB}" \
    --verbose \
    --clean \
    --if-exists \
    "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup verification successful"

    # Run basic data integrity checks
    psql -d "${TEST_DB}" -c "SELECT COUNT(*) as user_count FROM users;"
    psql -d "${TEST_DB}" -c "SELECT COUNT(*) as lesson_count FROM lessons;"
    psql -d "${TEST_DB}" -c "SELECT COUNT(*) as invoice_count FROM invoices;"

    # Cleanup test database
    dropdb "${TEST_DB}"

    echo "Backup verification completed successfully"
    exit 0
else
    echo "❌ Backup verification failed!"
    exit 1
fi
```

### 2. Monthly Restore Testing

```bash
#!/bin/bash
# Location: scripts/monthly-restore-test.sh

# Full restore test on staging environment
STAGING_DB="guitar_strategies_staging"
LATEST_BACKUP=$(ls -t /backups/daily/*.sql | head -n1)

echo "Performing monthly restore test with: ${LATEST_BACKUP}"

# Stop staging application
systemctl stop guitar-strategies-staging

# Backup current staging data (just in case)
pg_dump "${STAGING_DB}" > "/tmp/staging_backup_$(date +%Y%m%d).sql"

# Restore from production backup
pg_restore \
    --dbname="${STAGING_DB}" \
    --clean \
    --if-exists \
    "${LATEST_BACKUP}"

# Run application health checks
systemctl start guitar-strategies-staging
sleep 30

# Test critical functionality
curl -f "http://staging.guitarstrategies.com/api/health" || exit 1
curl -f "http://staging.guitarstrategies.com/dashboard" || exit 1

echo "✅ Monthly restore test completed successfully"

# Send success notification
curl -X POST "${SLACK_WEBHOOK_URL}" \
    -H 'Content-type: application/json' \
    --data '{"text":"✅ Monthly backup restore test completed successfully"}'
```

## Disaster Recovery Procedures

### 1. Complete Database Loss Recovery

```bash
#!/bin/bash
# Location: scripts/disaster-recovery.sh

echo "🚨 DISASTER RECOVERY PROCEDURE INITIATED"
echo "Database: Complete loss scenario"
echo "Started at: $(date)"

# Step 1: Create new database instance
echo "Step 1: Creating new database instance..."
createdb guitar_strategies_recovered

# Step 2: Get latest backup
echo "Step 2: Retrieving latest backup..."
LATEST_BACKUP=$(aws s3 ls s3://guitar-strategies-backups/daily/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://guitar-strategies-backups/daily/${LATEST_BACKUP}" "/tmp/${LATEST_BACKUP}"

# Step 3: Verify backup integrity
echo "Step 3: Verifying backup integrity..."
sha256sum "/tmp/${LATEST_BACKUP}"

# Step 4: Restore from backup
echo "Step 4: Restoring from backup..."
pg_restore \
    --dbname=guitar_strategies_recovered \
    --verbose \
    --jobs=4 \
    "/tmp/${LATEST_BACKUP}"

# Step 5: Apply WAL files if available (Point-in-time recovery)
echo "Step 5: Applying WAL files for point-in-time recovery..."
# This would involve setting up recovery.conf and applying WAL files

# Step 6: Update application configuration
echo "Step 6: Updating application database configuration..."
# Update DATABASE_URL to point to recovered database

# Step 7: Run integrity checks
echo "Step 7: Running data integrity checks..."
psql -d guitar_strategies_recovered -f scripts/integrity-check.sql

# Step 8: Restart application
echo "Step 8: Restarting application..."
systemctl restart guitar-strategies

echo "✅ DISASTER RECOVERY COMPLETED at $(date)"
```

### 2. Partial Data Corruption Recovery

```sql
-- Location: scripts/integrity-check.sql

-- Check for data consistency
SELECT
    'Users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails
FROM users

UNION ALL

SELECT
    'Lessons' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "teacherId" IS NULL OR "studentId" IS NULL THEN 1 END) as invalid_relations
FROM lessons

UNION ALL

SELECT
    'Invoices' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total < 0 THEN 1 END) as invalid_amounts
FROM invoices;

-- Check referential integrity
SELECT
    'Orphaned StudentProfiles' as issue,
    COUNT(*) as count
FROM "StudentProfile" sp
LEFT JOIN users u ON sp."userId" = u.id
WHERE u.id IS NULL;

SELECT
    'Orphaned Lessons' as issue,
    COUNT(*) as count
FROM lessons l
LEFT JOIN "TeacherProfile" tp ON l."teacherId" = tp.id
WHERE tp.id IS NULL;
```

## Monitoring & Alerting

### 1. Backup Success Monitoring

```javascript
// Location: app/api/admin/backup-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const backupPath = '/backups/daily';
    const files = await readdir(backupPath);

    const backups = await Promise.all(
      files
        .filter(file => file.endsWith('.sql'))
        .map(async (file) => {
          const filePath = path.join(backupPath, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            age: Date.now() - stats.birthtime.getTime()
          };
        })
    );

    // Check for issues
    const latest = backups.sort((a, b) => b.created.getTime() - a.created.getTime())[0];
    const isStale = latest && (Date.now() - latest.created.getTime()) > 25 * 60 * 60 * 1000; // 25 hours

    return NextResponse.json({
      status: isStale ? 'warning' : 'healthy',
      latest_backup: latest,
      total_backups: backups.length,
      backups: backups.slice(0, 10) // Last 10 backups
    });

  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to check backup status' },
      { status: 500 }
    );
  }
}
```

### 2. Health Check Integration

```yaml
# Location: docker-compose.yml (if using Docker)
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=guitar_strategies
      - POSTGRES_USER=${DATABASE_USER}
      - POSTGRES_PASSWORD=${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  backup-service:
    build: ./backup-service
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - S3_BUCKET=${BACKUP_S3_BUCKET}
    restart: unless-stopped
```

## Implementation Checklist

### Phase 1: Basic Backups (Week 1)
- [ ] Set up daily automated backups
- [ ] Configure backup storage (local + S3)
- [ ] Implement backup verification script
- [ ] Set up basic monitoring and alerting
- [ ] Test backup restoration process

### Phase 2: Advanced Recovery (Week 2)
- [ ] Configure WAL archiving for point-in-time recovery
- [ ] Set up backup integrity checks
- [ ] Create disaster recovery runbooks
- [ ] Implement automated backup health monitoring
- [ ] Set up staging environment restore testing

### Phase 3: Production Hardening (Week 3)
- [ ] Configure database replication (if applicable)
- [ ] Set up automated monthly restore tests
- [ ] Create comprehensive monitoring dashboard
- [ ] Document all procedures and train team
- [ ] Perform full disaster recovery drill

### Phase 4: Maintenance & Optimization (Ongoing)
- [ ] Regular backup performance optimization
- [ ] Quarterly disaster recovery testing
- [ ] Annual backup strategy review
- [ ] Backup cost optimization
- [ ] Documentation updates

## Cost Considerations

### Storage Costs (Estimated Monthly)
- **Local Storage**: ~$10/month (500GB SSD)
- **AWS S3 Standard**: ~$25/month (1TB backups)
- **AWS S3 Glacier**: ~$5/month (long-term retention)
- **Database Replication**: ~$50-100/month (depending on instance size)

### Total Estimated Cost: $90-140/month

### Cost Optimization Tips
1. Use lifecycle policies to move old backups to cheaper storage
2. Compress backups to reduce storage requirements
3. Implement deduplication for incremental backups
4. Regular cleanup of unnecessary backup files

## Security Considerations

1. **Encryption at Rest**: All backups encrypted with AES-256
2. **Encryption in Transit**: Use SSL/TLS for all backup transfers
3. **Access Control**: Limit backup access to authorized personnel only
4. **Key Management**: Use AWS KMS or similar for encryption keys
5. **Audit Logging**: Log all backup and restore operations
6. **Data Anonymization**: Consider anonymizing sensitive data in dev/staging restores

## Compliance & Documentation

1. **Data Retention Policy**: Defined backup retention periods
2. **Recovery Documentation**: Step-by-step recovery procedures
3. **Test Documentation**: Record all backup and restore tests
4. **Incident Response**: Integration with incident response procedures
5. **Compliance**: Meet industry standards (if applicable)

This strategy ensures comprehensive data protection while balancing cost, performance, and recovery requirements for the Guitar Strategies application.
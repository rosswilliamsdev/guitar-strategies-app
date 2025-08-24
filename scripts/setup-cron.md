# Background Job Setup Guide

This guide explains how to set up automatic lesson generation for the Guitar Strategies app.

## Overview

The automatic lesson generation system creates recurring lessons up to 12 weeks in advance, ensuring students can always book lessons well into the future. The system runs as a background job that should be executed daily or weekly.

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel deployments)

1. Add a `vercel.json` file to your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-lessons",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the job daily at 2:00 AM UTC.

2. Set the `CRON_SECRET` environment variable in your Vercel dashboard for security:
   - Go to your project settings in Vercel
   - Add environment variable: `CRON_SECRET` = `your-random-secret-here`
   - Generate a secure secret: `openssl rand -base64 32`

### Option 2: External Cron Service (Any hosting platform)

Use services like:
- **Uptime Robot** (free tier available)
- **Pingdom** 
- **Cron-job.org**
- **EasyCron**

Configure them to make a GET request to:
```
https://your-domain.com/api/cron/generate-lessons
```

Add the Authorization header if you set CRON_SECRET:
```
Authorization: Bearer your-cron-secret-here
```

Recommended schedule: Daily at 2:00 AM your server timezone

### Option 3: Server Cron (Self-hosted)

Add to your server's crontab:

```bash
# Run daily at 2:00 AM
0 2 * * * curl -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/generate-lessons

# Or run weekly on Sundays at 2:00 AM
0 2 * * 0 curl -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/generate-lessons
```

## Environment Variables

Set these in your deployment environment:

```bash
# Optional: Secret token to secure cron endpoint
CRON_SECRET=your-random-secret-here

# Ensure your database URL is set
DATABASE_URL=your-postgresql-url

# NextAuth configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

## How It Works

1. **Automatic Generation**: The job runs and finds all active recurring slots
2. **Smart Creation**: Only creates lessons that don't already exist (no duplicates)
3. **12-Week Window**: Generates lessons up to 12 weeks in advance
4. **Health Monitoring**: Validates system configuration and reports issues
5. **Logging**: All executions are logged for monitoring and debugging

## Monitoring

### Admin Dashboard

Access the monitoring interface at: `/admin/background-jobs`

Features:
- View job execution history
- See system health status
- Manually trigger job execution
- Monitor lesson generation statistics

### API Endpoints

- `GET /api/admin/background-jobs/history` - Job history and system health
- `POST /api/admin/background-jobs/generate-lessons` - Manual job trigger
- `GET /api/cron/generate-lessons` - Cron endpoint

## Testing

### Manual Testing

1. Log in as an admin user
2. Go to `/admin/background-jobs`
3. Click "Generate Lessons Now"
4. Check the results and any error messages

### API Testing

```bash
# Test the cron endpoint
curl -X GET https://your-domain.com/api/cron/generate-lessons

# With secret (if configured)
curl -H "Authorization: Bearer your-cron-secret" https://your-domain.com/api/cron/generate-lessons

# Check response
# Should return: {"success": true, "lessonsGenerated": X, "teachersProcessed": Y}
```

## Troubleshooting

### Common Issues

1. **No lessons generated**
   - Check that teachers have active recurring slots
   - Verify teachers have proper lesson settings configured
   - Check system health in admin dashboard

2. **Cron job not running**
   - Verify cron secret matches environment variable
   - Check cron service configuration
   - Review server logs for errors

3. **Database errors**
   - Ensure DATABASE_URL is correct
   - Check database connection and permissions
   - Verify Prisma migrations are up to date

### Logs

Check application logs for:
- Job execution messages
- Error details
- Performance metrics

### Health Checks

The system automatically validates:
- Teachers with recurring slots have lesson settings
- No orphaned recurring slots
- No overly old recurring slots that may need review

## Performance Notes

- The job typically completes in under 30 seconds
- Database queries are optimized with proper indexing
- No significant server load during execution
- Concurrent requests are handled safely

## Security

- Cron endpoint requires authorization header if `CRON_SECRET` is set
- Admin endpoints require authenticated admin user
- All database operations use parameterized queries
- Job execution is logged for audit purposes

## Database Maintenance

The system automatically:
- Cleans up job logs older than 30 days
- Uses `skipDuplicates` to prevent duplicate lessons
- Validates data integrity before creating lessons

Run database migrations before first use:
```bash
npx prisma migrate deploy
```
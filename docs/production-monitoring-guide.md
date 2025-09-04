# Production Monitoring Guide

This guide explains how to set up monitoring for your Guitar Strategies application to ensure you know immediately if something goes wrong in production.

## What is Production Monitoring?

When your Guitar Strategies app is live and serving real users, you need to know immediately if something breaks. Instead of waiting for users to complain, monitoring services automatically check your app every few minutes and alert you if there are problems.

## Why You Need Monitoring

### Without Monitoring (The Bad Scenario)
- Database crashes at 2 AM
- Students can't book lessons
- Teacher tries to log a lesson, gets errors
- You find out when angry users email you at 9 AM
- Lost business and frustrated users

### With Monitoring (The Good Scenario)
- Database crashes at 2 AM
- Health check fails immediately
- Monitoring service sends you an alert: "Database connection failed"
- You fix it within 15 minutes
- Users barely notice the outage

## How the Health Check Works

Your Guitar Strategies app includes a health check endpoint at `/api/health` that monitoring services can use to check if everything is working properly.

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-09-03T12:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {"status": "pass", "responseTime": 45},
    "email": {"status": "pass"},
    "memory": {"status": "pass"},
    "auth": {"status": "pass"}
  }
}
```

### Status Levels
- **🟢 healthy**: Everything working normally
- **🟡 degraded**: Minor issues but still functional (high memory, slow responses)
- **🔴 unhealthy**: Critical problems (database down, authentication broken)

## Monitoring Service Setup

### Option 1: Uptime Robot (Recommended - Free)

**Why choose Uptime Robot:**
- Free tier includes 50 monitors
- 5-minute check intervals
- Email/SMS alerts
- Simple setup
- Reliable service

**Setup Steps:**

1. **Sign up**: Go to [uptimerobot.com](https://uptimerobot.com) and create a free account

2. **Create Monitor**:
   - Click "Add New Monitor"
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `Guitar Strategies Health Check`
   - URL: `https://your-domain.com/api/health`
   - Monitoring Interval: `5 minutes`
   - Click "Create Monitor"

3. **Set up Alerts**:
   - Go to "My Settings" → "Alert Contacts"
   - Add your email address
   - Add your phone number for SMS (optional)
   - Enable notifications for "Down" and "Up" events

4. **Test the Setup**:
   - Your monitor should show "Up" status within 5 minutes
   - To test alerts, temporarily break your app (stop the server) and wait for notification

### Option 2: Better Uptime (Professional)

**Why choose Better Uptime:**
- Beautiful status pages
- Advanced alerting options
- Slack/Discord integration
- Phone call alerts
- More detailed metrics

**Setup Steps:**

1. **Sign up**: Go to [betteruptime.com](https://betteruptime.com)
2. **Create Monitor**: Similar to Uptime Robot but with more options
3. **Configure Alerts**: Set up multiple notification channels
4. **Create Status Page**: Public page showing your app's status

### Option 3: Pingdom (Enterprise)

**Why choose Pingdom:**
- Very detailed performance monitoring
- Multiple global monitoring locations
- Advanced reporting
- Root cause analysis

**Setup Steps:**
1. Sign up at [pingdom.com](https://www.pingdom.com)
2. Create uptime check for `/api/health`
3. Configure alerting preferences
4. Set up performance monitoring

## Advanced Monitoring Setup

### Custom Alert Rules

Most monitoring services allow you to create custom rules based on the health check response:

```javascript
// Example: Alert if database response time > 1000ms
if (response.checks.database.responseTime > 1000) {
  sendAlert("Database performance degraded");
}

// Example: Alert if memory usage is high
if (response.checks.memory.status === "warn") {
  sendWarning("High memory usage detected");
}
```

### Monitoring Multiple Aspects

Set up separate monitors for:
1. **Main health check**: `/api/health` (every 5 minutes)
2. **Website availability**: Homepage `/` (every 5 minutes)  
3. **API functionality**: `/api/lessons` (every 10 minutes, with auth)
4. **Database performance**: Parse health check for database response time

### Status Page Creation

Create a public status page that shows:
- Current system status
- Recent incidents
- Performance metrics
- Scheduled maintenance

**Example tools:**
- **Better Uptime**: Includes beautiful status pages
- **Status.io**: Dedicated status page service
- **Statuspage.io**: Atlassian's status page service

## Alert Configuration Best Practice

### Critical Alerts (Immediate Response Required)
- Overall status: `unhealthy`
- Database connection failed
- Authentication system down
- Site completely unreachable
- Response time > 30 seconds

**Notification method**: SMS + Email + Phone call

### Warning Alerts (Monitor Closely)
- Overall status: `degraded`
- High memory usage (80-90%)
- Slow database responses (>1000ms)
- Email service configuration issues

**Notification method**: Email + Slack

### Info Alerts (For Tracking)
- Memory usage trends
- Performance improvements/degradation
- Service restarts

**Notification method**: Email summary (daily)

## Testing Your Monitoring

### Test Alert Delivery
1. **Stop your application** temporarily
2. **Wait 5-10 minutes** for monitoring service to detect outage
3. **Verify you receive alerts** via email/SMS
4. **Restart your application**
5. **Verify you receive "service restored" notification**

### Test Health Check Locally
Use the included test script:
```bash
node scripts/test-health-check.js http://localhost:3000
```

### Test Production Health Check
```bash
curl https://your-domain.com/api/health | jq '.'
```

## Monitoring Dashboard Setup

### Create a Simple Dashboard

Most monitoring services provide dashboards. Set up widgets for:
- **Uptime percentage** (target: 99.9%)
- **Average response time** (target: <500ms)
- **Current status** of all services
- **Recent incidents** timeline

### Key Metrics to Track
- **Uptime**: Percentage of time your app is available
- **Response Time**: How fast your app responds
- **Error Rate**: Frequency of failures
- **Recovery Time**: How quickly you fix issues

## Incident Response Workflow

### When You Get an Alert

1. **Acknowledge the alert** (stops repeated notifications)
2. **Check the health check response** for details
3. **Investigate the specific failing component**:
   - Database issues → Check database server
   - Memory issues → Check server resources
   - Auth issues → Check configuration
4. **Fix the problem**
5. **Verify service is restored**
6. **Document the incident** for future reference

### Common Issues and Fixes

#### Database Connection Failed
```bash
# Check database server status
sudo systemctl status postgresql

# Check connection from app server
psql $DATABASE_URL -c "SELECT 1"

# Restart database service
sudo systemctl restart postgresql
```

#### High Memory Usage
```bash
# Check memory usage
free -h
top -o %MEM

# Restart application (if needed)
pm2 restart guitar-strategies

# Consider scaling up server
```

#### Email Service Issues
- Check RESEND_API_KEY is set correctly
- Verify API key hasn't expired
- Check Resend service status

## Monitoring Service Comparison

| Feature | Uptime Robot | Better Uptime | Pingdom |
|---------|--------------|---------------|---------|
| **Price** | Free (50 monitors) | $18/month | $57/month |
| **Check Interval** | 5 minutes | 1 minute | 1 minute |
| **Global Locations** | 1 free location | Multiple | Multiple |
| **Status Pages** | Basic | Beautiful | Advanced |
| **Integrations** | Limited | Slack, Discord | Many |
| **Phone Alerts** | Paid add-on | Included | Included |
| **API Access** | Yes | Yes | Yes |

## Recommendation for Guitar Strategies

**For small/personal apps**: Start with **Uptime Robot** free tier
**For professional apps**: Use **Better Uptime** 
**For enterprise apps**: Consider **Pingdom** or **DataDog**

## Setting Up Notifications

### Email Notifications
```
Subject: [ALERT] Guitar Strategies Health Check Failed
Body: 
- Status: unhealthy
- Failed Component: database
- Error: Connection timeout
- Time: 2025-09-03 02:15:30 UTC
- URL: https://yourapp.com/api/health
```

### Slack Integration
1. Create Slack webhook URL
2. Configure monitoring service to send to Slack
3. Customize message format for your team

### SMS Alerts (Critical Only)
- Only enable for critical issues (site down, database failure)
- Avoid alert fatigue from too many notifications
- Set quiet hours if appropriate

## Maintenance and Updates

### Regular Tasks
- **Weekly**: Review monitoring dashboard and alerts
- **Monthly**: Check for false positives and tune alert thresholds
- **Quarterly**: Review incident response times and improve processes

### Monitoring the Monitoring
- Set up alerts if monitoring service itself goes down
- Use multiple monitoring services for critical applications
- Test alert delivery monthly

## Troubleshooting Common Setup Issues

### Health Check Not Responding
```bash
# Test locally first
curl http://localhost:3000/api/health

# Check if endpoint is accessible
curl -I https://your-domain.com/api/health

# Check server logs
tail -f /var/log/nginx/access.log
```

### False Positive Alerts
- Increase timeout threshold (try 30 seconds instead of 10)
- Check from multiple locations
- Verify monitoring service reliability

### Missing Alerts
- Test alert delivery manually
- Check spam folder
- Verify contact information is correct
- Try different notification channels

## Cost Optimization

### Free Tier Limits
- **Uptime Robot**: 50 monitors, 5-minute intervals
- **Better Uptime**: 10 monitors on free trial
- **Pingdom**: No free tier

### Paid Tier Benefits
- Faster checking intervals (1-2 minutes)
- Multiple geographic locations
- Advanced alerting options
- Detailed performance metrics
- Status page hosting

## Next Steps After Setup

1. **Monitor for one week** to establish baseline
2. **Tune alert thresholds** to reduce false positives
3. **Set up status page** for user communication
4. **Create incident response playbook**
5. **Consider additional monitoring** (performance, errors, user experience)

## Getting Help

If you need help setting up monitoring:
- Check monitoring service documentation
- Test health check endpoint locally first
- Review server logs for any issues
- Consider starting with simple HTTP monitoring before advanced features

Remember: The goal is to know about problems before your users do, so you can fix them quickly and maintain a reliable service for guitar teachers and students.
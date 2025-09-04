# Health Check Endpoint

The Guitar Strategies application provides a comprehensive health check endpoint for production monitoring.

## Endpoint

- **URL**: `/api/health`
- **Method**: `GET`
- **Authentication**: None required (public endpoint)
- **Rate Limiting**: Subject to standard rate limits

## Response Format

The health check returns a JSON response with the following structure:

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-09-03T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 45,
      "message": "Database connected. 150 users registered."
    },
    "email": {
      "status": "pass", 
      "message": "Email service configured"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage: 128MB RSS, 64MB/96MB heap (67%)"
    },
    "auth": {
      "status": "pass",
      "message": "Authentication service configured"
    },
    "storage": {
      "status": "pass",
      "message": "File storage configured"
    }
  },
  "metrics": {
    "memoryUsage": {
      "rss": 134217728,
      "heapTotal": 100663296,
      "heapUsed": 67108864,
      "external": 16777216
    },
    "responseTime": 156
  }
}
```

## Health Status Levels

### `healthy` (HTTP 200)
All systems are operating normally. All health checks pass.

### `degraded` (HTTP 200)
System is operational but some components have warnings. May indicate:
- High memory usage (80-90% heap utilization)
- Missing optional configuration (storage, email)
- Slower than optimal database response times

### `unhealthy` (HTTP 503)
System has critical issues that affect functionality:
- Database connection failures
- Memory usage above 90%
- Missing critical configuration
- Authentication system failures

## Individual Health Checks

### Database Check
- **Purpose**: Verifies database connectivity and performance
- **Test**: Simple query + user count
- **Thresholds**:
  - `pass`: Response time < 1000ms
  - `warn`: Response time ≥ 1000ms
  - `fail`: Connection failure

### Email Service Check  
- **Purpose**: Verifies email notification capability
- **Test**: Configuration validation
- **Conditions**:
  - `pass`: RESEND_API_KEY properly configured
  - `warn`: Missing or invalid API key format
  - `fail`: Email service error

### Memory Check
- **Purpose**: Monitors system resource usage
- **Test**: Process memory usage analysis
- **Thresholds**:
  - `pass`: Heap usage < 80%
  - `warn`: Heap usage 80-90%
  - `fail`: Heap usage > 90%

### Authentication Check
- **Purpose**: Validates auth system configuration
- **Test**: Environment variable validation
- **Conditions**:
  - `pass`: Proper NEXTAUTH_SECRET configured
  - `warn`: Missing NEXTAUTH_URL
  - `fail`: Missing or insecure secret

### Storage Check (Optional)
- **Purpose**: Verifies file storage capability
- **Test**: Configuration validation
- **Note**: Only runs if BLOB_READ_WRITE_TOKEN is configured

## Monitoring Integration

### Basic HTTP Monitoring
Monitor the endpoint with any HTTP monitoring service:
- **URL**: `https://your-domain.com/api/health`
- **Expected Status**: 200 (for healthy/degraded)
- **Alert on**: 503 status or request timeout

### Advanced Monitoring
For detailed monitoring, parse the JSON response:

```bash
# Example with curl and jq
curl -s https://your-domain.com/api/health | jq '.status'

# Check specific component
curl -s https://your-domain.com/api/health | jq '.checks.database.status'

# Get response time
curl -s https://your-domain.com/api/health | jq '.metrics.responseTime'
```

### Recommended Alerts

1. **Critical Alerts** (Immediate action required):
   - Overall status: `unhealthy`
   - Database status: `fail`
   - Authentication status: `fail`
   - Response time > 5000ms

2. **Warning Alerts** (Monitor closely):
   - Overall status: `degraded`
   - Memory status: `warn`
   - Database response time > 1000ms
   - Missing optional services

3. **Info Alerts** (For tracking):
   - High memory usage trends
   - Database performance degradation
   - Service configuration changes

## Example Monitoring Configurations

### Uptime Robot
- Monitor Type: HTTP(s)
- URL: `https://your-domain.com/api/health`
- Interval: 5 minutes
- Alert when: Status code is not 200

### Pingdom
- Check Type: HTTP
- URL: `https://your-domain.com/api/health`
- Check Interval: 1 minute
- Alert when: Response time > 3000ms OR status != 200

### Custom Script
```bash
#!/bin/bash
HEALTH_URL="https://your-domain.com/api/health"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/health.json "$HEALTH_URL")

if [ "$STATUS" != "200" ]; then
    echo "CRITICAL: Health check returned status $STATUS"
    exit 2
fi

HEALTH_STATUS=$(jq -r '.status' /tmp/health.json)
if [ "$HEALTH_STATUS" = "unhealthy" ]; then
    echo "CRITICAL: System is unhealthy"
    exit 2
elif [ "$HEALTH_STATUS" = "degraded" ]; then
    echo "WARNING: System is degraded"
    exit 1
else
    echo "OK: System is healthy"
    exit 0
fi
```

## Security Considerations

- The health check endpoint is intentionally public for monitoring
- No sensitive information is exposed in responses
- Database queries are minimal and non-invasive
- Response times may vary under load
- Consider rate limiting for production environments

## Troubleshooting

### Common Issues

1. **Database connection failures**:
   - Check DATABASE_URL configuration
   - Verify database server is running
   - Check network connectivity

2. **High memory usage**:
   - Monitor for memory leaks
   - Consider scaling up resources
   - Review application code for optimization

3. **Slow response times**:
   - Check database performance
   - Monitor system load
   - Consider database indexing

4. **Authentication warnings**:
   - Generate secure NEXTAUTH_SECRET
   - Configure NEXTAUTH_URL properly
   - Check environment variable loading
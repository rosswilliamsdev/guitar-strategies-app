#!/usr/bin/env node

/**
 * Simple health check test script
 * 
 * Tests the /api/health endpoint and validates the response format.
 * Can be used for local testing or integration into CI/CD pipelines.
 * 
 * Usage:
 *   node scripts/test-health-check.js [URL]
 * 
 * Examples:
 *   node scripts/test-health-check.js
 *   node scripts/test-health-check.js http://localhost:3000
 *   node scripts/test-health-check.js https://yourapp.com
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Default to local development server
const HEALTH_URL = process.argv[2] || 'http://localhost:3000/api/health';

console.log(`🔍 Testing health check endpoint: ${HEALTH_URL}\n`);

function makeRequest(healthUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(healthUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = client.request(parsedUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            responseTime,
            rawData: data
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            responseTime,
            rawData: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function validateHealthResponse(response) {
  const issues = [];
  
  // Check HTTP status code
  if (![200, 503].includes(response.statusCode)) {
    issues.push(`❌ Unexpected HTTP status: ${response.statusCode} (expected 200 or 503)`);
  }
  
  // Check if response is JSON
  if (!response.data) {
    issues.push(`❌ Invalid JSON response: ${response.parseError || 'Unknown parse error'}`);
    return issues;
  }
  
  const data = response.data;
  
  // Check required fields
  const requiredFields = ['status', 'timestamp', 'uptime', 'version', 'environment', 'checks'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      issues.push(`❌ Missing required field: ${field}`);
    }
  }
  
  // Check status values
  if (data.status && !['healthy', 'degraded', 'unhealthy'].includes(data.status)) {
    issues.push(`❌ Invalid status value: ${data.status}`);
  }
  
  // Check checks object
  if (data.checks) {
    const expectedChecks = ['database', 'email', 'memory', 'auth'];
    for (const check of expectedChecks) {
      if (!(check in data.checks)) {
        issues.push(`❌ Missing health check: ${check}`);
      } else if (!['pass', 'fail', 'warn'].includes(data.checks[check].status)) {
        issues.push(`❌ Invalid ${check} check status: ${data.checks[check].status}`);
      }
    }
  }
  
  // Check HTTP status matches health status
  if (data.status === 'unhealthy' && response.statusCode !== 503) {
    issues.push(`❌ HTTP status ${response.statusCode} doesn't match unhealthy status (expected 503)`);
  }
  
  if (['healthy', 'degraded'].includes(data.status) && response.statusCode !== 200) {
    issues.push(`❌ HTTP status ${response.statusCode} doesn't match ${data.status} status (expected 200)`);
  }
  
  return issues;
}

function formatHealthStatus(data) {
  console.log('📊 Health Check Results:');
  console.log('========================');
  console.log(`Overall Status: ${getStatusEmoji(data.status)} ${data.status.toUpperCase()}`);
  console.log(`Timestamp: ${data.timestamp}`);
  console.log(`Uptime: ${Math.round(data.uptime)}s`);
  console.log(`Version: ${data.version}`);
  console.log(`Environment: ${data.environment}`);
  
  if (data.metrics) {
    console.log(`Response Time: ${data.metrics.responseTime}ms`);
  }
  
  console.log('\n🔧 Individual Checks:');
  console.log('---------------------');
  
  if (data.checks) {
    for (const [checkName, check] of Object.entries(data.checks)) {
      const emoji = getStatusEmoji(check.status === 'pass' ? 'healthy' : check.status === 'warn' ? 'degraded' : 'unhealthy');
      console.log(`${emoji} ${checkName.padEnd(10)}: ${check.status.toUpperCase().padEnd(4)} - ${check.message || 'No message'}`);
      
      if (check.responseTime) {
        console.log(`   └─ Response Time: ${check.responseTime}ms`);
      }
    }
  }
  
  if (data.metrics && data.metrics.memoryUsage) {
    console.log('\n💾 Memory Usage:');
    console.log('----------------');
    const mem = data.metrics.memoryUsage;
    console.log(`RSS: ${Math.round(mem.rss / 1024 / 1024)}MB`);
    console.log(`Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
    console.log(`Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
    console.log(`External: ${Math.round(mem.external / 1024 / 1024)}MB`);
  }
}

function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'unhealthy': return '❌';
    default: return '❓';
  }
}

// Main execution
async function main() {
  try {
    console.log('⏱️  Making request...\n');
    
    const response = await makeRequest(HEALTH_URL);
    
    console.log(`📡 Response received in ${response.responseTime}ms`);
    console.log(`📄 HTTP Status: ${response.statusCode}\n`);
    
    // Validate response format
    const validationIssues = validateHealthResponse(response);
    
    if (validationIssues.length > 0) {
      console.log('🚨 Validation Issues:');
      console.log('====================');
      for (const issue of validationIssues) {
        console.log(issue);
      }
      console.log('');
    }
    
    // Display health information
    if (response.data) {
      formatHealthStatus(response.data);
    } else {
      console.log('❌ Unable to parse health check response');
      console.log('Raw response:', response.rawData);
    }
    
    // Exit with appropriate code
    if (validationIssues.length > 0) {
      console.log('\n❌ Health check validation failed');
      process.exit(1);
    } else if (response.data && response.data.status === 'unhealthy') {
      console.log('\n❌ System is unhealthy');
      process.exit(1);
    } else if (response.data && response.data.status === 'degraded') {
      console.log('\n⚠️  System is degraded but functional');
      process.exit(0);
    } else {
      console.log('\n✅ Health check passed');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('\nThis could indicate:');
    console.error('- Server is not running');
    console.error('- Network connectivity issues');
    console.error('- Health endpoint is not accessible');
    console.error('- Request timeout (10 seconds)');
    process.exit(2);
  }
}

// Run the test
main();
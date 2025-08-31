#!/usr/bin/env node

/**
 * Test script for Bakalari sync functionality
 * This script tests the sync endpoint and validates the response
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  operatorToken: process.env.OPERATOR_TOKEN,
  syncEndpoint: '/api/sync/bakalari',
  timeout: 30000 // 30 seconds
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(config.timeout);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testSync() {
  log('info', '=== EduRPG Bakalari Sync Test ===');
  
  // Check prerequisites
  if (!config.operatorToken) {
    log('error', 'OPERATOR_TOKEN environment variable is not set');
    log('error', 'Please set a valid operator token for testing');
    process.exit(1);
  }
  
  log('info', `Testing sync endpoint: ${config.appUrl}${config.syncEndpoint}`);
  log('info', `Using operator token: ${config.operatorToken.substring(0, 10)}...`);
  
  try {
    // Make sync request
    const response = await makeRequest(`${config.appUrl}${config.syncEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.operatorToken}`,
        'User-Agent': 'EduRPG-Sync-Test/1.0'
      }
    });
    
    log('info', `Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      log('success', 'Sync completed successfully!');
      
      // Validate response structure
      const data = response.data;
      const requiredFields = ['success', 'runId', 'startedAt', 'completedAt', 'durationMs', 'result'];
      
      for (const field of requiredFields) {
        if (!(field in data)) {
          log('warn', `Missing required field: ${field}`);
        }
      }
      
      // Log sync results
      if (data.result) {
        log('info', 'Sync Results:');
        log('info', `  Classes: ${data.result.classesCreated} created, ${data.result.classesUpdated} updated`);
        log('info', `  Users: ${data.result.usersCreated} created, ${data.result.usersUpdated} updated`);
        log('info', `  Subjects: ${data.result.subjectsCreated} created, ${data.result.subjectsUpdated} updated`);
        log('info', `  Enrollments: ${data.result.enrollmentsCreated} created, ${data.result.enrollmentsUpdated} updated`);
      }
      
      log('info', `Run ID: ${data.runId}`);
      log('info', `Duration: ${data.durationMs}ms`);
      log('info', `Started: ${data.startedAt}`);
      log('info', `Completed: ${data.completedAt}`);
      
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      log('error', 'Authentication failed');
      log('error', `Response: ${JSON.stringify(response.data, null, 2)}`);
      process.exit(1);
      
    } else if (response.statusCode === 500) {
      log('error', 'Server error occurred');
      if (response.data.errors) {
        log('error', 'Errors:');
        response.data.errors.forEach(error => log('error', `  - ${error}`));
      }
      process.exit(1);
      
    } else {
      log('warn', `Unexpected status code: ${response.statusCode}`);
      log('warn', `Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    
  } catch (error) {
    log('error', `Request failed: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      log('error', 'Connection refused. Is the EduRPG application running?');
    } else if (error.code === 'ENOTFOUND') {
      log('error', 'Host not found. Check the APP_URL configuration.');
    } else if (error.message === 'Request timeout') {
      log('error', 'Request timed out. The sync may be taking too long.');
    }
    
    process.exit(1);
  }
}

// Run the test
testSync().catch(error => {
  log('error', `Test failed: ${error.message}`);
  process.exit(1);
});

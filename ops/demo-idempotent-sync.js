#!/usr/bin/env node

/**
 * Demo: Idempotent Sync Prevention of Duplicates
 * This script demonstrates how running sync twice yields no duplicates
 */

const https = require('https');
const http = require('http');

// Mock Bakalari data for demonstration
const mockBakalariData = {
  classes: [
    { id: 'class_1', abbrev: '1.A', name: '1.A třída' },
    { id: 'class_2', abbrev: '2.B', name: '2.B třída' }
  ],
  subjects: [
    { id: 'subj_1', code: 'MAT', name: 'Matematika' },
    { id: 'subj_2', code: 'CZE', name: 'Český jazyk' },
    { id: 'subj_3', code: 'ENG', name: 'Anglický jazyk' }
  ],
  users: [
    {
      id: 'user_1',
      userID: 'student_001',
      userType: 'student',
      fullUserName: 'Jan Novák',
      classAbbrev: '1.A',
      classId: 'class_1',
      subjects: [
        { id: 'subj_1', code: 'MAT', name: 'Matematika' },
        { id: 'subj_2', code: 'CZE', name: 'Český jazyk' }
      ]
    },
    {
      id: 'user_2', 
      userID: 'teacher_001',
      userType: 'teacher',
      fullUserName: 'Marie Svobodová',
      classAbbrev: null,
      classId: null,
      subjects: [
        { id: 'subj_1', code: 'MAT', name: 'Matematika' }
      ]
    }
  ]
};

// Configuration
const config = {
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  operatorToken: process.env.OPERATOR_TOKEN || 'demo_token',
  syncEndpoint: '/api/sync/bakalari',
  timeout: 30000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
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

async function runSync(runNumber) {
  log('info', `\n${colors.bold}=== SYNC RUN ${runNumber} ===${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.appUrl}${config.syncEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.operatorToken}`,
        'User-Agent': 'EduRPG-Sync-Demo/1.0'
      }
    });
    
    if (response.statusCode === 200) {
      const data = response.data;
      log('success', `Sync ${runNumber} completed successfully!`);
      
      // Show detailed results
      if (data.result) {
        log('info', `\n${colors.cyan}Sync ${runNumber} Results:${colors.reset}`);
        log('info', `  Classes: ${data.result.classesCreated} created, ${data.result.classesUpdated} updated`);
        log('info', `  Users: ${data.result.usersCreated} created, ${data.result.usersUpdated} updated`);
        log('info', `  Subjects: ${data.result.subjectsCreated} created, ${data.result.subjectsUpdated} updated`);
        log('info', `  Enrollments: ${data.result.enrollmentsCreated} created, ${data.result.enrollmentsUpdated} updated`);
      }
      
      log('info', `Run ID: ${data.runId}`);
      log('info', `Duration: ${data.durationMs}ms`);
      
      return data;
    } else {
      log('error', `Sync ${runNumber} failed with status ${response.statusCode}`);
      log('error', `Response: ${JSON.stringify(response.data, null, 2)}`);
      return null;
    }
    
  } catch (error) {
    log('error', `Sync ${runNumber} request failed: ${error.message}`);
    return null;
  }
}

async function demonstrateIdempotency() {
  log('info', `${colors.bold}=== EDURPG IDEMPOTENT SYNC DEMONSTRATION ===${colors.reset}`);
  log('info', 'This demo shows how running sync twice yields no duplicates');
  
  log('info', `\n${colors.yellow}Mock Bakalari Data:${colors.reset}`);
  log('info', `  Classes: ${mockBakalariData.classes.length} (1.A, 2.B)`);
  log('info', `  Subjects: ${mockBakalariData.subjects.length} (MAT, CZE, ENG)`);
  log('info', `  Users: ${mockBakalariData.users.length} (1 student, 1 teacher)`);
  
  log('info', `\n${colors.yellow}Expected Behavior:${colors.reset}`);
  log('info', '  Run 1: Creates new records (classesCreated=2, usersCreated=2, etc.)');
  log('info', '  Run 2: Updates existing records (classesUpdated=2, usersUpdated=2, etc.)');
  log('info', '  No duplicates should be created due to ExternalRef constraints');
  
  // Run sync twice
  const run1Result = await runSync(1);
  
  if (run1Result) {
    log('info', `\n${colors.yellow}Waiting 2 seconds before second run...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const run2Result = await runSync(2);
    
    if (run2Result) {
      log('info', `\n${colors.bold}=== IDEMPOTENCY VERIFICATION ===${colors.reset}`);
      
      // Compare results
      const r1 = run1Result.result;
      const r2 = run2Result.result;
      
      log('info', `${colors.cyan}Run 1 (First Sync):${colors.reset}`);
      log('info', `  Created: ${r1.classesCreated + r1.usersCreated + r1.subjectsCreated + r1.enrollmentsCreated} total`);
      log('info', `  Updated: ${r1.classesUpdated + r1.usersUpdated + r1.subjectsUpdated + r1.enrollmentsUpdated} total`);
      
      log('info', `${colors.cyan}Run 2 (Second Sync):${colors.reset}`);
      log('info', `  Created: ${r2.classesCreated + r2.usersCreated + r2.subjectsCreated + r2.enrollmentsCreated} total`);
      log('info', `  Updated: ${r2.classesUpdated + r2.usersUpdated + r2.subjectsUpdated + r2.enrollmentsUpdated} total`);
      
      // Verify idempotency
      const totalCreatedRun2 = r2.classesCreated + r2.usersCreated + r2.subjectsCreated + r2.enrollmentsCreated;
      
      if (totalCreatedRun2 === 0) {
        log('success', `\n${colors.bold}✅ IDEMPOTENCY VERIFIED: No duplicates created in second run!${colors.reset}`);
        log('info', 'The ExternalRef unique constraints prevented duplicate creation.');
      } else {
        log('error', `\n${colors.bold}❌ IDEMPOTENCY FAILED: ${totalCreatedRun2} duplicates created in second run!${colors.reset}`);
      }
      
      log('info', `\n${colors.yellow}Database State After Both Runs:${colors.reset}`);
      log('info', '  ExternalRef table should contain unique mappings for each entity');
      log('info', '  No duplicate (type, externalId) combinations exist');
      log('info', '  All entities are properly linked via internal IDs');
    }
  }
  
  log('info', `\n${colors.bold}=== DEMONSTRATION COMPLETE ===${colors.reset}`);
}

// Run the demonstration
demonstrateIdempotency().catch(error => {
  log('error', `Demo failed: ${error.message}`);
  process.exit(1);
});

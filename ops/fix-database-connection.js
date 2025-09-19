#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function fixDatabaseConnection() {
  console.log('🔧 Fixing EduRPG database connection...');
  
  // Try different connection strings
  const connectionStrings = [
    'postgresql://postgres:postgres@localhost:5432/edurpg',
    'postgresql://postgres:@localhost:5432/edurpg',
    'postgresql://postgres:password@localhost:5432/edurpg',
    'postgresql://edurpg_user:edurpg_password@localhost:5432/edurpg'
  ];

  let workingConnection = null;
  
  for (const connectionString of connectionStrings) {
    console.log(`\n🧪 Testing connection: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);
    
    const client = new Client({
      connectionString: connectionString
    });

    try {
      await client.connect();
      console.log('✅ Connection successful!');
      
      // Test if we can create tables
      await client.query('SELECT 1');
      console.log('✅ Database access confirmed');
      
      workingConnection = connectionString;
      await client.end();
      break;
      
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  if (!workingConnection) {
    console.log('\n❌ No working database connection found.');
    console.log('\n🔧 Please try one of these solutions:');
    console.log('1. Install and start PostgreSQL with default postgres user');
    console.log('2. Create the edurpg database and user manually');
    console.log('3. Update your .env file with correct credentials');
    console.log('\n📝 Example .env configuration:');
    console.log('DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edurpg"');
    return false;
  }

  console.log(`\n✅ Working connection found: ${workingConnection.replace(/:[^:@]+@/, ':***@')}`);
  
  // Test Prisma connection
  console.log('\n🧪 Testing Prisma connection...');
  
  // Temporarily set the working connection
  process.env.DATABASE_URL = workingConnection;
  
  try {
    const { PrismaClient } = require('../app/lib/generated');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Prisma client connection successful!');
    
    // Test a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Prisma query test successful!');
    
    await prisma.$disconnect();
    
    console.log('\n🎉 Database connection is working!');
    console.log('\n📝 To fix permanently, update your .env file with:');
    console.log(`DATABASE_URL="${workingConnection}"`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ Prisma connection failed: ${error.message}`);
    return false;
  }
}

async function testPrismaPush() {
  console.log('\n🧪 Testing Prisma db push...');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    const { stdout, stderr } = await execAsync('npx prisma db push', {
      env: { ...process.env }
    });
    
    if (stdout) console.log('✅ Prisma db push output:', stdout);
    if (stderr && !stderr.includes('warning')) console.log('⚠️ Prisma warnings:', stderr);
    
    console.log('✅ Prisma db push successful!');
    return true;
    
  } catch (error) {
    console.log(`❌ Prisma db push failed: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const connectionFixed = await fixDatabaseConnection();
    
    if (connectionFixed) {
      await testPrismaPush();
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixDatabaseConnection, testPrismaPush };

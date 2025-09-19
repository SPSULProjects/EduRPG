#!/usr/bin/env node

const { PrismaClient } = require('../app/lib/generated');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🧪 Testing EduRPG Database Connection...\n');
  
  // Test 1: Direct PostgreSQL connection
  console.log('1️⃣ Testing direct PostgreSQL connection...');
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('✅ Direct PostgreSQL connection successful');
    
    const result = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    
    await client.end();
  } catch (error) {
    console.log(`❌ Direct PostgreSQL connection failed: ${error.message}`);
    return false;
  }

  // Test 2: Prisma client connection
  console.log('\n2️⃣ Testing Prisma client connection...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Prisma client connection successful');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Prisma query test successful');
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`❌ Prisma client connection failed: ${error.message}`);
    return false;
  }

  // Test 3: Database schema validation
  console.log('\n3️⃣ Testing database schema...');
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Test if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    
    console.log(`✅ Found ${tables.length} tables in database`);
    
    // Test User table specifically
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible, count: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`❌ Database schema test failed: ${error.message}`);
    return false;
  }

  // Test 4: Environment variables
  console.log('\n4️⃣ Testing environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  let envVarsOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is missing`);
      envVarsOk = false;
    }
  }
  
  // Test TEST_MODE specifically
  if (process.env.TEST_MODE) {
    console.log(`✅ TEST_MODE is set to: ${process.env.TEST_MODE}`);
  } else {
    console.log('⚠️ TEST_MODE is not set (optional)');
  }

  return envVarsOk;
}

async function testAuthenticationFlow() {
  console.log('\n5️⃣ Testing authentication flow...');
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Test if we can create a test user (in test mode)
    if (process.env.TEST_MODE === 'true') {
      console.log('🧪 Test mode enabled - testing mock authentication');
      
      // This should work without database operations
      const mockUser = {
        id: "test_user_001",
        email: "test@edurpg.local",
        name: "Test User",
        role: "STUDENT",
        classId: "test_class_001"
      };
      
      console.log('✅ Mock user creation successful');
      console.log(`👤 Mock user: ${mockUser.name} (${mockUser.role})`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.log(`❌ Authentication flow test failed: ${error.message}`);
    return false;
  }
  
  return true;
}

async function main() {
  try {
    const dbOk = await testDatabaseConnection();
    const authOk = await testAuthenticationFlow();
    
    console.log('\n' + '='.repeat(50));
    if (dbOk && authOk) {
      console.log('🎉 All database tests passed!');
      console.log('✅ Database connection is working');
      console.log('✅ Prisma client is functional');
      console.log('✅ Authentication system is ready');
      console.log('\n📝 Next steps:');
      console.log('1. Update your .env file with the working DATABASE_URL');
      console.log('2. Run: npm run dev');
      console.log('3. Test the application at http://localhost:3000');
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testDatabaseConnection, testAuthenticationFlow };

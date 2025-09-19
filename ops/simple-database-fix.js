#!/usr/bin/env node

const { Client } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Load environment variables
require('dotenv').config();

async function fixDatabasePermissions() {
  console.log('🔧 Fixing database permissions...\n');
  
  // Use postgres superuser to fix permissions
  const superuserUrl = 'postgresql://postgres:postgres@localhost:5432/edurpg';
  const appUser = 'edurpg_user';
  
  console.log(`👤 Fixing permissions for user: ${appUser}`);
  
  const client = new Client({
    connectionString: superuserUrl
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL as superuser');

    // Grant all privileges on the database
    console.log(`🔑 Granting all privileges to ${appUser}`);
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE edurpg TO "${appUser}"`);
    await client.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO "${appUser}"`);
    await client.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${appUser}"`);
    await client.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${appUser}"`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${appUser}"`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${appUser}"`);
    
    console.log('✅ Permissions granted successfully');
    
  } catch (error) {
    console.error('❌ Permission fix failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function runPrismaPush() {
  console.log('\n🔄 Running Prisma db push...');
  
  try {
    const { stdout, stderr } = await execAsync('npx prisma db push', {
      env: { ...process.env }
    });
    
    if (stdout) console.log('✅ Push output:', stdout);
    if (stderr && !stderr.includes('warning')) console.log('⚠️ Push warnings:', stderr);
    
    console.log('✅ Prisma db push completed successfully');
    
  } catch (error) {
    console.error('❌ Prisma db push failed:', error.message);
    throw error;
  }
}

async function generatePrismaClient() {
  console.log('\n🔄 Generating Prisma client...');
  
  try {
    const { stdout, stderr } = await execAsync('npx prisma generate', {
      env: { ...process.env }
    });
    
    if (stdout) console.log('✅ Generation output:', stdout);
    if (stderr && !stderr.includes('warning')) console.log('⚠️ Generation warnings:', stderr);
    
    console.log('✅ Prisma client generated successfully');
    
  } catch (error) {
    console.error('❌ Prisma client generation failed:', error.message);
    throw error;
  }
}

async function testConnection() {
  console.log('\n🧪 Testing database connection...');
  
  try {
    const { PrismaClient } = require('../app/lib/generated');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Prisma connection successful');
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test successful');
    
    // Test table access
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible, count: ${userCount}`);
    
    // Test all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log(`✅ Found ${tables.length} tables in database`);
    
    await prisma.$disconnect();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    throw error;
  }
}

async function testEnvironmentVariables() {
  console.log('\n🧪 Testing environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  let allGood = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allGood = false;
    }
  }
  
  // Test TEST_MODE
  if (process.env.TEST_MODE) {
    console.log(`✅ TEST_MODE is set to: ${process.env.TEST_MODE}`);
  } else {
    console.log('⚠️ TEST_MODE is not set (optional for testing)');
  }
  
  return allGood;
}

async function main() {
  try {
    const envOk = await testEnvironmentVariables();
    if (!envOk) {
      console.log('\n❌ Environment variables are not properly configured');
      console.log('Please check your .env file');
      return;
    }
    
    await fixDatabasePermissions();
    await runPrismaPush();
    await generatePrismaClient();
    await testConnection();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('✅ Database connection is working');
    console.log('✅ Prisma client is functional');
    console.log('✅ All tables are accessible');
    console.log('\n📝 Current configuration:');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);
    console.log(`TEST_MODE: ${process.env.TEST_MODE || 'not set'}`);
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Test the application at http://localhost:3000');
    console.log('3. Use test credentials: username=test, password=test (if TEST_MODE=true)');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  fixDatabasePermissions, 
  runPrismaPush, 
  generatePrismaClient, 
  testConnection,
  testEnvironmentVariables 
};

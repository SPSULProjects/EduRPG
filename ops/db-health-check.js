#!/usr/bin/env node

/**
 * Database Health Check Script
 * 
 * This script performs comprehensive database health checks including:
 * - Connection validation
 * - Table existence verification
 * - Index validation
 * - Performance metrics
 * 
 * Usage: node ops/db-health-check.js
 */

const { PrismaClient } = require('../app/lib/generated');

class DatabaseHealthCheck {
  constructor() {
    this.prisma = new PrismaClient();
    this.results = {
      connection: false,
      tables: [],
      indexes: [],
      performance: {},
      errors: []
    };
  }

  async run() {
    console.log('🔍 Starting Database Health Check...\n');
    
    try {
      await this.checkConnection();
      await this.checkTables();
      await this.checkIndexes();
      await this.checkPerformance();
      
      this.printResults();
      
      if (this.results.errors.length === 0) {
        console.log('\n🎉 All database health checks passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some database health checks failed!');
        process.exit(1);
      }
    } catch (error) {
      console.error('💥 Health check failed with error:', error.message);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async checkConnection() {
    try {
      console.log('📡 Testing database connection...');
      await this.prisma.$queryRaw`SELECT 1`;
      this.results.connection = true;
      console.log('✅ Database connection successful');
    } catch (error) {
      this.results.errors.push(`Connection failed: ${error.message}`);
      console.log('❌ Database connection failed');
    }
  }

  async checkTables() {
    try {
      console.log('\n📋 Checking table existence...');
      
      const expectedTables = [
        'User', 'Class', 'Subject', 'Enrollment', 'Job', 'JobAssignment',
        'TeacherDailyBudget', 'XPAudit', 'MoneyTx', 'Item', 'Purchase',
        'Achievement', 'AchievementAward', 'Event', 'EventParticipation',
        'SystemLog', 'ExternalRef'
      ];

      const existingTables = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;

      const tableNames = existingTables.map(t => t.table_name);
      this.results.tables = tableNames;

      for (const expectedTable of expectedTables) {
        if (tableNames.includes(expectedTable)) {
          console.log(`✅ Table ${expectedTable} exists`);
        } else {
          this.results.errors.push(`Missing table: ${expectedTable}`);
          console.log(`❌ Table ${expectedTable} missing`);
        }
      }
    } catch (error) {
      this.results.errors.push(`Table check failed: ${error.message}`);
      console.log('❌ Table existence check failed');
    }
  }

  async checkIndexes() {
    try {
      console.log('\n🔍 Checking critical indexes...');
      
      const criticalIndexes = [
        'User_email_key',
        'User_bakalariId_key',
        'User_role_idx',
        'User_classId_idx',
        'Job_teacherId_idx',
        'Job_subjectId_idx',
        'Job_status_idx',
        'SystemLog_level_idx',
        'SystemLog_createdAt_idx'
      ];

      const existingIndexes = await this.prisma.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY indexname
      `;

      const indexNames = existingIndexes.map(i => i.indexname);
      this.results.indexes = indexNames;

      for (const expectedIndex of criticalIndexes) {
        if (indexNames.includes(expectedIndex)) {
          console.log(`✅ Index ${expectedIndex} exists`);
        } else {
          this.results.errors.push(`Missing index: ${expectedIndex}`);
          console.log(`❌ Index ${expectedIndex} missing`);
        }
      }
    } catch (error) {
      this.results.errors.push(`Index check failed: ${error.message}`);
      console.log('❌ Index check failed');
    }
  }

  async checkPerformance() {
    try {
      console.log('\n⚡ Checking performance metrics...');
      
      // Check table sizes
      const tableSizes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||'"'||tablename||'"')) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE '_prisma_%'
        ORDER BY pg_total_relation_size(schemaname||'.'||'"'||tablename||'"') DESC
        LIMIT 5
      `;

      console.log('📊 Largest tables:');
      tableSizes.forEach(table => {
        console.log(`  ${table.tablename}: ${table.size}`);
      });

      // Check connection count
      const connectionCount = await this.prisma.$queryRaw`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;

      console.log(`🔗 Active connections: ${connectionCount[0].connections}`);

      this.results.performance = {
        tableSizes,
        connectionCount: connectionCount[0].connections
      };
    } catch (error) {
      this.results.errors.push(`Performance check failed: ${error.message}`);
      console.log('❌ Performance check failed');
    }
  }

  printResults() {
    console.log('\n📊 Health Check Summary:');
    console.log(`Connection: ${this.results.connection ? '✅' : '❌'}`);
    console.log(`Tables: ${this.results.tables.length} found`);
    console.log(`Indexes: ${this.results.indexes.length} found`);
    console.log(`Errors: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors found:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
  }
}

// Run the health check
const healthCheck = new DatabaseHealthCheck();
healthCheck.run();

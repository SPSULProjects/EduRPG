#!/usr/bin/env node

/**
 * Seed script to populate database with mock Bakalari data
 * This creates test data that can be used to demonstrate idempotent sync
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock Bakalari data
const mockData = {
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

async function seedMockData() {
  console.log('🌱 Seeding mock Bakalari data...');
  
  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await prisma.enrollment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.class.deleteMany();
    await prisma.externalRef.deleteMany();
    
    console.log('✅ Existing data cleared');
    
    // Create classes
    console.log('📚 Creating classes...');
    const classes = [];
    for (const classData of mockData.classes) {
      const grade = parseInt(classData.abbrev.match(/^(\d+)/)[1]);
      const newClass = await prisma.class.create({
        data: {
          name: classData.abbrev,
          grade: grade
        }
      });
      
      // Create external reference
      await prisma.externalRef.create({
        data: {
          type: 'class',
          externalId: classData.id,
          internalId: newClass.id,
          metadata: {
            bakalariClassId: classData.id,
            bakalariClassAbbrev: classData.abbrev
          }
        }
      });
      
      classes.push({ ...newClass, externalId: classData.id });
      console.log(`  ✅ Created class: ${classData.abbrev} (ID: ${newClass.id})`);
    }
    
    // Create subjects
    console.log('📖 Creating subjects...');
    const subjects = [];
    for (const subjectData of mockData.subjects) {
      const newSubject = await prisma.subject.create({
        data: {
          name: subjectData.name,
          code: subjectData.code
        }
      });
      
      // Create external reference
      await prisma.externalRef.create({
        data: {
          type: 'subject',
          externalId: subjectData.id,
          internalId: newSubject.id,
          metadata: {
            bakalariSubjectId: subjectData.id,
            bakalariSubjectCode: subjectData.code
          }
        }
      });
      
      subjects.push({ ...newSubject, externalId: subjectData.id });
      console.log(`  ✅ Created subject: ${subjectData.name} (${subjectData.code})`);
    }
    
    // Create users
    console.log('👥 Creating users...');
    const users = [];
    for (const userData of mockData.users) {
      // Find class for students
      let classId = null;
      if (userData.classId) {
        const classRef = await prisma.externalRef.findFirst({
          where: {
            type: 'class',
            externalId: userData.classId
          }
        });
        if (classRef) {
          classId = classRef.internalId;
        }
      }
      
      const userRole = userData.userType === 'student' ? 'STUDENT' : 'TEACHER';
      
      const newUser = await prisma.user.create({
        data: {
          email: `${userData.userID}@bakalari.local`,
          name: userData.fullUserName,
          role: userRole,
          bakalariId: userData.userID,
          classId: classId
        }
      });
      
      // Create external reference
      await prisma.externalRef.create({
        data: {
          type: 'user',
          externalId: userData.userID,
          internalId: newUser.id,
          metadata: {
            bakalariUserId: userData.userID,
            bakalariUserType: userData.userType
          }
        }
      });
      
      users.push({ ...newUser, externalId: userData.userID, subjects: userData.subjects });
      console.log(`  ✅ Created user: ${userData.fullUserName} (${userData.userType})`);
    }
    
    // Create enrollments
    console.log('📝 Creating enrollments...');
    for (const user of users) {
      if (user.role === 'STUDENT' && user.subjects) {
        for (const subjectData of user.subjects) {
          // Find subject
          const subjectRef = await prisma.externalRef.findFirst({
            where: {
              type: 'subject',
              externalId: subjectData.id
            }
          });
          
          if (subjectRef) {
            const newEnrollment = await prisma.enrollment.create({
              data: {
                userId: user.id,
                subjectId: subjectRef.internalId,
                classId: user.classId
              }
            });
            
            // Create external reference
            const enrollmentExternalId = `${user.id}-${subjectRef.internalId}`;
            await prisma.externalRef.create({
              data: {
                type: 'enrollment',
                externalId: enrollmentExternalId,
                internalId: newEnrollment.id,
                metadata: {
                  userId: user.id,
                  subjectId: subjectRef.internalId,
                  classId: user.classId
                }
              }
            });
            
            console.log(`  ✅ Created enrollment: ${user.name} in ${subjectData.name}`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n📊 Seeding Summary:');
    const classCount = await prisma.class.count();
    const subjectCount = await prisma.subject.count();
    const userCount = await prisma.user.count();
    const enrollmentCount = await prisma.enrollment.count();
    const externalRefCount = await prisma.externalRef.count();
    
    console.log(`  Classes: ${classCount}`);
    console.log(`  Subjects: ${subjectCount}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Enrollments: ${enrollmentCount}`);
    console.log(`  External References: ${externalRefCount}`);
    
    console.log('\n✅ Mock data seeding completed successfully!');
    console.log('\n🎯 You can now test the idempotent sync with:');
    console.log('   node ops/demo-idempotent-sync.js');
    
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedMockData().catch((error) => {
  console.error('Failed to seed mock data:', error);
  process.exit(1);
});

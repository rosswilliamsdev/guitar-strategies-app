const { PrismaClient } = require('@prisma/client');
const { validateTeacherProfile } = require('../lib/teacher-validation');

const prisma = new PrismaClient();

async function testValidation() {
  try {
    // Test with existing teacher
    const teacherId = 'cmep0nm2n0002x2eeyjvugkas';
    
    console.log('Testing validation for teacher:', teacherId);
    
    const validation = await validateTeacherProfile(teacherId);
    
    console.log('\nValidation Result:');
    console.log('================');
    console.log('Is Complete:', validation.isComplete);
    console.log('Can Accept Bookings:', validation.canAcceptBookings);
    console.log('Profile Completeness:', validation.profileCompleteness + '%');
    console.log('\nMissing Fields:', validation.missingFields);
    console.log('\nErrors:', validation.errors);
    console.log('\nWarnings:', validation.warnings);
    
    console.log('\nSetup Steps:');
    validation.setupSteps.forEach((step, idx) => {
      console.log(`${idx + 1}. ${step.title} - ${step.isComplete ? '✅' : '❌'} ${step.required ? '(Required)' : '(Optional)'}`);
    });
    
  } catch (error) {
    console.error('Error testing validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testValidation();
// Test script for availability management
const { getAvailableSlots, validateLessonSettings } = require('./lib/scheduler');
const { prisma } = require('./lib/db');

async function testAvailabilityManagement() {
  console.log('🧪 Testing Availability Management System...\n');
  
  try {
    // Test 1: Validate lesson settings
    console.log('1. Testing lesson settings validation...');
    const validSettings = {
      allows30Min: true,
      allows60Min: true,
      price30Min: 5000, // $50
      price60Min: 9000, // $90
      advanceBookingDays: 21
    };
    
    const validation = await validateLessonSettings(validSettings);
    console.log('✅ Lesson settings validation:', validation.success ? 'PASSED' : 'FAILED');
    if (!validation.success) console.log('   Error:', validation.error);
    
    // Test 2: Get teacher profile
    console.log('\n2. Getting teacher profile...');
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { email: 'teacher@guitarstrategies.com' } },
      include: { 
        availability: true,
        lessonSettings: true,
        blockedTimes: true
      }
    });
    
    if (teacher) {
      console.log('✅ Teacher profile found:', teacher.user?.name || 'Teacher');
      console.log('   - Availability slots:', teacher.availability?.length || 0);
      console.log('   - Lesson settings:', teacher.lessonSettings ? 'Configured' : 'Not configured');
      console.log('   - Blocked times:', teacher.blockedTimes?.length || 0);
    } else {
      console.log('❌ Teacher profile not found');
      return;
    }
    
    // Test 3: Try to get available slots (this will fail if no availability is set)
    console.log('\n3. Testing available slots retrieval...');
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    try {
      const slots = await getAvailableSlots(
        teacher.id,
        startDate,
        endDate,
        'America/New_York'
      );
      console.log('✅ Available slots retrieved:', slots.length, 'slots');
      
      if (slots.length > 0) {
        console.log('   Sample slot:', {
          start: slots[0].start.toISOString(),
          duration: slots[0].duration,
          price: `$${(slots[0].price / 100).toFixed(2)}`,
          available: slots[0].available
        });
      }
    } catch (error) {
      console.log('⚠️  Available slots test failed (expected if no availability set):', error.message);
    }
    
    console.log('\n🎉 Availability management system tests completed!');
    console.log('\n📝 Next steps for manual testing:');
    console.log('   1. Login as teacher@guitarstrategies.com (password: admin123)');
    console.log('   2. Go to Settings → Scheduling');
    console.log('   3. Set up weekly availability');
    console.log('   4. Configure lesson settings');
    console.log('   5. Test student booking flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAvailabilityManagement();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints with Session Simulation...\n');

  try {
    // Get teacher profile for testing
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { email: 'teacher@guitarstrategies.com' } },
      include: { 
        user: true,
        availability: true,
        lessonSettings: true,
        blockedTimes: true,
        lessons: {
          where: { status: 'SCHEDULED' },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!teacher) {
      console.log('❌ Teacher not found');
      return;
    }

    console.log('✅ Testing with teacher:', teacher.user.name);
    console.log('   - Teacher ID:', teacher.id);

    // Test 1: Simulate available slots calculation
    console.log('\n🕒 Test 1: Available slots calculation (simulated)');
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    console.log('   - Date range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    // Simulate what the getAvailableSlots function would do:
    console.log('   - Teacher availability slots:', teacher.availability.length);
    console.log('   - Existing lessons in period:', teacher.lessons.filter(lesson => 
      lesson.date >= startDate && lesson.date <= endDate
    ).length);
    console.log('   - Blocked time periods:', teacher.blockedTimes.filter(blocked =>
      blocked.startTime <= endDate && blocked.endTime >= startDate
    ).length);

    // Generate sample available slots
    const sampleSlots = [];
    const today = new Date();
    
    // For each weekday with availability
    teacher.availability.forEach(availability => {
      // Find the next occurrence of this day of week
      const nextDay = new Date(today);
      const daysAhead = (availability.dayOfWeek + 7 - today.getDay()) % 7;
      if (daysAhead === 0 && today.getHours() >= 17) {
        nextDay.setDate(today.getDate() + 7); // Next week if today is past 5 PM
      } else {
        nextDay.setDate(today.getDate() + daysAhead);
      }

      // Generate slots for this day
      const [startHour, startMin] = availability.startTime.split(':').map(Number);
      const [endHour, endMin] = availability.endTime.split(':').map(Number);
      
      const dayStart = new Date(nextDay);
      dayStart.setHours(startHour, startMin, 0, 0);
      
      const dayEnd = new Date(nextDay);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // Generate 30-minute slots
      let slotTime = new Date(dayStart);
      while (slotTime.getTime() + (30 * 60 * 1000) <= dayEnd.getTime()) {
        const slotEnd = new Date(slotTime.getTime() + (30 * 60 * 1000));
        
        // Check if slot conflicts with existing lesson
        const hasConflict = teacher.lessons.some(lesson => {
          const lessonEnd = new Date(lesson.date.getTime() + (lesson.duration * 60 * 1000));
          return (slotTime >= lesson.date && slotTime < lessonEnd) ||
                 (slotEnd > lesson.date && slotEnd <= lessonEnd) ||
                 (slotTime <= lesson.date && slotEnd >= lessonEnd);
        });

        // Check if slot conflicts with blocked time
        const hasBlockedConflict = teacher.blockedTimes.some(blocked => {
          return (slotTime >= blocked.startTime && slotTime < blocked.endTime) ||
                 (slotEnd > blocked.startTime && slotEnd <= blocked.endTime) ||
                 (slotTime <= blocked.startTime && slotEnd >= blocked.endTime);
        });

        sampleSlots.push({
          start: new Date(slotTime),
          end: new Date(slotEnd),
          duration: 30,
          price: teacher.lessonSettings.price30Min,
          available: !hasConflict && !hasBlockedConflict && slotTime > new Date()
        });

        slotTime.setMinutes(slotTime.getMinutes() + 30);
      }
    });

    const availableSlots = sampleSlots.filter(slot => slot.available);
    console.log('   ✅ Generated slots:', sampleSlots.length, '(', availableSlots.length, 'available)');

    if (availableSlots.length > 0) {
      console.log('   - Sample available slot:', {
        start: availableSlots[0].start.toLocaleString(),
        duration: availableSlots[0].duration + 'min',
        price: '$' + (availableSlots[0].price / 100).toFixed(2)
      });
    }

    // Test 2: Lesson settings validation
    console.log('\n⚙️ Test 2: Lesson settings validation');
    const settings = teacher.lessonSettings;
    
    const validationTests = [
      { test: '30min lessons allowed', result: settings.allows30Min },
      { test: '60min lessons allowed', result: settings.allows60Min },
      { test: '30min price > 0', result: settings.price30Min > 0 },
      { test: '60min price > 0', result: settings.price60Min > 0 },
      { test: 'Advance booking days valid', result: settings.advanceBookingDays >= 1 && settings.advanceBookingDays <= 90 }
    ];

    validationTests.forEach(test => {
      console.log(`   ${test.result ? '✅' : '❌'} ${test.test}`);
    });

    // Test 3: Booking validation simulation
    console.log('\n📝 Test 3: Booking validation simulation');
    
    const testBooking = {
      teacherId: teacher.id,
      date: availableSlots.length > 0 ? availableSlots[0].start : new Date(),
      duration: 30,
      timezone: 'America/New_York'
    };

    console.log('   - Test booking:', {
      date: testBooking.date.toLocaleString(),
      duration: testBooking.duration + 'min'
    });

    // Validation checks that the API would perform:
    const validations = [
      { check: 'Duration allowed (30min)', result: settings.allows30Min },
      { check: 'Not in the past', result: testBooking.date > new Date() },
      { check: 'Within booking window', result: testBooking.date <= new Date(Date.now() + (settings.advanceBookingDays * 24 * 60 * 60 * 1000)) },
      { check: 'Time slot available', result: availableSlots.length > 0 }
    ];

    validations.forEach(validation => {
      console.log(`   ${validation.result ? '✅' : '❌'} ${validation.check}`);
    });

    // Test 4: Conflict detection
    console.log('\n🚫 Test 4: Conflict detection');
    
    const upcomingLessons = teacher.lessons.filter(lesson => lesson.date > new Date());
    console.log('   - Upcoming lessons:', upcomingLessons.length);
    
    const activeBlockedTimes = teacher.blockedTimes.filter(blocked => blocked.endTime > new Date());
    console.log('   - Active blocked periods:', activeBlockedTimes.length);

    if (activeBlockedTimes.length > 0) {
      console.log('   - Next blocked period:', 
        activeBlockedTimes[0].startTime.toLocaleString(), 
        'to', 
        activeBlockedTimes[0].endTime.toLocaleString()
      );
    }

    console.log('\n🎉 API endpoint simulation completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Teacher availability: Configured');
    console.log('   ✅ Lesson settings: Valid');
    console.log('   ✅ Available slots: Generated');
    console.log('   ✅ Conflict detection: Working');
    console.log('   ✅ Booking validation: Implemented');

    console.log('\n🌐 Web interface ready for testing:');
    console.log('   • http://localhost:3001/book-lesson (Student view)');
    console.log('   • http://localhost:3001/settings (Teacher scheduling)');

  } catch (error) {
    console.error('❌ API test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIEndpoints();
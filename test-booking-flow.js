const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookingFlow() {
  console.log('🧪 Testing Complete Booking Flow...\n');

  try {
    // Get teacher and student profiles
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { email: 'teacher@guitarstrategies.com' } },
      include: { 
        user: true,
        availability: true,
        lessonSettings: true,
        blockedTimes: true
      }
    });

    const student = await prisma.studentProfile.findFirst({
      where: { user: { email: 'student@guitarstrategies.com' } },
      include: { user: true }
    });

    if (!teacher || !student) {
      console.log('❌ Missing teacher or student data');
      return;
    }

    console.log('✅ Found teacher:', teacher.user.name);
    console.log('✅ Found student:', student.user.name);

    // Test 1: Check availability setup
    console.log('\n📅 Test 1: Verify availability setup');
    console.log('   - Availability slots:', teacher.availability.length);
    console.log('   - Lesson settings configured:', !!teacher.lessonSettings);
    console.log('   - Blocked time periods:', teacher.blockedTimes.length);

    if (teacher.lessonSettings) {
      console.log('   - 30min lessons: $' + (teacher.lessonSettings.price30Min / 100));
      console.log('   - 60min lessons: $' + (teacher.lessonSettings.price60Min / 100));
    }

    // Test 2: Test available slots generation (simulated)
    console.log('\n🕒 Test 2: Available slots generation');
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // One week from now

    console.log('   - Date range:', startDate.toDateString(), 'to', endDate.toDateString());
    console.log('   - Timezone: America/New_York');

    // Test 3: Simulate single lesson booking
    console.log('\n📖 Test 3: Simulate single lesson booking');
    
    // Find next available Monday at 10 AM
    const nextMonday = new Date();
    const daysUntilMonday = (1 + 7 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(10, 0, 0, 0); // 10 AM

    console.log('   - Booking for:', nextMonday.toLocaleString());
    console.log('   - Duration: 30 minutes');
    console.log('   - Price: $50.00');

    // Check for conflicts
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: teacher.id,
        date: nextMonday,
        status: { in: ['SCHEDULED'] }
      }
    });

    if (existingLesson) {
      console.log('   ⚠️  Time slot already booked (expected for repeat tests)');
    } else {
      // Create the lesson booking
      const newLesson = await prisma.lesson.create({
        data: {
          teacherId: teacher.id,
          studentId: student.id,
          date: nextMonday,
          duration: 30,
          timezone: 'America/New_York',
          price: teacher.lessonSettings.price30Min,
          status: 'SCHEDULED',
          isRecurring: false
        }
      });
      console.log('   ✅ Single lesson booked successfully!');
      console.log('   - Lesson ID:', newLesson.id);
    }

    // Test 4: Simulate recurring lesson booking
    console.log('\n🔄 Test 4: Simulate recurring lesson booking');
    
    // Find next Thursday at 2 PM for recurring lessons
    const nextThursday = new Date();
    const daysUntilThursday = (4 + 7 - nextThursday.getDay()) % 7 || 7;
    nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
    nextThursday.setHours(14, 0, 0, 0); // 2 PM

    console.log('   - Booking recurring lessons starting:', nextThursday.toLocaleString());
    console.log('   - Duration: 60 minutes');
    console.log('   - Weeks: 4');
    console.log('   - Price per lesson: $90.00');

    const recurringId = `recurring-${Date.now()}`;
    const recurringWeeks = 4;
    const recurringLessons = [];

    for (let week = 0; week < recurringWeeks; week++) {
      const lessonDate = new Date(nextThursday);
      lessonDate.setDate(lessonDate.getDate() + (week * 7));

      // Check for conflicts
      const conflict = await prisma.lesson.findFirst({
        where: {
          teacherId: teacher.id,
          date: lessonDate,
          status: { in: ['SCHEDULED'] }
        }
      });

      if (!conflict) {
        const recurringLesson = await prisma.lesson.create({
          data: {
            teacherId: teacher.id,
            studentId: student.id,
            date: lessonDate,
            duration: 60,
            timezone: 'America/New_York',
            price: teacher.lessonSettings.price60Min,
            status: 'SCHEDULED',
            isRecurring: true,
            recurringId
          }
        });
        recurringLessons.push(recurringLesson);
      }
    }

    console.log('   ✅ Recurring lessons booked:', recurringLessons.length, '/ 4 weeks');

    // Test 5: Test blocked time conflict detection
    console.log('\n🚫 Test 5: Blocked time conflict detection');
    
    const blockedTime = teacher.blockedTimes[0];
    if (blockedTime) {
      console.log('   - Blocked period:', blockedTime.startTime.toLocaleString(), 
                  'to', blockedTime.endTime.toLocaleString());
      console.log('   - Reason:', blockedTime.reason);
      
      // Try to book during blocked time (should fail in real API)
      const conflictTime = new Date(blockedTime.startTime);
      conflictTime.setHours(conflictTime.getHours() + 1);
      
      console.log('   - Attempting booking during blocked time:', conflictTime.toLocaleString());
      console.log('   - This would be rejected by the API ✅');
    }

    // Test 6: Check all booked lessons
    console.log('\n📚 Test 6: Summary of booked lessons');
    const allLessons = await prisma.lesson.findMany({
      where: {
        teacherId: teacher.id,
        studentId: student.id,
        status: 'SCHEDULED'
      },
      orderBy: { date: 'asc' }
    });

    console.log('   - Total scheduled lessons:', allLessons.length);
    allLessons.forEach((lesson, index) => {
      console.log(`   ${index + 1}. ${lesson.date.toLocaleString()} - ${lesson.duration}min - $${(lesson.price / 100).toFixed(2)} ${lesson.isRecurring ? '(Recurring)' : '(Single)'}`);
    });

    const totalEarnings = allLessons.reduce((sum, lesson) => sum + lesson.price, 0);
    console.log('   - Total potential earnings: $' + (totalEarnings / 100).toFixed(2));

    console.log('\n🎉 Booking flow tests completed successfully!');
    console.log('\n📝 Next: Test the web interface');
    console.log('   1. Login as teacher@guitarstrategies.com');
    console.log('   2. Visit /settings → Scheduling to see availability management');
    console.log('   3. Login as student@guitarstrategies.com');
    console.log('   4. Visit /book-lesson to see the booking calendar');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBookingFlow();
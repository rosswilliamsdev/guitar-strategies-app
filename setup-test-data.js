const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestData() {
  console.log('🧪 Setting up test data for availability management...\n');

  try {
    // Get the teacher profile
    const teacher = await prisma.teacherProfile.findFirst({
      where: { user: { email: 'teacher@guitarstrategies.com' } },
      include: { user: true }
    });

    if (!teacher) {
      console.log('❌ Teacher not found');
      return;
    }

    console.log('✅ Found teacher:', teacher.user.name);

    // 1. Set up lesson settings
    console.log('\n1. Setting up lesson settings...');
    await prisma.teacherLessonSettings.upsert({
      where: { teacherId: teacher.id },
      update: {
        allows30Min: true,
        allows60Min: true,
        price30Min: 5000, // $50.00
        price60Min: 9000, // $90.00
        advanceBookingDays: 21
      },
      create: {
        teacherId: teacher.id,
        allows30Min: true,
        allows60Min: true,
        price30Min: 5000, // $50.00
        price60Min: 9000, // $90.00
        advanceBookingDays: 21
      }
    });
    console.log('✅ Lesson settings configured: 30min ($50), 60min ($90)');

    // 2. Set up weekly availability (Monday-Friday, 9 AM - 5 PM)
    console.log('\n2. Setting up weekly availability...');
    
    // Clear existing availability
    await prisma.teacherAvailability.deleteMany({
      where: { teacherId: teacher.id }
    });

    // Add availability for weekdays
    const weekDays = [1, 2, 3, 4, 5]; // Monday-Friday
    for (const day of weekDays) {
      await prisma.teacherAvailability.create({
        data: {
          teacherId: teacher.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        }
      });
    }
    console.log('✅ Available Monday-Friday, 9 AM - 5 PM');

    // 3. Add a blocked time period (this weekend)
    console.log('\n3. Adding blocked time for testing...');
    const thisWeekend = new Date();
    thisWeekend.setDate(thisWeekend.getDate() + (6 - thisWeekend.getDay())); // Next Saturday
    thisWeekend.setHours(10, 0, 0, 0);
    
    const weekendEnd = new Date(thisWeekend);
    weekendEnd.setDate(weekendEnd.getDate() + 1); // Sunday
    weekendEnd.setHours(15, 0, 0, 0);

    await prisma.teacherBlockedTime.create({
      data: {
        teacherId: teacher.id,
        startTime: thisWeekend,
        endTime: weekendEnd,
        reason: 'Weekend vacation - Testing blocked time'
      }
    });
    console.log('✅ Blocked weekend time for testing');

    // 4. Verify student-teacher relationship
    console.log('\n4. Verifying student-teacher relationship...');
    const student = await prisma.studentProfile.findFirst({
      where: { user: { email: 'student@guitarstrategies.com' } },
      include: { user: true, teacher: { include: { user: true } } }
    });

    if (student && student.teacherId === teacher.id) {
      console.log('✅ Student is assigned to teacher:', student.teacher.user.name);
    } else {
      console.log('⚠️  Assigning student to teacher...');
      if (student) {
        await prisma.studentProfile.update({
          where: { id: student.id },
          data: { teacherId: teacher.id }
        });
        console.log('✅ Student assigned to teacher');
      }
    }

    console.log('\n🎉 Test data setup completed!');
    console.log('\n📝 Ready for testing:');
    console.log('   1. Teacher can manage availability at: /settings (Scheduling tab)');
    console.log('   2. Student can book lessons at: /book-lesson');
    console.log('   3. Available Mon-Fri 9AM-5PM, $50/30min, $90/60min');
    console.log('   4. Weekend blocked for testing conflict detection');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
import { prisma } from '../lib/db';

async function checkAvailability() {
  try {
    // Find the teacher profile
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        user: {
          email: 'rwillguitar@gmail.com'
        }
      },
      include: {
        availability: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    });

    if (!teacher) {
      console.log('Teacher not found');
      return;
    }

    console.log('\n=== Teacher Availability ===');
    console.log('Teacher ID:', teacher.id);
    console.log('User ID:', teacher.userId);
    console.log('\nAvailability Slots:');

    if (teacher.availability.length === 0) {
      console.log('No availability slots found');
    } else {
      teacher.availability.forEach((slot, index) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`\n${index + 1}. ${days[slot.dayOfWeek]}`);
        console.log(`   Time: ${slot.startTime} - ${slot.endTime}`);
        console.log(`   Active: ${slot.isActive}`);
        console.log(`   ID: ${slot.id}`);
        console.log(`   Created: ${slot.createdAt}`);
        console.log(`   Updated: ${slot.updatedAt}`);
      });
    }

    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailability();

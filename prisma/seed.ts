// ========================================
// FILE: prisma/seed.ts (Database Seed Script)
// ========================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // User configurations
  const adminEmail = 'admin@guitarstrategies.com';
  const teacherEmail = 'teacher@guitarstrategies.com';
  const studentEmail = 'student@guitarstrategies.com';
  const password = 'admin123'; // Same password for all for testing
  
  const adminName = 'System Administrator';
  const teacherName = 'John Smith';
  const studentName = 'Sarah Johnson';

  try {
    // Hash the password once (same salt rounds as auth.ts)
    console.log('🔐 Hashing passwords...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    let adminUser;
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', adminEmail);
      adminUser = existingAdmin;
    } else {
      // Create admin user
      console.log('👤 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN'
        }
      });
      console.log('🎉 Admin user created successfully!');
    }

    // Check if teacher user already exists
    const existingTeacher = await prisma.user.findUnique({
      where: { email: teacherEmail },
      include: { teacherProfile: true }
    });

    let teacherUser;
    if (existingTeacher) {
      console.log('✅ Teacher user already exists:', teacherEmail);
      teacherUser = existingTeacher;
    } else {
      // Create teacher user with profile
      console.log('👨‍🏫 Creating teacher user...');
      teacherUser = await prisma.user.create({
        data: {
          email: teacherEmail,
          password: hashedPassword,
          name: teacherName,
          role: 'TEACHER',
          teacherProfile: {
            create: {
              bio: 'Experienced guitar instructor with 10+ years of teaching experience. Specializes in acoustic, electric, and classical guitar styles.',
              hourlyRate: 6000, // $60.00 in cents
              isActive: true,
              timezone: 'America/New_York'
            }
          }
        },
        include: {
          teacherProfile: true
        }
      });
      console.log('🎉 Teacher user created successfully!');
    }

    // Check if student user already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfile: true }
    });

    let studentUser;
    if (existingStudent) {
      console.log('✅ Student user already exists:', studentEmail);
      studentUser = existingStudent;
    } else {
      // Create student user with profile assigned to teacher
      console.log('🎓 Creating student user...');
      studentUser = await prisma.user.create({
        data: {
          email: studentEmail,
          password: hashedPassword,
          name: studentName,
          role: 'STUDENT',
          studentProfile: {
            create: {
              teacherId: teacherUser.teacherProfile!.id,
              goals: 'Learn to play acoustic guitar and improve fingerpicking technique. Interested in folk and indie music styles.',
              instrument: 'guitar',
              phoneNumber: '+1-555-0123',
              isActive: true
            }
          }
        },
        include: {
          studentProfile: true
        }
      });
      console.log('🎉 Student user created successfully!');
    }

    // Display credentials
    console.log('\n📋 Development Accounts:');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ ADMIN ACCOUNT                           │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ 📧 Email: ${adminUser.email.padEnd(25)} │`);
    console.log(`│ 🔑 Password: admin123                   │`);
    console.log(`│ 👑 Role: ${adminUser.role.padEnd(28)} │`);
    console.log('└─────────────────────────────────────────┘');
    
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ TEACHER ACCOUNT                         │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ 📧 Email: ${teacherUser.email.padEnd(24)} │`);
    console.log(`│ 🔑 Password: admin123                   │`);
    console.log(`│ 👨‍🏫 Role: ${teacherUser.role.padEnd(28)} │`);
    if (teacherUser.teacherProfile) {
      console.log(`│ 💰 Rate: $${(teacherUser.teacherProfile.hourlyRate! / 100).toFixed(2)}/hour${' '.repeat(18)} │`);
    }
    console.log('└─────────────────────────────────────────┘');

    console.log('┌─────────────────────────────────────────┐');
    console.log('│ STUDENT ACCOUNT                         │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ 📧 Email: ${studentUser.email.padEnd(24)} │`);
    console.log(`│ 🔑 Password: admin123                   │`);
    console.log(`│ 🎓 Role: ${studentUser.role.padEnd(28)} │`);
    if (studentUser.studentProfile) {
      console.log(`│ 👨‍🏫 Teacher: ${teacherName.padEnd(23)} │`);
    }
    console.log('└─────────────────────────────────────────┘');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
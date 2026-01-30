// ========================================
// FILE: prisma/seed.ts (Database Seed Script)
// ========================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { log, dbLog, emailLog } from '@/lib/logger';

const prisma = new PrismaClient();

async function main() {
  log.info('🌱 Starting database seed...');

  // User configurations
  const adminEmail = 'admin@guitarstrategies.com';
  const teacherEmail = 'teacher@guitarstrategies.com';
  const studentEmail = 'student@guitarstrategies.com';
  const parentEmail = 'parent@guitarstrategies.com';
  const password = 'admin123'; // Same password for all for testing

  const adminName = 'System Administrator';
  const teacherName = 'John Smith';
  const studentName = 'Sarah Johnson';
  const parentName = 'Maria Garcia';

  try {
    // Hash the password once (same salt rounds as auth.ts)
    log.info('🔐 Hashing passwords...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    let adminUser;
    if (existingAdmin) {
      log.info('✅ Admin user already exists', { email: adminEmail });
      adminUser = existingAdmin;
    } else {
      // Create admin user
      log.info('👤 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN'
        }
      });
      log.info('🎉 Admin user created successfully!');
    }

    // Check if teacher user already exists
    const existingTeacher = await prisma.user.findUnique({
      where: { email: teacherEmail },
      include: { teacherProfile: true }
    });

    let teacherUser;
    if (existingTeacher) {
      log.info('✅ Teacher user already exists', { email: teacherEmail });
      teacherUser = existingTeacher;
    } else {
      // Create teacher user with profile
      log.info('👨‍🏫 Creating teacher user...');
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
              isAdmin: true, // All teachers have admin access
              timezone: 'America/Chicago'
            }
          }
        },
        include: {
          teacherProfile: true
        }
      });
      log.info('🎉 Teacher user created successfully!');
    }

    // Check if student user already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfiles: true }
    });

    let studentUser;
    if (existingStudent) {
      log.info('✅ Student user already exists', { email: studentEmail });
      studentUser = existingStudent;
    } else {
      // Create student user with profile assigned to teacher
      log.info('🎓 Creating student user...');
      studentUser = await prisma.user.create({
        data: {
          email: studentEmail,
          password: hashedPassword,
          name: studentName,
          role: 'STUDENT',
          accountType: 'INDIVIDUAL',
          studentProfiles: {
            create: {
              teacherId: teacherUser.teacherProfile!.id,
              profileName: studentName,
              goals: 'Learn to play acoustic guitar and improve fingerpicking technique. Interested in folk and indie music styles.',
              instrument: 'guitar',
              phoneNumber: '+1-555-0123',
              isActive: true
            }
          }
        },
        include: {
          studentProfiles: true
        }
      });
      log.info('🎉 Student user created successfully!');
    }

    // Display credentials
    log.info('\n📋 Development Accounts:');
    log.info('┌─────────────────────────────────────────┐');
    log.info('│ ADMIN ACCOUNT                           │');
    log.info('├─────────────────────────────────────────┤');
    log.info('│ 📧 Email: ${adminUser.email.padEnd(25)} │');
    log.info('│ 🔑 Password: admin123                   │');
    log.info('│ 👑 Role: ${adminUser.role.padEnd(28)} │');
    log.info('└─────────────────────────────────────────┘');
    
    log.info('┌─────────────────────────────────────────┐');
    log.info('│ TEACHER ACCOUNT                         │');
    log.info('├─────────────────────────────────────────┤');
    log.info('│ 📧 Email: ${teacherUser.email.padEnd(24)} │');
    log.info('│ 🔑 Password: admin123                   │');
    log.info('│ 👨‍🏫 Role: ${teacherUser.role.padEnd(28)} │');
    if (teacherUser.teacherProfile) {
      log.info(`│ 💰 Rate: $${(teacherUser.teacherProfile.hourlyRate! / 100).toFixed(2)}/hour${' '.repeat(18)} │`);
    }
    log.info('└─────────────────────────────────────────┘');

    log.info('┌─────────────────────────────────────────┐');
    log.info('│ STUDENT ACCOUNT                         │');
    log.info('├─────────────────────────────────────────┤');
    log.info('│ 📧 Email: ${studentUser.email.padEnd(24)} │');
    log.info('│ 🔑 Password: admin123                   │');
    log.info('│ 🎓 Role: ${studentUser.role.padEnd(28)} │');
    if (studentUser.studentProfile) {
      log.info('│ 👨‍🏫 Teacher: ${teacherName.padEnd(23)} │');
    }
    log.info('└─────────────────────────────────────────┘');

    // Check if family account already exists
    const existingParent = await prisma.user.findUnique({
      where: { email: parentEmail },
      include: { studentProfiles: true }
    });

    let parentUser;
    if (existingParent) {
      log.info('✅ Family account already exists', { email: parentEmail });
      parentUser = existingParent;
    } else {
      // Create family account with multiple children
      log.info('👨‍👩‍👧‍👦 Creating family account with multiple children...');
      parentUser = await prisma.user.create({
        data: {
          email: parentEmail,
          password: hashedPassword,
          name: parentName,
          role: 'STUDENT',
          accountType: 'FAMILY',
          studentProfiles: {
            create: [
              {
                teacherId: teacherUser.teacherProfile!.id,
                profileName: 'Johnny Garcia',
                goals: 'Learn basic chords and strumming patterns. Loves pop music.',
                instrument: 'guitar',
                phoneNumber: '+1-555-0456',
                isActive: true
              },
              {
                teacherId: teacherUser.teacherProfile!.id,
                profileName: 'Sarah Garcia',
                goals: 'Improve lead guitar techniques and learn rock solos.',
                instrument: 'guitar',
                phoneNumber: '+1-555-0456',
                isActive: true
              }
            ]
          }
        },
        include: {
          studentProfiles: true
        }
      });
      log.info('🎉 Family account created successfully!');
    }

    // Display family account info
    log.info('┌─────────────────────────────────────────┐');
    log.info('│ FAMILY ACCOUNT                          │');
    log.info('├─────────────────────────────────────────┤');
    log.info(`│ 📧 Email: ${parentUser.email.padEnd(24)} │`);
    log.info('│ 🔑 Password: admin123                   │');
    log.info(`│ 👨‍👩‍👧‍👦 Type: ${parentUser.accountType.padEnd(28)} │`);
    log.info(`│ 👥 Children: ${parentUser.studentProfiles.length.toString().padEnd(26)} │`);
    log.info('│   • Johnny Garcia (age 10, beginner)   │');
    log.info('│   • Sarah Garcia (age 12, intermediate)│');
    log.info('└─────────────────────────────────────────┘');

  } catch (error) {
    log.error('❌ Error seeding database:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    throw error;
  }
}

main()
  .catch((e) => {
    log.error('❌ Seed failed:', {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
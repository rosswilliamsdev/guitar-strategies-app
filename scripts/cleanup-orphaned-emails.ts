import { prisma } from '../lib/db';
import bcrypt from 'bcrypt';

async function cleanupOrphanedEmails() {
  const emailsToCleanup = [
    'rossw.dev@gmail.com',
    'wildeyebooking@gmail.com'
  ];

  console.log('🧹 Cleaning Up Orphaned Email Data');
  console.log('='.repeat(50));

  for (const email of emailsToCleanup) {
    try {
      console.log(`\n📧 Processing: ${email}`);
      console.log('-'.repeat(50));

      // Step 1: Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        console.log(`⚠️  User already exists with this email`);
        console.log(`   Skipping - delete manually via admin panel if needed`);
        continue;
      }

      // Step 2: Check for orphaned data
      const orphanedToken = await prisma.verificationToken.findFirst({
        where: { identifier: email },
      });

      const orphanedPreferences = await prisma.emailPreference.findMany({
        where: {
          user: {
            email: email,
          },
        },
      });

      if (!orphanedToken && orphanedPreferences.length === 0) {
        console.log(`✅ No orphaned data found - email is clean!`);
        continue;
      }

      console.log(`🔍 Found orphaned data:`);
      if (orphanedToken) {
        console.log(`   - VerificationToken: ${orphanedToken.token.substring(0, 20)}...`);
      }
      if (orphanedPreferences.length > 0) {
        console.log(`   - EmailPreferences: ${orphanedPreferences.length} record(s)`);
      }

      // Step 3: Create temporary user to trigger cleanup
      console.log(`\n🔨 Creating temporary user...`);
      const hashedPassword = await bcrypt.hash('TempPassword123!', 10);

      // Get a valid teacher ID
      const teacher = await prisma.teacherProfile.findFirst({
        select: { id: true },
      });

      if (!teacher) {
        console.log(`❌ No teacher found in database - cannot create student`);
        continue;
      }

      const tempUser = await prisma.user.create({
        data: {
          email: email,
          password: hashedPassword,
          name: 'Temporary Cleanup User',
          role: 'STUDENT',
          studentProfile: {
            create: {
              teacherId: teacher.id,
              instrument: 'guitar',
            },
          },
        },
      });

      console.log(`✅ Temporary user created: ${tempUser.id}`);

      // Step 4: Delete the temporary user (triggering orphaned data cleanup)
      console.log(`\n🗑️  Deleting temporary user and all related data...`);

      await prisma.$transaction(async (tx) => {
        // Use the same deletion pattern from the fixed endpoint
        await tx.verificationToken.deleteMany({
          where: { identifier: email },
        });

        await tx.account.deleteMany({
          where: { userId: tempUser.id },
        });

        await tx.session.deleteMany({
          where: { userId: tempUser.id },
        });

        await tx.passwordResetToken.deleteMany({
          where: { userId: tempUser.id },
        });

        await tx.emailPreference.deleteMany({
          where: { userId: tempUser.id },
        });

        // Student-specific cleanup
        await tx.recurringSlot.deleteMany({
          where: { studentId: tempUser.id },
        });

        await tx.lesson.deleteMany({
          where: { studentId: tempUser.id },
        });

        const studentInvoices = await tx.invoice.findMany({
          where: { studentId: tempUser.id },
          select: { id: true },
        });

        if (studentInvoices.length > 0) {
          await tx.invoiceItem.deleteMany({
            where: {
              invoiceId: {
                in: studentInvoices.map(invoice => invoice.id),
              },
            },
          });

          await tx.invoice.deleteMany({
            where: { studentId: tempUser.id },
          });
        }

        const studentChecklists = await tx.studentChecklist.findMany({
          where: { studentId: tempUser.id },
          select: { id: true },
        });

        if (studentChecklists.length > 0) {
          await tx.studentChecklistItem.deleteMany({
            where: {
              checklistId: {
                in: studentChecklists.map(checklist => checklist.id),
              },
            },
          });

          await tx.studentChecklist.deleteMany({
            where: { studentId: tempUser.id },
          });
        }

        await tx.studentProfile.deleteMany({
          where: { userId: tempUser.id },
        });

        await tx.user.delete({
          where: { id: tempUser.id },
        });
      });

      console.log(`✅ Cleanup complete!`);

      // Step 5: Verify cleanup
      console.log(`\n✓ Verifying cleanup...`);
      const remainingToken = await prisma.verificationToken.findFirst({
        where: { identifier: email },
      });

      const remainingPreferences = await prisma.emailPreference.findMany({
        where: {
          user: {
            email: email,
          },
        },
      });

      if (!remainingToken && remainingPreferences.length === 0) {
        console.log(`✅ Email ${email} is now clean and ready for reuse!`);
      } else {
        console.log(`⚠️  Some orphaned data may still remain`);
        if (remainingToken) console.log(`   - VerificationToken still exists`);
        if (remainingPreferences.length > 0) console.log(`   - EmailPreferences still exist: ${remainingPreferences.length}`);
      }

    } catch (error) {
      console.error(`\n❌ Error processing ${email}:`, error instanceof Error ? error.message : error);

      // Cleanup on error
      try {
        await prisma.user.deleteMany({
          where: { email: email, name: 'Temporary Cleanup User' },
        });
        console.log(`🧹 Cleaned up failed temporary user`);
      } catch (cleanupError) {
        console.error(`Failed to cleanup:`, cleanupError);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Orphaned Email Cleanup Complete!');
  console.log('='.repeat(50));
}

cleanupOrphanedEmails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

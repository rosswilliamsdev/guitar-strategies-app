import { prisma } from '../lib/db';
import bcrypt from 'bcrypt';

async function testEmailReuse() {
  const testEmail = 'emailtest@example.com';

  try {
    console.log('🧪 Testing Email Reuse After User Deletion');
    console.log('='.repeat(50));

    // Step 1: Create a test user
    console.log('\n1️⃣  Creating test user...');
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Email Test User',
        role: 'STUDENT',
        studentProfile: {
          create: {
            teacherId: 'cmkueqxla0002x2vp60as851e', // Teacher from seed
            instrument: 'guitar',
          },
        },
      },
    });

    console.log(`✅ User created: ${user.id} (${user.email})`);

    // Step 2: Create some related records that would typically be orphaned
    console.log('\n2️⃣  Creating related records...');

    // Create verification token (the main culprit!)
    await prisma.verificationToken.create({
      data: {
        identifier: testEmail,
        token: 'test-token-123',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅ VerificationToken created');

    // Create email preferences (one for each type for thorough testing)
    await prisma.emailPreference.create({
      data: {
        userId: user.id,
        type: 'LESSON_BOOKING',
        enabled: true,
      },
    });
    await prisma.emailPreference.create({
      data: {
        userId: user.id,
        type: 'INVOICE_GENERATED',
        enabled: true,
      },
    });
    console.log('✅ EmailPreferences created');

    // Step 3: Delete the user using the API endpoint (simulated)
    console.log('\n3️⃣  Deleting user via transaction...');

    await prisma.$transaction(async (tx) => {
      // Use the same deletion pattern from the fixed endpoint
      await tx.verificationToken.deleteMany({
        where: { identifier: testEmail },
      });

      await tx.account.deleteMany({
        where: { userId: user.id },
      });

      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      await tx.emailPreference.deleteMany({
        where: { userId: user.id },
      });

      await tx.studentProfile.deleteMany({
        where: { userId: user.id },
      });

      await tx.user.delete({
        where: { id: user.id },
      });
    });

    console.log('✅ User and all related records deleted');

    // Step 4: Verify no orphaned records
    console.log('\n4️⃣  Verifying cleanup...');

    const orphanedToken = await prisma.verificationToken.findFirst({
      where: { identifier: testEmail },
    });

    const orphanedPreference = await prisma.emailPreference.findFirst({
      where: { userId: user.id },
    });

    if (orphanedToken || orphanedPreference) {
      console.log('❌ Found orphaned records!');
      if (orphanedToken) console.log('   - VerificationToken still exists');
      if (orphanedPreference) console.log('   - EmailPreference still exists');
      throw new Error('Orphaned records found');
    }

    console.log('✅ No orphaned records found');

    // Step 5: Try to create a new user with the same email
    console.log('\n5️⃣  Creating new user with same email...');

    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Email Test User 2',
        role: 'STUDENT',
        studentProfile: {
          create: {
            teacherId: 'cmkueqxla0002x2vp60as851e',
            instrument: 'guitar',
          },
        },
      },
    });

    console.log(`✅ New user created successfully: ${newUser.id} (${newUser.email})`);

    // Cleanup
    console.log('\n6️⃣  Cleaning up test data...');
    await prisma.studentProfile.deleteMany({
      where: { userId: newUser.id },
    });
    await prisma.user.delete({
      where: { id: newUser.id },
    });
    console.log('✅ Test data cleaned up');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SUCCESS! Email can be reused after deletion!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : error);

    // Cleanup on failure
    try {
      await prisma.verificationToken.deleteMany({
        where: { identifier: testEmail },
      });
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
      console.log('🧹 Cleaned up failed test data');
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

testEmailReuse()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

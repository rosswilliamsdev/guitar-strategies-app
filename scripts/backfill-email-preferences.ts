import { prisma } from '../lib/db';
import { ALL_EMAIL_TYPES } from '../lib/email-preferences';

/**
 * One-time script to backfill email preferences for existing users
 *
 * This script:
 * 1. Finds all users in the database
 * 2. For each user, ensures they have all email type preferences
 * 3. Creates missing preferences with enabled: true
 * 4. Updates existing preferences to enabled: true (optional - set UPDATE_EXISTING flag)
 *
 * Run with: npx tsx scripts/backfill-email-preferences.ts
 */

const UPDATE_EXISTING = true; // Set to true to also update existing preferences to enabled: true

async function backfillEmailPreferences() {
  console.log('🔄 Starting Email Preferences Backfill');
  console.log('='.repeat(60));
  console.log(`Update existing preferences: ${UPDATE_EXISTING ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`\n📊 Found ${users.length} users to process\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let usersProcessed = 0;

    for (const user of users) {
      console.log(`\n👤 Processing: ${user.name} (${user.email}) - ${user.role}`);
      console.log('-'.repeat(60));

      // Get existing email preferences for this user
      const existingPreferences = await prisma.emailPreference.findMany({
        where: { userId: user.id },
        select: { type: true, enabled: true },
      });

      const existingTypes = new Set(existingPreferences.map(p => p.type));

      // Track stats for this user
      let userCreated = 0;
      let userUpdated = 0;
      let userSkipped = 0;

      // Create missing preferences
      for (const emailType of ALL_EMAIL_TYPES) {
        if (!existingTypes.has(emailType)) {
          // Create missing preference
          await prisma.emailPreference.create({
            data: {
              userId: user.id,
              type: emailType,
              enabled: true,
            },
          });
          console.log(`  ✅ Created: ${emailType} (enabled: true)`);
          userCreated++;
          totalCreated++;
        } else if (UPDATE_EXISTING) {
          // Check if existing preference needs to be updated
          const existing = existingPreferences.find(p => p.type === emailType);
          if (existing && !existing.enabled) {
            // Update to enabled: true
            await prisma.emailPreference.updateMany({
              where: {
                userId: user.id,
                type: emailType,
              },
              data: {
                enabled: true,
              },
            });
            console.log(`  🔄 Updated: ${emailType} (enabled: false → true)`);
            userUpdated++;
            totalUpdated++;
          } else {
            console.log(`  ⏭️  Skipped: ${emailType} (already enabled: true)`);
            userSkipped++;
            totalSkipped++;
          }
        } else {
          console.log(`  ⏭️  Skipped: ${emailType} (already exists)`);
          userSkipped++;
          totalSkipped++;
        }
      }

      console.log(`\n  Summary for ${user.name}:`);
      console.log(`    Created: ${userCreated} | Updated: ${userUpdated} | Skipped: ${userSkipped}`);
      usersProcessed++;
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKFILL COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Users Processed:        ${usersProcessed}`);
    console.log(`  Preferences Created:    ${totalCreated}`);
    console.log(`  Preferences Updated:    ${totalUpdated}`);
    console.log(`  Preferences Skipped:    ${totalSkipped}`);
    console.log(`  Total Operations:       ${totalCreated + totalUpdated + totalSkipped}`);
    console.log('\n' + '='.repeat(60));

    // Verification
    console.log('\n🔍 Running Verification...\n');

    const usersMissingPrefs = await prisma.user.findMany({
      where: {
        emailPreferences: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (usersMissingPrefs.length > 0) {
      console.log(`⚠️  WARNING: ${usersMissingPrefs.length} users still have no email preferences:`);
      usersMissingPrefs.forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
      });
    } else {
      console.log('✅ All users have email preferences!');
    }

    // Count users with incomplete preferences (less than all email types)
    const usersWithAllPrefs = await prisma.user.count({
      where: {
        emailPreferences: {
          every: {
            enabled: true,
          },
        },
      },
    });

    console.log(`\n📊 Users with all preferences enabled: ${usersWithAllPrefs}/${users.length}`);

    console.log('\n✅ Backfill script completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillEmailPreferences()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

/**
 * Script to fix incorrect StudentCurriculumProgress totalItems values
 *
 * Run with: npx tsx scripts/fix-curriculum-progress.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCurriculumProgress() {
  console.log('🔍 Finding all StudentCurriculumProgress records...');

  const progressRecords = await prisma.studentCurriculumProgress.findMany({
    include: {
      curriculum: {
        include: {
          sections: {
            include: {
              items: true
            }
          }
        }
      },
      itemProgress: true
    }
  });

  console.log(`Found ${progressRecords.length} progress records\n`);

  for (const record of progressRecords) {
    // Calculate the ACTUAL total items from the curriculum
    const actualTotalItems = record.curriculum.sections.reduce(
      (sum, section) => sum + section.items.length,
      0
    );

    // Calculate completed items from progress records
    const actualCompletedItems = record.itemProgress.filter(
      (p) => p.status === 'COMPLETED'
    ).length;

    const actualProgressPercent = actualTotalItems > 0
      ? (actualCompletedItems / actualTotalItems) * 100
      : 0;

    console.log(`📊 Curriculum: ${record.curriculum.title}`);
    console.log(`   Current DB values: ${record.completedItems}/${record.totalItems} (${record.progressPercent}%)`);
    console.log(`   Actual values: ${actualCompletedItems}/${actualTotalItems} (${actualProgressPercent.toFixed(0)}%)`);

    // Update if values are wrong
    if (
      record.totalItems !== actualTotalItems ||
      record.completedItems !== actualCompletedItems ||
      Math.abs(record.progressPercent - actualProgressPercent) > 0.01
    ) {
      console.log(`   ✅ Updating record...`);

      await prisma.studentCurriculumProgress.update({
        where: { id: record.id },
        data: {
          totalItems: actualTotalItems,
          completedItems: actualCompletedItems,
          progressPercent: actualProgressPercent,
        },
      });

      console.log(`   ✅ Updated to: ${actualCompletedItems}/${actualTotalItems} (${actualProgressPercent.toFixed(0)}%)\n`);
    } else {
      console.log(`   ✓ Already correct\n`);
    }
  }

  console.log('✅ Done!');
}

fixCurriculumProgress()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Script to fix sortOrder for existing curriculum items
 * Sets sortOrder based on createdAt timestamp
 *
 * Run with: npx tsx scripts/fix-curriculum-item-order.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCurriculumItemOrder() {
  console.log('🔍 Finding all curriculum sections...');

  const sections = await prisma.curriculumSection.findMany({
    include: {
      items: {
        orderBy: {
          createdAt: 'asc',  // Order by creation time
        },
      },
      curriculum: {
        select: {
          title: true,
        },
      },
    },
  });

  console.log(`Found ${sections.length} sections\n`);

  let totalUpdated = 0;

  for (const section of sections) {
    if (section.items.length === 0) continue;

    console.log(`📚 Curriculum: ${section.curriculum.title}`);
    console.log(`   Section ID: ${section.id}`);
    console.log(`   Items: ${section.items.length}`);

    // Check if items need updating (all have sortOrder 0 or out of order)
    const needsUpdate = section.items.some((item, index) => item.sortOrder !== index);

    if (needsUpdate) {
      console.log(`   ✅ Updating sortOrder...`);

      // Update each item with correct sortOrder based on creation order
      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        await prisma.curriculumItem.update({
          where: { id: item.id },
          data: { sortOrder: i },
        });
      }

      console.log(`   ✅ Updated ${section.items.length} items\n`);
      totalUpdated += section.items.length;
    } else {
      console.log(`   ✓ Already in correct order\n`);
    }
  }

  console.log(`✅ Done! Updated ${totalUpdated} items total.`);
}

fixCurriculumItemOrder()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

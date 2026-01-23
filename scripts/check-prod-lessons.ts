/**
 * Script to check if lessons exist in production database
 */
import { PrismaClient } from '@prisma/client';

const prodDbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (!prodDbUrl) {
  console.error('❌ No database URL found');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodDbUrl
    }
  }
});

async function checkLessons() {
  try {
    console.log('🔍 Connecting to production database...');
    console.log(`📍 Using: ${prodDbUrl?.substring(0, 50)}...`);

    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');

    // Count total lessons
    const totalLessons = await prisma.lesson.count();
    console.log(`📊 Total lessons in database: ${totalLessons}`);

    if (totalLessons === 0) {
      console.log('\n⚠️  No lessons found in production database');
      console.log('This means lessons are not being saved to production.');
      return;
    }

    // Get recent lessons
    const recentLessons = await prisma.lesson.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } }
      }
    });

    console.log('\n📚 Most recent lessons:');
    recentLessons.forEach((lesson, i) => {
      console.log(`\n${i + 1}. Lesson ID: ${lesson.id}`);
      console.log(`   Teacher: ${lesson.teacher.user.name}`);
      console.log(`   Student: ${lesson.student.user.name}`);
      console.log(`   Date: ${lesson.date}`);
      console.log(`   Status: ${lesson.status}`);
      console.log(`   Created: ${lesson.createdAt}`);
    });

    // Check for lessons by status
    const statusCounts = await prisma.lesson.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\n📈 Lessons by status:');
    statusCounts.forEach(({ status, _count }) => {
      console.log(`   ${status}: ${_count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkLessons();

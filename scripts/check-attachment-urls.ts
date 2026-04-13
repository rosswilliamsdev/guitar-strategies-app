/**
 * Quick check to verify lesson attachment URLs in database
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUrls() {
  console.log('📎 Checking LessonAttachment URLs...\n');

  // Get a sample of lesson attachments
  const attachments = await prisma.lessonAttachment.findMany({
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
    },
    take: 5,
  });

  console.log(`Sample of ${attachments.length} lesson attachments:\n`);

  attachments.forEach((att, idx) => {
    const isS3 = att.fileUrl.includes('s3.') || att.fileUrl.includes('amazonaws.com');
    const isBlob = att.fileUrl.includes('blob.vercel-storage.com');

    console.log(`${idx + 1}. ${att.fileName}`);
    console.log(`   Storage: ${isS3 ? '✅ S3' : isBlob ? '⚠️  Vercel Blob' : '❓ Unknown'}`);
    console.log(`   URL: ${att.fileUrl.substring(0, 80)}...`);
    console.log('');
  });

  // Count by storage type
  const total = await prisma.lessonAttachment.count();
  const onS3 = await prisma.lessonAttachment.count({
    where: {
      OR: [
        { fileUrl: { contains: 's3.' } },
        { fileUrl: { contains: 'amazonaws.com' } }
      ]
    }
  });

  console.log('========================================');
  console.log(`Total attachments: ${total}`);
  console.log(`On S3: ${onS3}`);
  console.log(`Not on S3: ${total - onS3}`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

checkUrls().catch(console.error);

/**
 * Migration script: Vercel Blob → AWS S3
 *
 * Migrates all files from Vercel Blob storage to AWS S3:
 * - Library items (sheet music, resources, etc.)
 * - Lesson attachments (if applicable)
 *
 * Run with: npx tsx scripts/migrate-blob-to-s3.ts
 * Dry run: npx tsx scripts/migrate-blob-to-s3.ts --dry-run
 *
 * Prerequisites:
 * 1. S3 bucket created and configured (see openspec/changes/aws-service-expansion/tasks.md)
 * 2. AWS credentials in .env file
 * 3. Vercel Blob access still available for download
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',

    // Music notation
    mxl: 'application/vnd.recordare.musicxml',
    musicxml: 'application/vnd.recordare.musicxml+xml',
    gp: 'application/x-guitar-pro',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Extract S3 key (path) from Vercel Blob URL
 */
function extractPathFromBlobUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Vercel Blob URLs format: https://{hash}.public.blob.vercel-storage.com/{path}
    // We want to preserve the path part after the domain
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (err) {
    console.error(`❌ Failed to parse URL: ${url}`);
    return null;
  }
}

/**
 * Download file from Vercel Blob URL
 */
async function downloadFileFromBlob(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload file to S3
 */
async function uploadFileToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });

  await s3Client.send(command);

  // Build S3 URL
  const region = process.env.AWS_REGION!;
  return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Migrate a single library item
 */
async function migrateLibraryItem(
  item: { id: string; fileUrl: string; fileName: string },
  dryRun: boolean
): Promise<boolean> {
  try {
    // Extract path from Vercel Blob URL
    const originalPath = extractPathFromBlobUrl(item.fileUrl);
    if (!originalPath) {
      console.log(`⚠️  Skipping - invalid URL format: ${item.fileUrl}`);
      return false;
    }

    console.log(`📦 Migrating: ${item.fileName} (${originalPath})`);

    // Derive MIME type from filename
    const mimeType = getMimeTypeFromFilename(item.fileName);

    if (dryRun) {
      console.log(`   [DRY RUN] Would download from: ${item.fileUrl}`);
      console.log(`   [DRY RUN] Would upload to S3 with key: ${originalPath}`);
      console.log(`   [DRY RUN] Content-Type: ${mimeType}`);
      return true;
    }

    // Download from Vercel Blob
    console.log(`   ⬇️  Downloading from Vercel Blob...`);
    const fileBuffer = await downloadFileFromBlob(item.fileUrl);
    console.log(`   ✓ Downloaded ${fileBuffer.length} bytes`);

    // Upload to S3
    console.log(`   ⬆️  Uploading to S3...`);
    const s3Url = await uploadFileToS3(originalPath, fileBuffer, mimeType);
    console.log(`   ✓ Uploaded to: ${s3Url}`);

    // Update database record
    console.log(`   💾 Updating database...`);
    await prisma.libraryItem.update({
      where: { id: item.id },
      data: { fileUrl: s3Url },
    });
    console.log(`   ✓ Database updated`);

    return true;
  } catch (error) {
    console.error(`   ❌ Error migrating ${item.fileName}:`, error);
    return false;
  }
}

/**
 * Migrate a single lesson attachment
 */
async function migrateLessonAttachment(
  attachment: { id: string; fileUrl: string; fileName: string; mimeType: string },
  dryRun: boolean
): Promise<boolean> {
  try {
    // Extract path from Vercel Blob URL
    const originalPath = extractPathFromBlobUrl(attachment.fileUrl);
    if (!originalPath) {
      console.log(`⚠️  Skipping - invalid URL format: ${attachment.fileUrl}`);
      return false;
    }

    console.log(`📎 Migrating: ${attachment.fileName} (${originalPath})`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would download from: ${attachment.fileUrl}`);
      console.log(`   [DRY RUN] Would upload to S3 with key: ${originalPath}`);
      console.log(`   [DRY RUN] Content-Type: ${attachment.mimeType}`);
      return true;
    }

    // Download from Vercel Blob
    console.log(`   ⬇️  Downloading from Vercel Blob...`);
    const fileBuffer = await downloadFileFromBlob(attachment.fileUrl);
    console.log(`   ✓ Downloaded ${fileBuffer.length} bytes`);

    // Upload to S3
    console.log(`   ⬆️  Uploading to S3...`);
    const s3Url = await uploadFileToS3(originalPath, fileBuffer, attachment.mimeType);
    console.log(`   ✓ Uploaded to: ${s3Url}`);

    // Update database record
    console.log(`   💾 Updating database...`);
    await prisma.lessonAttachment.update({
      where: { id: attachment.id },
      data: { fileUrl: s3Url },
    });
    console.log(`   ✓ Database updated`);

    return true;
  } catch (error) {
    console.error(`   ❌ Error migrating ${attachment.fileName}:`, error);
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateFiles(dryRun: boolean) {
  console.log('========================================');
  console.log('🚀 Vercel Blob → S3 Migration Script');
  console.log('========================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Validate environment variables
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }

  console.log('✓ Environment variables validated');
  console.log(`✓ S3 Bucket: ${S3_BUCKET_NAME}`);
  console.log(`✓ Region: ${process.env.AWS_REGION}\n`);

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Migrate Library Items
  console.log('📚 Migrating Library Items...\n');

  const libraryItems = await prisma.libraryItem.findMany({
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
    },
  });

  console.log(`Found ${libraryItems.length} library items\n`);
  stats.total += libraryItems.length;

  for (const item of libraryItems) {
    // Skip if already migrated to S3
    if (item.fileUrl.includes('.s3.') || item.fileUrl.includes('amazonaws.com')) {
      console.log(`⏭️  Skipping (already on S3): ${item.fileName}`);
      stats.skipped++;
      continue;
    }

    const success = await migrateLibraryItem(item, dryRun);
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    console.log(''); // Blank line between items
  }

  // Migrate Lesson Attachments
  console.log('\n📎 Migrating Lesson Attachments...\n');

  const lessonAttachments = await prisma.lessonAttachment.findMany({
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
    },
  });

  console.log(`Found ${lessonAttachments.length} lesson attachments\n`);
  stats.total += lessonAttachments.length;

  for (const attachment of lessonAttachments) {
    // Skip if already migrated to S3
    if (attachment.fileUrl.includes('.s3.') || attachment.fileUrl.includes('amazonaws.com')) {
      console.log(`⏭️  Skipping (already on S3): ${attachment.fileName}`);
      stats.skipped++;
      continue;
    }

    const success = await migrateLessonAttachment(attachment, dryRun);
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    console.log(''); // Blank line between items
  }

  // Print summary
  console.log('\n========================================');
  console.log('📊 Migration Summary');
  console.log('========================================');
  console.log(`Total files:     ${stats.total}`);
  console.log(`✓ Successful:    ${stats.success}`);
  console.log(`❌ Failed:        ${stats.failed}`);
  console.log(`⏭️  Skipped:       ${stats.skipped}`);
  console.log('========================================\n');

  if (dryRun) {
    console.log('🔍 This was a DRY RUN - no changes were made');
    console.log('   Run without --dry-run to perform the migration\n');
  } else if (stats.failed > 0) {
    console.log('⚠️  Some files failed to migrate. Please review the errors above.\n');
    process.exit(1);
  } else if (stats.success > 0) {
    console.log('✅ Migration complete! All files successfully migrated to S3.\n');
  } else {
    console.log('ℹ️  No files needed migration (all already on S3 or skipped).\n');
  }
}

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

// Run migration
migrateFiles(dryRun)
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { log } from '@/lib/logger';

/**
 * Centralized S3 Storage Utility (migrated from Vercel Blob)
 * Handles file uploads, deletions, and validation for the Guitar Strategies app
 */

// Initialize S3 client
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `S3 storage is not configured. Missing environment variables: ${missingVars.join(', ')}`
    );
  }

  s3Client = new S3Client({
    region: requiredEnvVars.AWS_REGION!,
    credentials: {
      accessKeyId: requiredEnvVars.AWS_ACCESS_KEY_ID!,
      secretAccessKey: requiredEnvVars.AWS_SECRET_ACCESS_KEY!,
    },
  });

  return s3Client;
}

function buildS3Url(key: string): string {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const MAX_ATTACHMENTS_PER_LESSON = 10;

export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',

  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/midi',
  'audio/x-midi',

  // Video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',

  // Guitar tablature formats
  'application/x-guitar-pro',
  'application/octet-stream', // Generic binary (catches .gp, .ptb, .ptx, .tg files)
  'application/x-ptb',
  'application/x-powertab',
  'application/x-tuxguitar'
];

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export interface FileValidationError {
  valid: false;
  error: string;
}

export interface FileValidationSuccess {
  valid: true;
}

export type FileValidationResult = FileValidationSuccess | FileValidationError;

/**
 * Sanitize filename to remove special characters and spaces
 */
export function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // Remove special characters, replace spaces with dashes
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${sanitized}${ext}`;
}

/**
 * Generate a unique filename with timestamp prefix
 */
export function generateUniqueFileName(originalFileName: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(originalFileName);
  return `${timestamp}-${sanitized}`;
}

/**
 * Validate file size and type
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not supported`
    };
  }

  return { valid: true };
}

/**
 * Upload file to S3 Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'library/teacherId/filename' or 'lessons/teacherId/lessonId/filename')
 * @returns Upload result with URL or throws error
 */
export async function uploadFileToBlob(
  file: File,
  path: string
): Promise<BlobUploadResult> {
  try {
    // Get S3 client (validates configuration)
    const client = getS3Client();
    const bucket = process.env.S3_BUCKET_NAME!;

    // Validate the file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error((validation as FileValidationError).error);
    }

    log.info('Uploading file to S3 storage', {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      path
    });

    // Convert File to Buffer for S3 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: `inline; filename="${file.name}"`,
    });

    await client.send(command);

    const url = buildS3Url(path);

    log.info('File uploaded successfully to S3', {
      url,
      pathname: path
    });

    return {
      url,
      pathname: path,
      contentType: file.type,
      contentDisposition: `inline; filename="${file.name}"`,
    };

  } catch (error) {
    log.error('Failed to upload file to S3 storage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: file.name,
      path
    });
    throw error;
  }
}

/**
 * Delete file from S3 Storage
 * @param url - The S3 URL to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFileFromBlob(url: string): Promise<void> {
  try {
    // Get S3 client (validates configuration)
    const client = getS3Client();
    const bucket = process.env.S3_BUCKET_NAME!;

    // Extract the key (path) from the S3 URL
    const key = extractS3KeyFromUrl(url);
    if (!key) {
      log.warn('Could not extract S3 key from URL, skipping deletion', { url });
      return;
    }

    log.info('Deleting file from S3 storage', { url, key });

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);

    log.info('File deleted successfully from S3', { url });

  } catch (error) {
    log.error('Failed to delete file from S3 storage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url
    });
    // Don't throw - deletion failures shouldn't break the app
    // The file becomes orphaned but we can clean up later
  }
}

/**
 * Extract S3 key from S3 URL
 * @param url - Full S3 URL (e.g., https://bucket.s3.region.amazonaws.com/path/to/file)
 * @returns The key (path) or null if invalid
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.substring(1);
  } catch (err) {
    log.error('Failed to extract S3 key from URL', {
      url,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}

/**
 * Build storage path for library files
 */
export function buildLibraryPath(teacherId: string, fileName: string): string {
  const uniqueFileName = generateUniqueFileName(fileName);
  return `library/${teacherId}/${uniqueFileName}`;
}

/**
 * Build storage path for lesson attachment files
 */
export function buildLessonAttachmentPath(
  teacherId: string,
  lessonId: string,
  fileName: string
): string {
  const uniqueFileName = generateUniqueFileName(fileName);
  return `lessons/${teacherId}/${lessonId}/${uniqueFileName}`;
}

/**
 * Extract filename from blob URL
 */
export function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'unknown';
  } catch (err) {
    log.error('Failed to extract filename from URL', {
      url,
      error: err instanceof Error ? err.message : String(err)
    });
    return 'unknown';
  }
}

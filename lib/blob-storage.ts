import { put, del } from '@vercel/blob';
import { log } from '@/lib/logger';

/**
 * Centralized Vercel Blob Storage Utility
 * Handles file uploads, deletions, and validation for the Guitar Strategies app
 */

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
 * Upload file to Vercel Blob Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'library/teacherId/filename' or 'lessons/teacherId/lessonId/filename')
 * @returns Upload result with URL or throws error
 */
export async function uploadFileToBlob(
  file: File,
  path: string
): Promise<BlobUploadResult> {
  try {
    // Validate Vercel Blob is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Vercel Blob storage is not configured. Please set BLOB_READ_WRITE_TOKEN.');
    }

    // Validate the file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    log.info('Uploading file to blob storage', {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      path
    });

    // Upload to Vercel Blob
    const blob = await put(path, file, {
      access: 'public',
      addRandomSuffix: false, // We already add timestamp for uniqueness
    });

    log.info('File uploaded successfully', {
      url: blob.url,
      pathname: blob.pathname
    });

    return blob;

  } catch (error) {
    log.error('Failed to upload file to blob storage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileName: file.name,
      path
    });
    throw error;
  }
}

/**
 * Delete file from Vercel Blob Storage
 * @param url - The blob URL to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFileFromBlob(url: string): Promise<void> {
  try {
    // Validate Vercel Blob is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      log.warn('Vercel Blob storage is not configured, skipping deletion', { url });
      return;
    }

    log.info('Deleting file from blob storage', { url });

    await del(url);

    log.info('File deleted successfully', { url });

  } catch (error) {
    log.error('Failed to delete file from blob storage', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url
    });
    // Don't throw - deletion failures shouldn't break the app
    // The file becomes orphaned but we can clean up later
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

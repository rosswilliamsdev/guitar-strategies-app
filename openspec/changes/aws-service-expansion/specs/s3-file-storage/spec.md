# S3 File Storage Specification

## ADDED Requirements

### Requirement: S3 bucket creation and configuration
The system SHALL use an AWS S3 bucket for storing all uploaded files including library items and lesson attachments.

#### Scenario: Bucket is properly configured
- **WHEN** the S3 bucket is created
- **THEN** it SHALL have public read access enabled for file retrieval
- **THEN** it SHALL have CORS configuration to allow uploads from the application domain

#### Scenario: Bucket naming follows conventions
- **WHEN** the S3 bucket is created
- **THEN** it SHALL use a descriptive name (e.g., "guitar-strategies-files")
- **THEN** it SHALL be created in the us-east-1 region (or closest to primary users)

### Requirement: File upload to S3
The system SHALL upload files to S3 using the AWS SDK while maintaining the same public API as the current Vercel Blob implementation.

#### Scenario: Successful file upload
- **WHEN** a user uploads a file through the library or lesson attachment interface
- **THEN** the file SHALL be uploaded to S3 with a unique timestamped filename
- **THEN** the system SHALL return a public S3 URL accessible via HTTPS
- **THEN** the upload SHALL validate file type and size before uploading

#### Scenario: File size validation
- **WHEN** a user attempts to upload a file larger than 10MB
- **THEN** the system SHALL reject the upload with an error message
- **THEN** no S3 upload SHALL be initiated

#### Scenario: File type validation
- **WHEN** a user attempts to upload a disallowed file type
- **THEN** the system SHALL reject the upload based on MIME type validation
- **THEN** allowed types SHALL include documents (PDF, DOCX), images (JPEG, PNG, GIF, WebP), audio (MP3, WAV), video (MP4, WebM), and tablature formats

### Requirement: File download from S3
The system SHALL serve files from S3 via public HTTPS URLs.

#### Scenario: Accessing uploaded files
- **WHEN** a user clicks a download link for a library item or lesson attachment
- **THEN** the file SHALL be retrieved directly from S3 via its public URL
- **THEN** the file SHALL download with the correct content type and filename

### Requirement: File deletion from S3
The system SHALL delete files from S3 when they are removed from the application.

#### Scenario: Successful file deletion
- **WHEN** a teacher deletes a library item or lesson attachment
- **THEN** the corresponding file SHALL be deleted from S3
- **THEN** the database record SHALL be removed

#### Scenario: Graceful deletion failure
- **WHEN** S3 deletion fails (network error, permissions issue)
- **THEN** the system SHALL log the error without blocking the database record deletion
- **THEN** the file SHALL become orphaned in S3 (acceptable for now, can be cleaned up later)

### Requirement: Data migration from Vercel Blob
The system SHALL migrate all existing files from Vercel Blob to S3 as a one-time operation.

#### Scenario: Migration script execution
- **WHEN** the migration script is executed
- **THEN** it SHALL download each file from Vercel Blob using its current URL
- **THEN** it SHALL upload each file to S3 maintaining the same filename structure
- **THEN** it SHALL update the database with new S3 URLs

#### Scenario: Migration verification
- **WHEN** migration completes
- **THEN** all library items and lesson attachments SHALL have S3 URLs in the database
- **THEN** all files SHALL be accessible via their new S3 URLs
- **THEN** old Vercel Blob URLs SHALL be marked as deprecated

### Requirement: Path structure consistency
The system SHALL maintain consistent file path structures in S3 matching the current Vercel Blob pattern.

#### Scenario: Library file paths
- **WHEN** a library file is uploaded
- **THEN** it SHALL be stored at path: `library/{teacherId}/{timestamp}-{sanitized-filename}`

#### Scenario: Lesson attachment paths
- **WHEN** a lesson attachment is uploaded
- **THEN** it SHALL be stored at path: `lessons/{teacherId}/{lessonId}/{timestamp}-{sanitized-filename}`

### Requirement: AWS credentials management
The system SHALL securely manage AWS credentials for S3 access.

#### Scenario: Environment variable configuration
- **WHEN** the application starts
- **THEN** it SHALL read AWS credentials from environment variables
- **THEN** required variables SHALL include: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME

#### Scenario: Missing credentials handling
- **WHEN** required AWS environment variables are missing
- **THEN** file upload operations SHALL fail with clear error messages
- **THEN** the application SHALL log the configuration error

### Requirement: Backward compatibility during transition
The system SHALL maintain the same function signatures in `lib/blob-storage.ts` to minimize code changes.

#### Scenario: API compatibility
- **WHEN** the S3 implementation is deployed
- **THEN** `uploadFileToBlob()` SHALL accept the same parameters (File, path)
- **THEN** `deleteFileFromBlob()` SHALL accept the same parameters (URL)
- **THEN** return types SHALL remain unchanged (BlobUploadResult, void)
- **THEN** calling code SHALL not require modifications

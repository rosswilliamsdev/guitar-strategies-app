## Why

The app is currently in a transitional state—containerized and running on AWS EC2, but still dependent on Vercel for file storage (Vercel Blob) and automated job scheduling (Vercel Cron). To complete the AWS migration and build resume-worthy cloud infrastructure skills, we need to replace these Vercel-specific services with AWS-native alternatives. This enables the EC2 deployment to operate fully independently while demonstrating practical experience with core AWS services (S3, Lambda, EventBridge, CloudWatch).

## What Changes

- **Replace Vercel Blob with S3** for file storage (library items, lesson attachments)
- **Replace Vercel Cron with EventBridge + Lambda** for automated lesson generation scheduling
- **Migrate to AWS SDK** in blob storage utility (`lib/blob-storage.ts`)
- **Implement Lambda-based job orchestration** that triggers existing API endpoints
- **Add CloudWatch integration** for monitoring Lambda executions and failures
- Keep Neon (database) and Resend (email) as external services (no changes)

## Capabilities

### New Capabilities

- `s3-file-storage`: S3-based file storage with public read access for library items and lesson attachments
- `lambda-job-scheduling`: EventBridge-triggered Lambda functions that orchestrate background jobs via HTTP API calls
- `cloudwatch-monitoring`: CloudWatch logs and metrics for Lambda executions with failure alerting

### Modified Capabilities

- `file-management`: File storage implementation changes from Vercel Blob API to AWS S3 SDK (no requirement changes to upload/download/delete functionality)

## Impact

### Code Changes
- `lib/blob-storage.ts` - Replace Vercel Blob SDK with AWS S3 SDK while maintaining same function signatures
- Environment variables - Add `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- Database - Update URLs for existing files during one-time migration from Vercel Blob to S3

### New Infrastructure
- S3 bucket with public read policy and CORS configuration
- Lambda function: `generate-lessons-cron` (HTTP caller for `/api/cron/generate-lessons`)
- EventBridge rule: Daily 2 AM UTC schedule triggering Lambda
- CloudWatch log groups for Lambda executions

### Migration Tasks
- One-time data migration script to copy existing files from Vercel Blob → S3
- Update database records with new S3 URLs
- Remove `vercel.json` cron configuration after EventBridge setup verified

### Dependencies
- New npm package: `@aws-sdk/client-s3`
- AWS account with appropriate IAM permissions for S3, Lambda, EventBridge, CloudWatch

### Non-goals
- Migrating database from Neon to RDS (keeping Neon)
- Replacing Resend email service with SES (keeping Resend)
- Invoice generation automation (not currently in use)
- CloudFront CDN setup (no global distribution needs)
- Infrastructure as Code with Terraform/CDK (future enhancement)

## Success Criteria

- Files uploaded through the app are stored in S3 and accessible via public URLs
- Lesson generation job runs automatically at 2 AM daily via EventBridge → Lambda
- CloudWatch logs show successful Lambda executions
- EC2 deployment operates independently of Vercel infrastructure
- Total AWS monthly cost remains under $50 ($20-25 estimated)

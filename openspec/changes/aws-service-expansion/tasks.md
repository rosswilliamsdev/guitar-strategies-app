# AWS Service Expansion - Implementation Tasks

## 1. S3 Bucket Setup and Configuration

- [ ] 1.1 Create S3 bucket named "guitar-strategies-files" in AWS Console (region: us-east-1)
- [ ] 1.2 Disable "Block all public access" setting on the bucket
- [ ] 1.3 Add bucket policy to allow public GetObject (but not ListBucket)
- [ ] 1.4 Configure CORS policy to allow uploads from app.guitarstrategies.com domain
- [ ] 1.5 Create IAM user with S3 access and generate access key credentials
- [ ] 1.6 Test bucket access by manually uploading a test file via AWS Console
- [ ] 1.7 Verify test file is publicly accessible via direct S3 URL

**Files:** AWS Console only
**Dependencies:** None
**Acceptance:** S3 bucket created, public read enabled, CORS configured, test file accessible

## 2. Update Application Code for S3 Integration

- [x] 2.1 Install AWS SDK dependency: `npm install @aws-sdk/client-s3`
- [x] 2.2 Add AWS environment variables to .env file (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME)
- [x] 2.3 Update lib/blob-storage.ts: Import S3Client, PutObjectCommand, DeleteObjectCommand from AWS SDK
- [x] 2.4 Update lib/blob-storage.ts: Replace uploadFileToBlob() implementation to use S3 PutObjectCommand
- [x] 2.5 Update lib/blob-storage.ts: Replace deleteFileFromBlob() implementation to use S3 DeleteObjectCommand
- [x] 2.6 Update lib/blob-storage.ts: Modify path building functions to generate S3 URLs (format: `https://{bucket}.s3.{region}.amazonaws.com/{path}`)
- [x] 2.7 Keep function signatures unchanged for backward compatibility (same params, same return types)
- [x] 2.8 Add error handling for S3 client initialization (check for missing env vars)

**Files:** `lib/blob-storage.ts`, `.env`, `package.json`
**Dependencies:** Task 1 complete
**Acceptance:** Code compiles without errors, S3 client initializes correctly

## 3. Local Testing of S3 Upload/Download

- [ ] 3.1 Start local dev server: `npm run dev`
- [ ] 3.2 Navigate to library section in the app
- [ ] 3.3 Upload a test file (PDF or image) via the library upload form
- [ ] 3.4 Verify file appears in S3 bucket via AWS Console
- [ ] 3.5 Verify file is publicly accessible via S3 URL in browser
- [ ] 3.6 Verify file downloads correctly from the app
- [ ] 3.7 Delete the test file via the app
- [ ] 3.8 Verify file is removed from S3 bucket via AWS Console

**Files:** Local testing only
**Dependencies:** Task 2 complete
**Acceptance:** Upload, download, and delete operations work correctly via S3

## 4. Data Migration Script (Vercel Blob → S3)

- [x] 4.1 Create migration script file: `scripts/migrate-blob-to-s3.ts`
- [x] 4.2 Implement database query to fetch all LibraryItem records with fileUrl
- [x] 4.3 Implement database query to fetch all Lesson records with attachments (if applicable)
- [x] 4.4 For each file: Download from Vercel Blob URL using fetch()
- [x] 4.5 For each file: Upload to S3 using uploadFileToBlob() function
- [x] 4.6 For each file: Update database record with new S3 URL
- [x] 4.7 Add error handling and logging for each migration step
- [x] 4.8 Add dry-run mode flag to preview changes without executing
- [ ] 4.9 Run migration script in dry-run mode and review output
- [ ] 4.10 Run migration script in execution mode to migrate all files
- [ ] 4.11 Verify all files migrated successfully by checking S3 bucket file count
- [ ] 4.12 Verify all database records now point to S3 URLs (no Vercel Blob URLs remain)

**Files:** `scripts/migrate-blob-to-s3.ts`
**Dependencies:** Task 2 and 3 complete
**Acceptance:** All files copied to S3, all database records updated, zero errors

## 5. Deploy S3 Changes to EC2

- [ ] 5.1 Commit code changes to git: `git add . && git commit -m "feat: migrate file storage to S3"`
- [ ] 5.2 Push to GitHub: `git push origin main`
- [ ] 5.3 SSH into EC2 instance
- [ ] 5.4 Pull latest code on EC2: `git pull origin main`
- [ ] 5.5 Update EC2 .env file with AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME)
- [ ] 5.6 Rebuild Docker image: `docker build -t guitar-strategies .`
- [ ] 5.7 Restart Docker container: `docker-compose down && docker-compose up -d`
- [ ] 5.8 Verify container is running: `docker ps`
- [ ] 5.9 Test file upload via EC2 app URL
- [ ] 5.10 Verify uploaded file appears in S3 and is publicly accessible

**Files:** EC2 server, Docker container
**Dependencies:** Task 4 complete
**Acceptance:** EC2 app successfully uploads/downloads files from S3

## 6. Create Lambda Function for Job Scheduling

- [ ] 6.1 Open AWS Console → Lambda → Create function
- [ ] 6.2 Configure function: Name "generate-lessons-cron", Runtime Node.js 20, Architecture x86_64
- [ ] 6.3 Create execution role (auto-generated with basic Lambda permissions)
- [ ] 6.4 Write Lambda handler code (fetch API endpoint with Authorization header)
- [ ] 6.5 Add environment variables: API_URL (https://app.guitarstrategies.com), CRON_SECRET (copy from EC2 .env)
- [ ] 6.6 Configure timeout: 120 seconds (Configuration → General)
- [ ] 6.7 Configure memory: 128 MB (Configuration → General)
- [ ] 6.8 Add error handling: Log errors and throw to trigger retry
- [ ] 6.9 Add success logging: Log response data to CloudWatch
- [ ] 6.10 Save Lambda function

**Files:** AWS Lambda Console
**Dependencies:** Task 5 complete (need API_URL working)
**Acceptance:** Lambda function created with correct configuration

## 7. Test Lambda Function Manually

- [ ] 7.1 Navigate to Lambda function in AWS Console
- [ ] 7.2 Click "Test" tab
- [ ] 7.3 Create test event with empty JSON: `{}`
- [ ] 7.4 Click "Test" button to invoke function
- [ ] 7.5 Verify execution result shows "Success" status
- [ ] 7.6 Review execution logs in output panel
- [ ] 7.7 Verify API response includes successful job execution data
- [ ] 7.8 Check CloudWatch Logs → Log groups → /aws/lambda/generate-lessons-cron
- [ ] 7.9 Verify log stream contains execution details
- [ ] 7.10 Check database for newly generated lessons (verify job actually ran)

**Files:** AWS Lambda Console, CloudWatch Logs
**Dependencies:** Task 6 complete
**Acceptance:** Manual Lambda invocation succeeds, API endpoint called, lessons created in DB

## 8. Create EventBridge Schedule Rule

- [ ] 8.1 Open AWS Console → EventBridge → Rules → Create rule
- [ ] 8.2 Configure rule name: "daily-lesson-generation"
- [ ] 8.3 Select rule type: Schedule
- [ ] 8.4 Select schedule pattern: Cron-based schedule
- [ ] 8.5 Enter cron expression: `0 2 * * ? *` (2 AM UTC daily)
- [ ] 8.6 Configure target: AWS Lambda function
- [ ] 8.7 Select Lambda function: generate-lessons-cron
- [ ] 8.8 Configure retry policy: Use default (2 retries)
- [ ] 8.9 Review configuration and create rule
- [ ] 8.10 Verify rule status shows "Enabled"

**Files:** AWS EventBridge Console
**Dependencies:** Task 7 complete
**Acceptance:** EventBridge rule created, scheduled for daily 2 AM UTC, targets Lambda function

## 9. Verify Automated Scheduling

- [ ] 9.1 Wait until next scheduled execution (2 AM UTC the following day)
- [ ] 9.2 Check CloudWatch Logs for Lambda execution around 2 AM UTC
- [ ] 9.3 Verify Lambda was invoked automatically (not manually)
- [ ] 9.4 Review execution logs for success/failure status
- [ ] 9.5 Check database for newly created lessons
- [ ] 9.6 Verify lesson generation timestamp matches EventBridge trigger time
- [ ] 9.7 Check CloudWatch Metrics → Lambda → Invocations for automatic trigger
- [ ] 9.8 Verify no errors in Lambda execution

**Files:** CloudWatch Logs, Database
**Dependencies:** Task 8 complete, wait 24 hours
**Acceptance:** Lambda executes automatically at 2 AM UTC, lessons created successfully

## 10. CloudWatch Monitoring Setup

- [ ] 10.1 Navigate to CloudWatch → Log groups
- [ ] 10.2 Find log group: /aws/lambda/generate-lessons-cron
- [ ] 10.3 Configure log retention: 7 days (Actions → Edit retention)
- [ ] 10.4 Review available metrics: Invocations, Duration, Errors, Throttles
- [ ] 10.5 (Optional) Create CloudWatch Dashboard with Lambda metrics
- [ ] 10.6 (Optional) Create CloudWatch Alarm for Lambda errors (threshold: 2 errors in 5 minutes)
- [ ] 10.7 (Optional) Configure SNS topic for alarm notifications (email/SMS)
- [ ] 10.8 Document how to access CloudWatch Logs in README

**Files:** CloudWatch Console, README.md
**Dependencies:** Task 9 complete
**Acceptance:** Logs retained for 7 days, metrics visible, optional alarms configured

## 11. Cleanup and Documentation

- [ ] 11.1 Remove vercel.json cron configuration (comment out or delete)
- [ ] 11.2 Update package.json to remove @vercel/blob dependency
- [ ] 11.3 Run `npm install` to update package-lock.json
- [ ] 11.4 Update README with AWS architecture section
- [ ] 11.5 Document required environment variables in README
- [ ] 11.6 Add AWS service list to README (EC2, ECR, S3, Lambda, EventBridge, CloudWatch)
- [ ] 11.7 Document Lambda troubleshooting steps in README
- [ ] 11.8 Create backup of Vercel Blob files (download archive before deleting)
- [ ] 11.9 (Optional) Delete files from Vercel Blob to save costs
- [ ] 11.10 Commit documentation updates: `git commit -m "docs: update AWS architecture documentation"`

**Files:** `vercel.json`, `package.json`, `README.md`
**Dependencies:** Task 10 complete
**Acceptance:** Vercel dependencies removed, README updated, code committed

## 12. Cost Monitoring and Optimization

- [ ] 12.1 Open AWS Console → Billing → Cost Explorer
- [ ] 12.2 Review current month costs by service (EC2, S3, Lambda, etc.)
- [ ] 12.3 Verify total costs are under $50/month target
- [ ] 12.4 Set up billing alarm: CloudWatch → Alarms → Create alarm
- [ ] 12.5 Configure alarm threshold: $40 (80% of $50 budget)
- [ ] 12.6 Configure alarm action: SNS email notification
- [ ] 12.7 Review S3 storage costs (should be < $1/month)
- [ ] 12.8 Review Lambda costs (should be $0 under free tier)
- [ ] 12.9 (Optional) Add S3 lifecycle policy to delete files older than 1 year
- [ ] 12.10 Document cost optimization strategies in README

**Files:** AWS Billing Console, CloudWatch Alarms
**Dependencies:** All tasks complete
**Acceptance:** Costs monitored, billing alarm set, under budget

## 13. Final Verification and Testing

- [ ] 13.1 Test complete file upload workflow via EC2 app
- [ ] 13.2 Verify files are stored in S3 with correct public URLs
- [ ] 13.3 Test file download from library section
- [ ] 13.4 Test file deletion from library section
- [ ] 13.5 Verify Lambda function ran automatically in last 24 hours
- [ ] 13.6 Verify lessons were generated for all active recurring slots
- [ ] 13.7 Check CloudWatch Logs for any errors or warnings
- [ ] 13.8 Review EventBridge rule to confirm it's still enabled
- [ ] 13.9 Verify EC2 app is fully independent of Vercel infrastructure
- [ ] 13.10 Test rollback procedure (revert to Vercel Blob) to ensure it's documented and viable

**Files:** Full system integration
**Dependencies:** All previous tasks complete
**Acceptance:** End-to-end functionality verified, no errors, system running independently

---

## Summary

**Total Tasks:** 91 checkboxes across 13 task groups
**Estimated Time:** 5-7 hours total (1 weekend)
**Critical Path:** Tasks 1-5 (S3) → Tasks 6-9 (Lambda) → Tasks 10-13 (Verification)

**Saturday Focus:** Tasks 1-5 (S3 migration)
**Sunday Focus:** Tasks 6-10 (Lambda + EventBridge)
**Cleanup:** Tasks 11-13 (documentation and verification)

**Key Dependencies:**
- Task 2 requires Task 1 (need S3 bucket before coding)
- Task 3 requires Task 2 (need code before testing)
- Task 4 requires Task 3 (verify S3 works before migration)
- Task 6 requires Task 5 (need EC2 app working before Lambda)
- Task 7 requires Task 6 (test Lambda before scheduling)
- Task 8 requires Task 7 (verify Lambda works before automating)
- Task 9 requires Task 8 + 24 hours (verify schedule triggers)

**Rollback Points:**
- After Task 3: Can revert code if S3 doesn't work
- After Task 5: Can roll back EC2 deployment if issues found
- After Task 9: Can disable EventBridge rule if Lambda fails

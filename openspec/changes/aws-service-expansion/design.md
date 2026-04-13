# AWS Service Expansion - Technical Design

## Context

The Guitar Strategies app is currently in a transitional state—containerized and running on AWS EC2, but still dependent on Vercel infrastructure for file storage (Vercel Blob) and automated job scheduling (Vercel Cron). The application uses:

- **Current AWS**: EC2 (Docker), ECR (container registry)
- **Current External**: Vercel Blob (files), Vercel Cron (scheduling), Neon (Postgres DB), Resend (email)
- **Production**: Vercel deployment still handles live users with working cron jobs
- **Portfolio Goal**: Build EC2 deployment into a fully AWS-native stack for resume demonstration

The EC2 deployment needs to operate independently of Vercel to demonstrate practical AWS service integration skills. This requires replacing Vercel-specific services (Blob, Cron) with AWS equivalents (S3, Lambda + EventBridge) while maintaining feature parity.

**Constraints:**
- Weekend timeline (5-6 hours implementation)
- Monthly cost target: < $50 total AWS spend
- Minimize code changes (reuse existing business logic)
- Keep Neon DB and Resend Email (no migration needed)
- Maintain same functionality as Vercel deployment

**Stakeholders:**
- Primary: Solo developer (resume building)
- Secondary: Future employers evaluating AWS skills

## Goals / Non-Goals

**Goals:**
- Replace Vercel Blob with S3 for all file storage (library items, lesson attachments)
- Replace Vercel Cron with EventBridge + Lambda for automated lesson generation
- Enable EC2 deployment to run fully independently of Vercel infrastructure
- Demonstrate practical AWS service integration for portfolio/resume
- Maintain backward compatibility (same API, no breaking changes)
- Keep costs under $50/month total

**Non-Goals:**
- Migrating database from Neon to RDS (keeping Neon Postgres)
- Replacing Resend with SES (keeping Resend for email)
- Invoice generation automation (not currently in use)
- CloudFront CDN setup (no global distribution needs)
- Infrastructure as Code with Terraform/CDK (future enhancement)
- Multi-region deployment or high availability
- Custom domain/SSL setup for EC2 (using existing domain)

## Decisions

### Decision 1: S3 for File Storage (vs CloudFront + S3)

**Chosen:** S3 with public read access, no CloudFront CDN

**Rationale:**
- User base is primarily US-based, no need for global edge distribution
- CloudFront adds complexity and cost without meaningful latency improvement
- S3 public URLs provide adequate performance for music teaching materials
- Simpler architecture = faster implementation (weekend constraint)

**Alternatives Considered:**
- **CloudFront + S3**: Better for global distribution, but overkill for single-region users. Adds DNS config, cache invalidation complexity, and ~$10-15/mo cost.
- **EFS (Elastic File System)**: Could mount to EC2 directly, but more expensive and designed for server-mounted storage, not public web access.

**Implementation:**
- Create S3 bucket: `guitar-strategies-files` in `us-east-1`
- Enable public read access via bucket policy
- Configure CORS for browser uploads
- Use `@aws-sdk/client-s3` with `PutObjectCommand` and `DeleteObjectCommand`

### Decision 2: Lambda as HTTP Caller (vs Lambda with Embedded Logic)

**Chosen:** Lambda functions make HTTP requests to existing `/api/cron/*` endpoints

**Rationale:**
- Reuses existing business logic in `lib/background-jobs.ts` without duplication
- Lambda code is minimal (~10 lines of fetch() call)
- Separates concerns: Lambda handles "when to run", app handles "what to do"
- Faster implementation (no logic migration, no Prisma client in Lambda)
- Easier to test (can trigger endpoints manually, Lambda just orchestrates)

**Alternatives Considered:**
- **Lambda with embedded business logic**: Move `generateFutureLessons()` into Lambda function
  - Pros: Pure serverless, no EC2 dependency for jobs
  - Cons: Duplicates code, requires Prisma client in Lambda, Lambda layers for shared code, more complex deployment, breaks DRY principle
- **EventBridge → EC2 endpoint directly**: Skip Lambda entirely
  - Pros: Even simpler
  - Cons: No retry logic, no CloudWatch Lambda metrics, less "serverless" on resume

**Implementation:**
```javascript
// Lambda function structure
export const handler = async (event) => {
  const response = await fetch(`${process.env.API_URL}/api/cron/generate-lessons`, {
    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
  });
  const data = await response.json();
  console.log('Result:', data);
  if (!response.ok) throw new Error(`API failed: ${response.status}`);
  return { statusCode: 200, body: JSON.stringify(data) };
};
```

### Decision 3: EventBridge Scheduled Rules (vs Lambda EventBridge Scheduler)

**Chosen:** EventBridge Rules with cron expressions

**Rationale:**
- Industry standard for scheduled jobs in AWS
- Simple cron syntax familiar from Vercel (`0 2 * * ? *`)
- Direct integration with Lambda targets
- Built-in retry and error handling

**Alternatives Considered:**
- **EventBridge Scheduler**: Newer service with more features (one-time schedules, flexible time windows)
  - Not needed for simple daily recurring jobs
- **CloudWatch Events**: Deprecated predecessor to EventBridge
  - EventBridge is the modern replacement

**Implementation:**
- Rule name: `daily-lesson-generation`
- Schedule: `cron(0 2 * * ? *)` (2 AM UTC daily)
- Target: `generate-lessons-cron` Lambda function
- Retry: Default (2 retries on failure)

### Decision 4: In-Place Code Migration (vs Blue-Green Deployment)

**Chosen:** Update `lib/blob-storage.ts` in place, deploy to EC2

**Rationale:**
- EC2 deployment is not production-critical (Vercel still handles live users)
- Simple git deploy workflow (pull latest, restart container)
- Can test thoroughly before affecting production
- Weekend timeline doesn't allow complex deployment strategies

**Alternatives Considered:**
- **Blue-Green Deployment**: Deploy new version alongside old, switch traffic
  - Overkill for non-production EC2 environment
- **Feature Flags**: Toggle between Vercel Blob and S3
  - Adds complexity, not needed for one-way migration

**Implementation:**
1. Update code on branch
2. Migrate existing files to S3
3. Deploy to EC2 (git pull + docker restart)
4. Verify files accessible
5. Remove Vercel Blob dependency

### Decision 5: One-Time Migration Script (vs Gradual Migration)

**Chosen:** Single migration script to copy all files from Vercel Blob → S3

**Rationale:**
- Small file count (likely < 100 files total)
- Fast execution (minutes, not hours)
- Simpler than lazy migration (on-demand copy)
- Clean cutover reduces dual-system complexity

**Alternatives Considered:**
- **Lazy Migration**: Copy files to S3 on first access
  - More complex, requires dual-read logic
  - Slower total migration time
- **Manual Migration**: Download and re-upload files by hand
  - Error-prone, doesn't scale

**Implementation:**
```javascript
// Migration script (scripts/migrate-blob-to-s3.js)
async function migrateFiles() {
  const items = await prisma.libraryItem.findMany();
  for (const item of items) {
    const blob = await fetch(item.fileUrl);
    const buffer = await blob.arrayBuffer();
    const s3Url = await uploadToS3(buffer, extractPath(item.fileUrl));
    await prisma.libraryItem.update({
      where: { id: item.id },
      data: { fileUrl: s3Url }
    });
  }
}
```

### Decision 6: Environment Variable Storage (vs Secrets Manager)

**Chosen:** Environment variables on EC2 for AWS credentials (for now)

**Rationale:**
- Simpler setup (no additional AWS service)
- EC2 .env file already used for other secrets (DATABASE_URL, NEXTAUTH_SECRET)
- Secrets Manager costs ~$0.40/month per secret (small but unnecessary)
- Can migrate to Secrets Manager later as enhancement

**Alternatives Considered:**
- **AWS Secrets Manager**: More secure, supports rotation, IAM policies
  - Better for production at scale
  - Adds complexity for weekend project
- **AWS Systems Manager Parameter Store**: Free tier available
  - Similar to Secrets Manager, less feature-rich

**Implementation:**
- Add to EC2 `.env` file:
  ```
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  S3_BUCKET_NAME=guitar-strategies-files
  ```
- Lambda environment variables (set in AWS Console):
  ```
  API_URL=https://app.guitarstrategies.com
  CRON_SECRET=<same as EC2>
  ```

### Decision 7: Public S3 Bucket (vs Pre-Signed URLs)

**Chosen:** S3 bucket with public read access, files accessible via direct URLs

**Rationale:**
- Files are non-sensitive (sheet music, lesson materials meant to be shared)
- Simpler implementation (no URL signing logic)
- Same access pattern as current Vercel Blob (public URLs)
- No expiration/refresh logic needed

**Alternatives Considered:**
- **Pre-signed URLs**: Generate temporary URLs with expiration
  - Better security for private content
  - Adds complexity (URL generation, expiration handling, refresh logic)
  - Not needed for public teaching materials

**Implementation:**
- S3 bucket policy allows `s3:GetObject` for all principals
- CORS configuration allows uploads from app domain
- Files accessible via: `https://guitar-strategies-files.s3.amazonaws.com/library/...`

## Architecture Diagrams

### Current State (Transitional)
```
Production (Vercel):          EC2 (Portfolio):
════════════════════          ════════════════

Vercel Hosting                EC2 (Docker)
    ↓                             ↓
Vercel Blob ←─────────────────────┤
Vercel Cron                   (No cron)
Neon DB     ←─────────────────────┤
Resend      ←─────────────────────┘
```

### Target State (Post-Migration)
```
Production (Vercel):          EC2 (Fully AWS):
════════════════════          ════════════════

Vercel Hosting                EC2 (Docker)
Vercel Blob                       ↓
Vercel Cron                   S3 Storage
Neon DB     ←─────────────────────┤
Resend      ←─────────────────────┤
                                  ↑
                         EventBridge → Lambda
                              ↓
                         CloudWatch Logs
```

### Lambda Job Flow
```
EventBridge Rule
(cron: 0 2 * * ? *)
        ↓
Lambda Function
"generate-lessons-cron"
        ↓ HTTPS
/api/cron/generate-lessons
(existing EC2 endpoint)
        ↓
generateFutureLessons()
        ↓
Neon Database
(create lessons)
        ↓
CloudWatch Logs
(execution results)
```

## Risks / Trade-offs

### Risk 1: S3 Migration Data Loss
**Risk:** File migration script fails, some files don't copy to S3, database points to broken URLs

**Mitigation:**
- Run migration script with dry-run mode first (log what would happen)
- Verify each file upload to S3 before updating database
- Keep Vercel Blob URLs in database temporarily (add `oldFileUrl` column)
- Rollback plan: revert database to old URLs if issues found
- Test file access after migration before deleting from Vercel Blob

**Trade-off:** Migration takes longer due to verification steps, but ensures data integrity

### Risk 2: Lambda Timeout on Long-Running Jobs
**Risk:** `generateFutureLessons()` takes too long (> 60 seconds), Lambda times out mid-execution

**Mitigation:**
- Set Lambda timeout to 120 seconds (allows margin for slow API responses)
- Monitor CloudWatch logs for execution duration
- If timeout occurs, optimize API endpoint (add indexes, batch processing)
- Alternative: Split job into smaller chunks (per-teacher Lambdas)

**Trade-off:** Higher timeout = higher cost (minimal), but ensures reliability

### Risk 3: CRON_SECRET Mismatch Between Lambda and EC2
**Risk:** Lambda and EC2 have different CRON_SECRET values, all job executions fail with 401

**Mitigation:**
- Use same secret generation method (e.g., `openssl rand -base64 32`)
- Document exact value in secure notes (1Password, etc.)
- Test manually before setting up EventBridge schedule
- Add clear error logging in API endpoint for auth failures

**Trade-off:** Manual secret management more error-prone than Secrets Manager, but simpler for MVP

### Risk 4: Cost Overruns
**Risk:** AWS costs exceed $50/month budget due to S3 storage, Lambda invocations, or data transfer

**Mitigation:**
- Monitor AWS Cost Explorer weekly
- Set CloudWatch billing alarm at $40 threshold
- Use S3 lifecycle policies to delete old files after 1 year
- Lambda invocations are minimal (1/day = 30/month = free tier)
- S3 storage expected < 5GB = $0.12/month

**Estimated Monthly Costs:**
- EC2 t3.micro: ~$10-15
- S3 storage (5GB): ~$0.12
- S3 requests: ~$0.01
- Lambda (30 invocations): $0 (free tier)
- CloudWatch logs (7-day retention): ~$1
- **Total: ~$12-17/month** (well under $50 budget)

**Trade-off:** None significant—cost risk is low

### Risk 5: EventBridge Schedule Doesn't Trigger
**Risk:** EventBridge rule configured incorrectly, jobs never run automatically

**Mitigation:**
- Test manual Lambda invocation first (AWS Console "Test" button)
- Verify EventBridge rule shows "Enabled" status
- Check CloudWatch logs next morning (after 2 AM UTC)
- Set up CloudWatch alarm for "no Lambda invocations in 24 hours"
- Keep Vercel Cron running temporarily until EventBridge proven reliable

**Trade-off:** Parallel systems running briefly = slight cost increase, but ensures no job failures

### Risk 6: S3 Bucket Policy Too Permissive
**Risk:** Public read access allows anyone to list/download all files (privacy concern)

**Mitigation:**
- Use bucket policy that allows `GetObject` but NOT `ListBucket`
- Files only accessible if you know the exact URL
- No directory browsing possible
- Sensitive files should not be uploaded (teaching materials are public by design)

**Trade-off:** Security vs simplicity—accepting public access for non-sensitive content

## Migration Plan

### Phase 1: S3 Setup and Code Changes (Saturday)

**Step 1.1: Create S3 Infrastructure (30 min)**
- AWS Console → S3 → Create bucket
- Name: `guitar-strategies-files`
- Region: `us-east-1`
- Disable "Block all public access"
- Add bucket policy for public GetObject
- Configure CORS for application domain

**Step 1.2: Update Application Code (1-2 hours)**
- Install dependency: `npm install @aws-sdk/client-s3`
- Update `lib/blob-storage.ts`:
  - Replace Vercel Blob imports with AWS SDK
  - Implement `uploadFileToBlob()` using `PutObjectCommand`
  - Implement `deleteFileFromBlob()` using `DeleteObjectCommand`
  - Keep same function signatures (backward compatible)
- Add AWS environment variables to `.env`
- Test locally with `npm run dev`

**Step 1.3: Data Migration (1 hour)**
- Write migration script: `scripts/migrate-blob-to-s3.ts`
- Query database for all library items and lesson attachments
- Download each file from Vercel Blob
- Upload to S3 with same path structure
- Update database with new S3 URLs
- Verify each file accessible via S3 URL

**Step 1.4: Deploy to EC2 (30 min)**
- SSH to EC2 instance
- Pull latest code: `git pull origin main`
- Rebuild Docker image: `docker build -t guitar-strategies .`
- Restart container: `docker-compose up -d`
- Test file upload/download via EC2 app

### Phase 2: Lambda and EventBridge Setup (Sunday)

**Step 2.1: Create Lambda Function (1 hour)**
- AWS Console → Lambda → Create function
- Name: `generate-lessons-cron`
- Runtime: Node.js 20
- Create basic execution role (auto-generated)
- Add code (inline editor):
  ```javascript
  export const handler = async (event) => {
    const response = await fetch(`${process.env.API_URL}/api/cron/generate-lessons`, {
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    });
    const data = await response.json();
    console.log('Result:', data);
    if (!response.ok) throw new Error(`API failed: ${response.status}`);
    return { statusCode: 200, body: JSON.stringify(data) };
  };
  ```
- Configuration → Environment variables:
  - `API_URL`: `https://app.guitarstrategies.com`
  - `CRON_SECRET`: (copy from EC2 .env)
- Configuration → General:
  - Timeout: 120 seconds
  - Memory: 128 MB

**Step 2.2: Test Lambda Manually (15 min)**
- Lambda Console → Test tab
- Create test event (empty JSON: `{}`)
- Click "Test" button
- Verify response shows successful job execution
- Check CloudWatch logs for output

**Step 2.3: Create EventBridge Rule (30 min)**
- AWS Console → EventBridge → Rules → Create rule
- Name: `daily-lesson-generation`
- Event source: Schedule
- Schedule pattern: Cron expression
- Cron: `0 2 * * ? *` (2 AM UTC daily)
- Target: Lambda function → `generate-lessons-cron`
- Retry policy: Default (2 retries)
- Enable rule

**Step 2.4: Verify Automation (Next Day)**
- Check CloudWatch Logs next morning (after 2 AM UTC)
- Verify Lambda was invoked automatically
- Check database for newly created lessons
- Review CloudWatch metrics for invocation count

### Phase 3: Cleanup (Optional)

**Step 3.1: Remove Vercel Dependencies**
- Delete `vercel.json` cron configuration
- Remove `@vercel/blob` npm package
- Archive Vercel Blob files (download backup)
- Update documentation

**Step 3.2: Documentation**
- Update README with AWS architecture diagram
- Document environment variables needed
- Add troubleshooting guide for Lambda issues

## Rollback Strategy

### If S3 Migration Fails:
1. Keep Vercel Blob URLs in database (don't delete old URLs until verified)
2. Revert code changes to `lib/blob-storage.ts`
3. Redeploy previous version to EC2
4. Files remain accessible via Vercel Blob

### If Lambda Jobs Fail:
1. Disable EventBridge rule (stop automatic triggers)
2. Keep Vercel Cron running (production fallback)
3. Debug Lambda via manual invocations
4. Re-enable EventBridge when fixed

### If Cost Exceeds Budget:
1. Delete S3 files (keep only recent uploads)
2. Reduce CloudWatch log retention to 1 day
3. Reduce Lambda timeout to minimize execution time
4. Consider switching back to Vercel Blob

## Open Questions

### Q1: Should we use S3 Transfer Acceleration for faster uploads?
**Status:** No—not needed for US-based users, adds cost ($0.04/GB)

### Q2: Should we implement S3 lifecycle policies immediately?
**Status:** Defer—can add later if storage costs increase. Start without auto-deletion.

### Q3: Should Lambda retry on API failure?
**Status:** Yes—Lambda default retry (2 attempts) is sufficient. API endpoint handles idempotency.

### Q4: Should we migrate lesson attachments separately from library items?
**Status:** No—migrate all files together in single script. Same S3 bucket, different prefixes.

### Q5: Should we add CloudWatch alarms now or later?
**Status:** Later—manual monitoring sufficient for MVP. Add alarms if failures occur.

## Success Metrics

After implementation, the following should be true:

1. **S3 Storage Working:**
   - Files uploaded via app are stored in S3
   - All files accessible via public S3 URLs
   - No broken image/file links in application
   - Database contains only S3 URLs (no Vercel Blob URLs)

2. **Lambda Scheduling Working:**
   - EventBridge triggers Lambda at 2 AM UTC daily
   - Lambda successfully calls API endpoint
   - API endpoint generates lessons for next 12 weeks
   - CloudWatch logs show successful executions

3. **Cost Within Budget:**
   - Total AWS monthly cost < $50
   - S3 storage < $1/month
   - Lambda executions free (under free tier)

4. **EC2 Independence:**
   - EC2 deployment operates without Vercel Blob
   - EC2 deployment has automated job scheduling
   - Can delete Vercel deployment without breaking EC2

5. **Resume Value:**
   - Can demonstrate 5+ AWS services (EC2, ECR, S3, Lambda, EventBridge)
   - Can explain architecture decisions in interviews
   - Can discuss scaling and cost optimization

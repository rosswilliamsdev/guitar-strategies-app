# AWS Service Expansion - Setup Guide

This guide walks you through setting up AWS services to replace Vercel Blob (→ S3) and Vercel Cron (→ Lambda + EventBridge).

## Prerequisites

- AWS Account with admin access
- AWS CLI installed (optional but recommended)
- Code changes deployed (see tasks.md for completed items)
- **SSH access to your EC2 instance** - See [EC2 SSH Guide](./EC2_SSH_GUIDE.md) if you need help connecting

## Part 1: S3 File Storage Setup

### Step 1: Create S3 Bucket

1. Open [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Configure:
   - **Bucket name**: `guitar-strategies-files`
   - **Region**: `us-east-1`
   - **Object Ownership**: ACLs disabled (recommended)
   - **Block Public Access**: **UNCHECK** "Block all public access" ⚠️
   - Acknowledge the warning (files need to be publicly readable)
4. Click **Create bucket**

### Step 2: Configure Bucket Policy

1. Select your bucket → **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::guitar-strategies-files/*"
    }
  ]
}
```

4. Click **Save changes**

**What this does**: Allows public read access to files (GetObject) but NOT listing the bucket contents (ListBucket).

### Step 3: Configure CORS

1. In your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** → Click **Edit**
3. Paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://app.guitarstrategies.com",
      "https://guitar-strategies-app.vercel.app"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. Click **Save changes**

### Step 4: Create IAM User for S3 Access

1. Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Configure:
   - **User name**: `guitar-strategies-s3-user`
   - **Provide user access to AWS**: Leave UNCHECKED (programmatic access only)
4. Click **Next**
5. **Permissions**:
   - Select **Attach policies directly**
   - Search for and select **AmazonS3FullAccess** (or create custom policy below)
6. Click **Next** → **Create user**

#### (Optional) Custom Policy for Least Privilege

Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::guitar-strategies-files/*"
    }
  ]
}
```

### Step 5: Generate Access Keys

1. Click on the newly created user → **Security credentials** tab
2. Scroll to **Access keys** → Click **Create access key**
3. Select **Application running outside AWS** → Click **Next**
4. (Optional) Add description tag → Click **Create access key**
5. **IMPORTANT**: Copy the Access Key ID and Secret Access Key
   - Download the CSV file for backup
   - You won't be able to see the secret key again!

### Step 6: Update Environment Variables

Add these to your `.env` file (local) and EC2 instance:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."  # From Step 5
AWS_SECRET_ACCESS_KEY="..."  # From Step 5
S3_BUCKET_NAME="guitar-strategies-files"
```

### Step 7: Test Bucket Access

Upload a test file manually via AWS Console:

1. Go to your S3 bucket
2. Click **Upload** → **Add files** → Select any file
3. Click **Upload**
4. Click on the uploaded file → Copy the **Object URL**
5. Open the URL in a browser → Should download/display the file ✅

If you see "Access Denied", review Step 2 (Bucket Policy).

---

## Part 2: Lambda + EventBridge Job Scheduling

### Step 1: Create Lambda Function

1. Open [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
2. Click **Create function**
3. Configure:
   - Select **Author from scratch**
   - **Function name**: `generate-lessons-cron`
   - **Runtime**: Node.js 20.x
   - **Architecture**: `arm64` ← **Use ARM64** (better performance, ~20% cheaper than x86_64)
   - **Permissions**: Create a new role with basic Lambda permissions (default)
4. Click **Create function**

> **💡 Why ARM64?** ARM64 (Graviton2) processors offer better price-performance than x86_64. Your local development machine architecture (Mac M1, Windows, etc.) doesn't affect this choice—Lambda runs on AWS infrastructure.

### Step 2: Add Lambda Function Code

1. In the **Code** tab, replace the default code with:

```javascript
export const handler = async (event) => {
  console.log("🚀 Lesson generation cron triggered", { event });

  try {
    const apiUrl = process.env.API_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!apiUrl || !cronSecret) {
      throw new Error(
        "Missing required environment variables: API_URL or CRON_SECRET",
      );
    }

    console.log(`📡 Calling API: ${apiUrl}/api/cron/generate-lessons`);

    const response = await fetch(`${apiUrl}/api/cron/generate-lessons`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log("📊 API Response:", {
      status: response.status,
      statusText: response.statusText,
      data,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    console.log("✅ Lesson generation completed successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Lesson generation completed",
        result: data,
      }),
    };
  } catch (error) {
    console.error("❌ Lesson generation failed:", error);
    throw error; // Throw to trigger Lambda retry
  }
};
```

2. Click **Deploy**

### Step 3: Configure Environment Variables

**Important Setup:** These environment variables connect Lambda to your deployed application.

1. In the **Configuration** tab → **Environment variables** → Click **Edit**
2. Add these variables:
   - **API_URL**: Your deployed application URL (e.g., `https://app.guitarstrategies.com`)
     - This is the base URL where your Next.js app is hosted (EC2 or Vercel)
     - Lambda will call: `{API_URL}/api/cron/generate-lessons`
   - **CRON_SECRET**: Authentication secret to secure the cron endpoint
     - **If you already have CRON_SECRET in your EC2 `.env`**: Copy that exact value
     - **If you DON'T have it yet**: Generate one now (see below)
3. Click **Save**

#### How to Generate CRON_SECRET (if not already set)

```bash
# Generate a secure random secret
openssl rand -base64 32
```

**Then add it to 3 places:**

1. **Local `.env`**: `CRON_SECRET="your-generated-secret"`
2. **EC2 `.env`**: `CRON_SECRET="your-generated-secret"` (same value)
3. **Lambda Environment Variables**: `CRON_SECRET="your-generated-secret"` (same value)

> **💡 What is API_URL?** This is NOT "just a website"—it's your **deployed Next.js application** running on EC2. Lambda makes an HTTPS request to your API route (`/api/cron/generate-lessons`) the same way a browser or Postman would. The API route then executes the lesson generation logic.

> **🔒 Why CRON_SECRET?** Without it, anyone who knows your EC2 URL could trigger lesson generation. The secret ensures only authorized callers (your Lambda function) can execute the cron job.

### Step 4: Configure Timeout and Memory

1. **Configuration** tab → **General configuration** → Click **Edit**
2. Set:
   - **Timeout**: 120 seconds (2 minutes)
   - **Memory**: 128 MB
3. Click **Save**

### Step 5: Test Lambda Manually

1. Click the **Test** tab
2. Click **Create new event**:
   - **Event name**: `test-event`
   - **Event JSON**: `{}`
3. Click **Save**
4. Click **Test** button

Expected result:

- **Status**: Succeeded (green)
- **Logs** show successful API call
- Check your database for newly generated lessons

If test fails:

- Check CloudWatch logs (link in execution results)
- Verify `CRON_SECRET` matches EC2 `.env`
- Verify `API_URL` is correct and reachable
- Check EC2 app logs for authentication errors

### Step 6: Create EventBridge Schedule

1. Open [Amazon EventBridge Console](https://console.aws.amazon.com/scheduler/home)
2. You'll see several options - select **"EventBridge Schedule"**
   - ✅ **EventBridge Schedule**: "A schedule invokes a target one-time or at regular intervals defined by a cron or rate expression" ← **Choose this one**
   - ❌ EventBridge Scheduled rule (older method, still works but not recommended)
   - ❌ EventBridge Rule with event pattern (for event-driven rules, not scheduled tasks)
   - ❌ EventBridge Pipe (for connecting event sources to targets)
3. Click **Create schedule**

> **💡 Note**: AWS has two ways to create scheduled tasks: **EventBridge Schedules** (newer, simpler) and **EventBridge Rules** (older). Both work identically, but Schedules is AWS's recommended approach for scheduled tasks.

### Step 7: Configure Schedule Details

1. **Schedule name**: `daily-lesson-generation`
2. **Description**: `Trigger lesson generation at 2 AM UTC daily`
3. **Schedule group**: `default`
4. Click **Next**

### Step 8: Configure Schedule Pattern

1. **Occurrence**: Select **Recurring schedule**
2. **Schedule type**: Select **Cron-based schedule**
3. **Cron expression**: `0 2 * * ? *`
   - This means: 2:00 AM UTC every day
   - **Note**: AWS cron uses `?` for day-of-month or day-of-week (one must be `?`)
4. **Flexible time window**: Off
5. **Timezone**: UTC (default)
6. Click **Next**

### Step 9: Select Target

1. **Target API**: AWS Lambda → **Invoke**
2. **Lambda function**: Select `generate-lessons-cron` from dropdown
3. **Payload**: Leave empty (default `{}`)
4. Click **Next**

### Step 10: Configure Settings

1. **Retry policy**:
   - **Maximum age of event**: 1 hour (default)
   - **Retry attempts**: 2 (default)
2. **Dead-letter queue**: None (can add later if needed)
3. **Encryption**: Use default AWS owned key
4. Click **Next**

### Step 11: Review and Create

1. Review all settings:
   - Schedule name: `daily-lesson-generation`
   - Cron expression: `0 2 * * ? *` (2 AM UTC daily)
   - Target: Lambda function `generate-lessons-cron`
2. Click **Create schedule**
3. Verify schedule status shows **Enabled** ✅

---

// This is where I'm at!!

## Part 3: CloudWatch Monitoring

### View Lambda Logs

1. Open [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Navigate: **Logs** → **Log Management** (in left sidebar)
3. Find `/aws/lambda/generate-lessons-cron`
4. Click on log group → View log streams
5. Each Lambda execution creates a new log stream with timestamp

### Configure Log Retention

1. Select log group → **Actions** → **Edit retention setting**
2. Set **Retention**: 7 days
3. Click **Save**

This reduces storage costs while keeping recent logs for debugging.

### View Lambda Metrics

1. CloudWatch Console → **Metrics** → **All metrics**
2. Select **Lambda** → **By Function Name**
3. Select metrics for `generate-lessons-cron`:
   - **Invocations**: How many times Lambda ran
   - **Duration**: How long each execution took
   - **Errors**: Failed executions
   - **Throttles**: Rate limit hits (should be 0)

### (Optional) Create CloudWatch Alarm

Get notified if Lambda fails:

1. CloudWatch Console → **Alarms** → **Create alarm**
2. Select metric: Lambda > Errors > `generate-lessons-cron`
3. Conditions:
   - **Threshold type**: Static
   - **Whenever Errors is**: Greater than `1`
   - **Datapoints to alarm**: 1 out of 1
4. Configure notification:
   - **Create new SNS topic** (for email/SMS alerts)
   - Enter your email address
5. Click **Create alarm**
6. **Check your email** and confirm SNS subscription

---

## Part 4: Data Migration

### Step 1: Run Migration Script (Dry Run)

First, test without making changes:

```bash
npx tsx scripts/migrate-blob-to-s3.ts --dry-run
```

This will:

- ✓ Validate AWS credentials
- ✓ Show which files would be migrated
- ✓ Display source and destination URLs
- ✗ **NOT** actually upload or modify database

Review the output to ensure all files are detected correctly.

### Step 2: Run Migration Script (Execution)

Once dry run looks good, run the actual migration:

```bash
npx tsx scripts/migrate-blob-to-s3.ts
```

This will:

1. Download each file from Vercel Blob
2. Upload to S3
3. Update database with new S3 URL
4. Print progress for each file

**Expected output:**

```
========================================
🚀 Vercel Blob → S3 Migration Script
========================================

✓ Environment variables validated
✓ S3 Bucket: guitar-strategies-files
✓ Region: us-east-1

📚 Migrating Library Items...

Found 15 library items

📦 Migrating: chord-chart.pdf (library/abc123/1234567890-chord-chart.pdf)
   ⬇️  Downloading from Vercel Blob...
   ✓ Downloaded 245632 bytes
   ⬆️  Uploading to S3...
   ✓ Uploaded to: https://guitar-strategies-files.s3.us-east-1.amazonaws.com/...
   💾 Updating database...
   ✓ Database updated

[... more files ...]

========================================
📊 Migration Summary
========================================
Total files:     15
✓ Successful:    15
❌ Failed:        0
⏭️  Skipped:       0
========================================

✅ Migration complete! All files successfully migrated to S3.
```

### Step 3: Verify Migration

1. **Check S3 bucket**: Should contain all files
2. **Test file access**: Open a library item in the app → Should download from S3
3. **Check database**: Run this query to verify no Vercel Blob URLs remain:

```sql
SELECT COUNT(*) FROM "LibraryItem"
WHERE "fileUrl" NOT LIKE '%s3.%'
  AND "fileUrl" NOT LIKE '%amazonaws.com%';
```

Should return `0`.

---

## Part 5: Cleanup and Verification

### Remove Vercel Dependencies

Once S3 and Lambda are working:

1. **Update `vercel.json`**: Comment out or remove cron configuration

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"]
  // Cron removed - now using AWS EventBridge + Lambda
  // "crons": [...]
}
```

2. **Remove `@vercel/blob` package**:

```bash
npm uninstall @vercel/blob
npm install  # Update package-lock.json
```

3. **Commit changes**:

```bash
git add package.json package-lock.json vercel.json
git commit -m "chore: remove Vercel Blob dependency, migrate to S3"
```

### Verify EventBridge Schedule

Wait until the next scheduled execution (2 AM UTC):

1. Check CloudWatch Logs around 2 AM UTC
2. Verify Lambda was invoked automatically (not manually)
3. Check database for newly created lessons
4. Confirm lesson timestamps match EventBridge trigger time

### Monitor Costs

1. Open [AWS Billing Console](https://console.aws.amazon.com/billing/)
2. Click **Cost Explorer** → **Launch Cost Explorer**
3. Review current month costs by service:
   - EC2: ~$10-15/month
   - S3: <$1/month
   - Lambda: $0 (under free tier)
   - CloudWatch: ~$1/month
   - **Total**: ~$12-17/month

### Set Up Billing Alarm

1. CloudWatch Console → **Alarms** → **Create alarm**
2. Select metric: **Billing** > **Total Estimated Charge**
3. Conditions:
   - **Threshold**: Static
   - **Greater than**: $40 (80% of $50 budget)
4. Create SNS topic for email notification
5. Click **Create alarm**

---

## Troubleshooting

### S3 Upload Fails

**Error**: `AccessDenied` or `403 Forbidden`

**Solutions**:

- Verify IAM user has `s3:PutObject` permission
- Check bucket policy allows public read (`s3:GetObject`)
- Verify AWS credentials in `.env` are correct
- Try manually uploading via AWS Console to test bucket permissions

### Lambda Test Fails

**Error**: `401 Unauthorized` from API

**Solutions**:

- Verify `CRON_SECRET` matches in Lambda environment variables AND EC2 `.env`
- Check EC2 app logs for authentication errors
- Test API endpoint manually: `curl -H "Authorization: Bearer YOUR_SECRET" https://app.guitarstrategies.com/api/cron/generate-lessons`

**Error**: `504 Gateway Timeout`

**Solutions**:

- Increase Lambda timeout (Configuration → General → Timeout → 120 seconds)
- Check EC2 app is running and reachable
- Verify API endpoint responds within timeout window

### EventBridge Not Triggering

**Issue**: Lambda doesn't run automatically at 2 AM UTC

**Solutions**:

- Verify EventBridge rule status is **Enabled**
- Check cron expression is correct: `0 2 * * ? *`
- Review CloudWatch Logs → EventBridge should show invocation attempts
- Manually test Lambda first to ensure it works

### Migration Script Fails

**Error**: `Download failed: 403 Forbidden`

**Solutions**:

- Ensure Vercel Blob access is still available
- Check Vercel Blob URLs are still valid
- Try downloading file manually in browser to test

**Error**: `S3 upload failed`

**Solutions**:

- Verify S3 bucket exists and is accessible
- Check AWS credentials are configured correctly
- Ensure IAM user has `s3:PutObject` permission

---

## Success Checklist

Before marking this change as complete:

- [ x] S3 bucket created and configured
- [x ] IAM user created with access keys
- [ x] Environment variables added to `.env` and EC2
- [x ] Test file uploaded to S3 and accessible via URL
- [x ] Lambda function created and deployed
- [ x] Lambda environment variables configured
- [ x] Lambda manual test succeeds
- [x ] EventBridge schedule rule created and enabled
- [ x] CloudWatch logs show successful executions
- [x ] Migration script run successfully (all files on S3)
- [x ] Database verified (no Vercel Blob URLs remain)
- [x ] Vercel dependencies removed from `package.json`
- [x ] Vercel cron configuration removed from `vercel.json`
- [ ] EC2 app tested (upload/download/delete files work)
- [ ] Lambda ran automatically at next scheduled time (2 AM UTC)
- [ ] Billing alarm configured ($40 threshold)
- [ ] Total AWS costs under $50/month

---

## Next Steps

Once complete:

1. **Archive this change**: `/opsx:archive aws-service-expansion`
2. **Update main README**: Document AWS services in architecture section
3. **Monitor for 1 week**: Verify Lambda runs daily without errors
4. **Delete Vercel Blob files**: After confirming S3 migration successful
5. **(Optional) Add CloudWatch alarms**: For Lambda errors, S3 storage limits, etc.

---

## Questions?

Refer to:

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Amazon EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [OpenSpec Tasks](./tasks.md) for detailed implementation steps

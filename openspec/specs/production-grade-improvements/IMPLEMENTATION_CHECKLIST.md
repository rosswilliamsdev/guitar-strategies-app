# Production-Grade CI/CD Implementation Checklist

**Estimated Time:** 6-8 hours total
**Recommended Approach:** Weekend sprint (Saturday: Security, Sunday: Deployment)

---

## Phase 1: Security-First CI/CD (3-4 hours)

### 1.1 Fix Existing Vulnerabilities (30 min)

- [ ] Run `npm audit` to see current vulnerabilities
- [ ] Run `npm audit fix` to auto-fix safe updates
- [ ] Run `npm audit fix --force` for breaking changes (test after!)
- [ ] Run tests to verify nothing broke: `npm test`
- [ ] Run build to verify: `npm run build`
- [ ] Commit fixes: `git commit -m "security: fix npm audit vulnerabilities"`

**Files Changed:**
- `package.json`
- `package-lock.json`

---

### 1.2 Add npm Audit to CI Pipeline (30 min)

**File:** `.github/workflows/ci.yml`

**Add new job BEFORE the `quality` job:**

```yaml
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: false  # Fail build if high/critical vulns found

      - name: Upload audit results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-report
          path: npm-audit.json
```

**Test:**
- [ ] Push to branch, verify security-audit job runs
- [ ] Intentionally add vulnerable package: `npm install lodash@4.17.15`
- [ ] Verify CI fails with security error
- [ ] Remove vulnerable package, verify CI passes

---

### 1.3 Add Docker Image Scanning with Trivy (45 min)

**File:** `.github/workflows/ci.yml`

**Update the `docker` job to add Trivy scanning:**

```yaml
  docker:
    needs: [quality, security-audit]  # ← Add security-audit dependency
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        env:
          ECR_REPO: ${{ secrets.ECR_REPO }}
          IMAGE_TAG: ${{ github.sha }}
          DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy"
          RESEND_API_KEY: "re_dummy_key_for_build"
          OPENAI_API_KEY: "sk-dummy_key_for_build"
        run: |
          docker build -t $ECR_REPO:$IMAGE_TAG .

      # NEW: Scan image for vulnerabilities
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ secrets.ECR_REPO }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail if critical/high vulns found

      # NEW: Upload scan results to GitHub Security tab
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      # Only push if scan passed
      - name: Push Docker image to ECR
        env:
          ECR_REPO: ${{ secrets.ECR_REPO }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker push $ECR_REPO:$IMAGE_TAG
```

**Key Changes:**
- ❌ Remove `docker push $ECR_REPO:latest` (stop using mutable tags)
- ✅ Add Trivy scan before push
- ✅ Upload SARIF to GitHub Security tab
- ✅ Fail build if critical/high vulnerabilities found

**Test:**
- [ ] Push to main branch
- [ ] Verify Trivy scan runs and passes
- [ ] Check GitHub Security tab for scan results
- [ ] Verify image pushed with commit hash (not "latest")

---

### 1.4 Configure Dependabot (15 min)

**File:** `.github/dependabot.yml` (create new file)

```yaml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "security"
    commit-message:
      prefix: "chore(deps)"

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    labels:
      - "dependencies"
      - "docker"
    commit-message:
      prefix: "chore(docker)"

  # GitHub Actions versions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    labels:
      - "dependencies"
      - "github-actions"
    commit-message:
      prefix: "chore(ci)"
```

**Test:**
- [ ] Commit and push dependabot.yml
- [ ] Wait 24-48 hours for first Dependabot PRs
- [ ] Review auto-created PRs
- [ ] Merge one to verify workflow works

---

### 1.5 Document Security in README (15 min)

**File:** `README.md`

**Add section after "Tech Stack":**

```markdown
## 🔒 Security & Operations

### Automated Security Scanning
- **npm audit** - Dependency vulnerability scanning on every PR
- **Trivy** - Docker image vulnerability scanning (OS + Node.js CVEs)
- **Dependabot** - Automated security patch PRs (weekly)
- **SARIF Upload** - Vulnerability tracking in GitHub Security tab

### CI/CD Pipeline
- **Type checking** - TypeScript strict mode (`tsc --noEmit`)
- **Linting** - ESLint with Next.js config
- **Unit tests** - Vitest (100% API route coverage)
- **E2E tests** - Playwright (15 test suites covering auth, scheduling, invoicing)
- **Build verification** - Ensures production builds succeed
- **Security gates** - Blocks PRs with high/critical vulnerabilities

### Deployment
- **Image Registry** - Amazon ECR with commit-hash tagging
- **Immutable Tags** - Every deploy uses exact commit hash (no "latest")
- **Health Checks** - `/api/health` endpoint verifies DB, S3, and system health
- **Automated Rollback** - Failed health checks trigger automatic rollback
```

**Commit:**
```bash
git add .github/dependabot.yml .github/workflows/ci.yml README.md
git commit -m "security: add automated scanning and Dependabot"
```

---

## Phase 2: Deployment Automation (3-4 hours)

### 2.1 Create Health Check Endpoint (30 min)

**File:** `app/api/health/route.ts` (create new file)

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency_ms?: number; error?: string };
    s3: { status: string; latency_ms?: number; error?: string };
    environment: { status: string; missing?: string[] };
  };
  version: string;
  uptime_seconds: number;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck['checks'] = {
    database: { status: 'unknown' },
    s3: { status: 'unknown' },
    environment: { status: 'unknown' },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      latency_ms: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check S3 connectivity (if configured)
  try {
    if (process.env.AWS_REGION && process.env.S3_BUCKET_NAME) {
      const s3Start = Date.now();
      const s3Client = new S3Client({ region: process.env.AWS_REGION });
      await s3Client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
      checks.s3 = {
        status: 'ok',
        latency_ms: Date.now() - s3Start,
      };
    } else {
      checks.s3 = { status: 'not_configured' };
    }
  } catch (error) {
    checks.s3 = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check critical environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = {
    status: missingVars.length === 0 ? 'ok' : 'error',
    ...(missingVars.length > 0 && { missing: missingVars }),
  };

  // Determine overall status
  const hasErrors = Object.values(checks).some(c => c.status === 'error');
  const status: HealthCheck['status'] = hasErrors ? 'unhealthy' : 'healthy';

  const response: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.IMAGE_TAG || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
  };

  const httpStatus = status === 'healthy' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}
```

**Test:**
- [ ] Start dev server: `npm run dev`
- [ ] Hit endpoint: `curl http://localhost:3000/api/health`
- [ ] Verify response shows healthy status
- [ ] Temporarily break DB connection, verify returns 503
- [ ] Fix DB connection, verify returns 200 again

---

### 2.2 Add SSH Key to GitHub Secrets (15 min)

**Generate deployment key (if not exists):**

```bash
# On your local machine:
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Copy public key to EC2 instance:
ssh-copy-id -i ~/.ssh/github_deploy_key.pub ec2-user@your-ec2-ip

# Test SSH works:
ssh -i ~/.ssh/github_deploy_key ec2-user@your-ec2-ip "echo 'SSH works'"
```

**Add to GitHub Secrets:**

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add new secret: `EC2_SSH_KEY`
   - Value: Contents of `~/.ssh/github_deploy_key` (private key)
3. Add new secret: `EC2_HOST`
   - Value: Your EC2 public IP or hostname
4. Add new secret: `EC2_USER`
   - Value: `ec2-user` (or ubuntu, depends on AMI)

**Checklist:**
- [ ] SSH key generated
- [ ] Public key added to EC2 `~/.ssh/authorized_keys`
- [ ] Private key added to GitHub Secrets as `EC2_SSH_KEY`
- [ ] EC2 host added as `EC2_HOST`
- [ ] EC2 user added as `EC2_USER`

---

### 2.3 Create Deployment Workflow (60 min)

**File:** `.github/workflows/deploy.yml` (create new file)

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Image tag to deploy (commit SHA)'
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Verify image exists in ECR
        env:
          ECR_REPO: ${{ secrets.ECR_REPO }}
          IMAGE_TAG: ${{ inputs.image_tag }}
        run: |
          echo "Checking if image exists: $ECR_REPO:$IMAGE_TAG"
          docker manifest inspect $ECR_REPO:$IMAGE_TAG > /dev/null || {
            echo "Error: Image $ECR_REPO:$IMAGE_TAG not found in ECR"
            exit 1
          }
          echo "✅ Image verified"

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to EC2
        env:
          ECR_REPO: ${{ secrets.ECR_REPO }}
          IMAGE_TAG: ${{ inputs.image_tag }}
          EC2_HOST: ${{ secrets.EC2_HOST }}
          EC2_USER: ${{ secrets.EC2_USER }}
        run: |
          ssh -i ~/.ssh/deploy_key $EC2_USER@$EC2_HOST << 'EOF'
            set -e

            echo "🚀 Starting deployment of $ECR_REPO:$IMAGE_TAG"

            # Login to ECR
            aws ecr get-login-password --region us-east-1 | \
              docker login --username AWS --password-stdin $ECR_REPO

            # Pull new image
            echo "📦 Pulling new image..."
            docker pull $ECR_REPO:$IMAGE_TAG

            # Tag currently running container as rollback
            CURRENT_CONTAINER=$(docker ps --filter "ancestor=$ECR_REPO" --format "{{.ID}}" | head -1)
            if [ ! -z "$CURRENT_CONTAINER" ]; then
              CURRENT_IMAGE=$(docker inspect $CURRENT_CONTAINER --format="{{.Image}}")
              docker tag $CURRENT_IMAGE rollback-image
              echo "✅ Tagged current image as rollback-image"
            fi

            # Stop current container
            echo "🛑 Stopping current container..."
            docker-compose down || true

            # Update docker-compose to use new image
            export IMAGE_TAG=$IMAGE_TAG

            # Start new container
            echo "▶️  Starting new container..."
            docker-compose up -d

            echo "✅ Container started, waiting for health check..."
          EOF

      - name: Health Check with Retries
        env:
          EC2_HOST: ${{ secrets.EC2_HOST }}
        run: |
          MAX_RETRIES=10
          RETRY_DELAY=5

          for i in $(seq 1 $MAX_RETRIES); do
            echo "Health check attempt $i/$MAX_RETRIES..."

            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
              http://$EC2_HOST:3000/api/health || echo "000")

            if [ "$HTTP_CODE" = "200" ]; then
              echo "✅ Health check passed!"
              curl -s http://$EC2_HOST:3000/api/health | jq .
              exit 0
            else
              echo "⚠️  Health check failed (HTTP $HTTP_CODE), retrying in ${RETRY_DELAY}s..."
              sleep $RETRY_DELAY
            fi
          done

          echo "❌ Health check failed after $MAX_RETRIES attempts"
          exit 1

      - name: Rollback on Failure
        if: failure()
        env:
          EC2_HOST: ${{ secrets.EC2_HOST }}
          EC2_USER: ${{ secrets.EC2_USER }}
        run: |
          echo "🔄 Rolling back to previous version..."
          ssh -i ~/.ssh/deploy_key $EC2_USER@$EC2_HOST << 'EOF'
            docker-compose down
            docker tag rollback-image $ECR_REPO:rollback
            export IMAGE_TAG=rollback
            docker-compose up -d
            echo "✅ Rollback complete"
          EOF

      - name: Cleanup
        if: always()
        run: rm -f ~/.ssh/deploy_key

      - name: Notify Success
        if: success()
        run: |
          echo "🎉 Deployment successful!"
          echo "Image: ${{ secrets.ECR_REPO }}:${{ inputs.image_tag }}"
          echo "Deployed at: $(date)"
```

**Test:**
- [ ] Push workflow file to GitHub
- [ ] Go to Actions tab → Deploy to Production
- [ ] Click "Run workflow"
- [ ] Enter a valid commit hash from ECR
- [ ] Watch deployment execute
- [ ] Verify health check passes
- [ ] Verify app is running with new version

---

### 2.4 Update docker-compose for Dynamic Tags (15 min)

**File:** `docker-compose.yml` (update)

**Before:**
```yaml
services:
  app:
    image: your-ecr-repo:latest
```

**After:**
```yaml
services:
  app:
    image: ${ECR_REPO}:${IMAGE_TAG:-latest}
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

**Create `.env.deploy` on EC2:**
```bash
ECR_REPO=123456789.dkr.ecr.us-east-1.amazonaws.com/guitar-strategies
IMAGE_TAG=abc123f  # Updated by deploy script
```

**Update deploy script to use env vars:**
- [ ] Modify `docker-compose up` to read from `.env.deploy`
- [ ] Test locally with different IMAGE_TAG values
- [ ] Verify container starts with correct image

---

### 2.5 Document Deployment Process (15 min)

**File:** `README.md`

**Add deployment section:**

```markdown
## 🚀 Deployment

### Automated Deployment (Recommended)

**Deploy to production via GitHub Actions:**

1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Enter commit SHA from ECR (e.g., `abc123f`)
4. Workflow will:
   - ✅ Verify image exists
   - ✅ Deploy to EC2
   - ✅ Run health checks
   - ✅ Auto-rollback on failure

**Deploy via CLI:**
```bash
gh workflow run deploy.yml -f image_tag=abc123f
```

### Manual Deployment (Fallback)

**SSH to EC2:**
```bash
ssh ec2-user@your-ec2-ip

# Pull latest image
docker pull $ECR_REPO:abc123f

# Update docker-compose
export IMAGE_TAG=abc123f
docker-compose down
docker-compose up -d

# Verify health
curl http://localhost:3000/api/health
```

### Rollback

**Automated:** Failed health checks trigger automatic rollback

**Manual rollback to previous version:**
```bash
# On EC2 instance:
docker-compose down
docker tag rollback-image $ECR_REPO:rollback
export IMAGE_TAG=rollback
docker-compose up -d
```

### Health Check Endpoint

**Check application health:**
```bash
curl http://your-ec2-ip:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latency_ms": 45 },
    "s3": { "status": "ok", "latency_ms": 120 },
    "environment": { "status": "ok" }
  },
  "version": "abc123f",
  "uptime_seconds": 3600
}
```
```

---

## Phase 3: Semantic Versioning (Optional - 1 hour)

### 3.1 Create Release Workflow (30 min)

**File:** `.github/workflows/release.yml` (create new file)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger on version tags (v1.2.3)

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: |
          TAG=${GITHUB_REF#refs/tags/}
          echo "tag=$TAG" >> $GITHUB_OUTPUT
          echo "version=${TAG#v}" >> $GITHUB_OUTPUT

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Tag image with version
        env:
          ECR_REPO: ${{ secrets.ECR_REPO }}
          COMMIT_SHA: ${{ github.sha }}
          VERSION: ${{ steps.version.outputs.tag }}
        run: |
          # Pull image built from this commit
          docker pull $ECR_REPO:$COMMIT_SHA

          # Tag with semantic version
          docker tag $ECR_REPO:$COMMIT_SHA $ECR_REPO:$VERSION
          docker push $ECR_REPO:$VERSION

          echo "✅ Released $VERSION"

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.version.outputs.tag }}
          release_name: Release ${{ steps.version.outputs.tag }}
          body: |
            ## Changes in ${{ steps.version.outputs.tag }}

            Docker image: `${{ secrets.ECR_REPO }}:${{ steps.version.outputs.tag }}`

            Deploy with:
            ```bash
            gh workflow run deploy.yml -f image_tag=${{ steps.version.outputs.tag }}
            ```
          draft: false
          prerelease: false
```

**Test:**
- [ ] Tag a release: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Verify release workflow runs
- [ ] Check ECR for versioned image
- [ ] Verify GitHub Release created

---

### 3.2 Document Versioning Strategy (15 min)

**File:** `VERSIONING.md` (create new)

```markdown
# Versioning Strategy

## Image Tags

We use multiple tagging strategies for different purposes:

### Commit Hash (Primary)
- **Format:** `abc123f` (short commit SHA)
- **Created:** Every push to main
- **Use:** Exact version tracking, audit trail
- **Immutable:** Yes

### Semantic Version (Releases)
- **Format:** `v1.2.3` (SemVer)
- **Created:** On git tag push
- **Use:** Release milestones, changelog
- **Immutable:** Yes

### Environment Pointer (Operational)
- **Format:** `production`, `staging`
- **Updated:** After successful deploy
- **Use:** "What's in prod right now?"
- **Immutable:** No (updates to point to new versions)

## Release Process

1. **Develop and test features**
2. **Merge to main** → Triggers CI → Builds image with commit hash
3. **Create release tag:** `git tag v1.2.3 && git push origin v1.2.3`
4. **Release workflow** → Tags image with version
5. **Deploy:** `gh workflow run deploy.yml -f image_tag=v1.2.3`

## Rollback Process

**Option 1: Deploy previous version tag**
```bash
gh workflow run deploy.yml -f image_tag=v1.2.2
```

**Option 2: Deploy specific commit**
```bash
gh workflow run deploy.yml -f image_tag=abc123f
```

**Option 3: Use rollback tag (emergency)**
```bash
# Automated rollback already happened
# Or manually: deploy.yml already set rollback-image
```
```

---

## Testing Your Implementation

### Security Tests

**Test 1: npm audit blocks vulnerable dependencies**
```bash
# Add vulnerable package
npm install lodash@4.17.15

# Push to branch, open PR
git add package.json package-lock.json
git commit -m "test: add vulnerable dependency"
git push origin test-security

# Expected: CI fails with npm audit error
# Fix: Remove vulnerable package
```

**Test 2: Trivy blocks vulnerable Docker images**
```bash
# Use old Node.js base image with known CVEs
# Edit dockerfile: FROM node:18.0.0-alpine  (old version)

# Push to main
# Expected: Trivy scan fails, image not pushed to ECR
```

---

### Deployment Tests

**Test 1: Successful deployment**
```bash
# Deploy current version
gh workflow run deploy.yml -f image_tag=$(git rev-parse --short HEAD)

# Expected:
# ✅ Image verified
# ✅ Deployed to EC2
# ✅ Health check passed (200 OK)
# ✅ No rollback triggered
```

**Test 2: Failed health check triggers rollback**
```bash
# Break database connection in .env on EC2 (temporarily)
# Deploy new version
gh workflow run deploy.yml -f image_tag=abc123f

# Expected:
# ✅ Image verified
# ✅ Deployed to EC2
# ❌ Health check failed (503)
# ✅ Automatic rollback executed
# ✅ Old version running again
```

**Test 3: Deploy non-existent image fails gracefully**
```bash
# Try to deploy image that doesn't exist
gh workflow run deploy.yml -f image_tag=fakehash

# Expected:
# ❌ Image verification fails
# ❌ Deployment aborted (doesn't reach EC2)
```

---

## Monitoring Your New Pipeline

### GitHub Security Tab
- Navigate to: Security → Code scanning alerts
- View: Trivy scan results
- Filter: By severity (Critical, High, Medium, Low)

### GitHub Actions
- View: Actions tab → CI workflow runs
- Check: Security audit job results
- Review: Trivy scan output

### Dependabot
- View: Pull requests with "dependencies" label
- Review: Auto-created security patch PRs
- Merge: After CI passes

---

## Success Criteria

After implementation, you should have:

### Security ✅
- [ ] npm audit runs on every PR
- [ ] Trivy scans Docker images before ECR push
- [ ] Dependabot creates weekly update PRs
- [ ] GitHub Security tab shows vulnerability status
- [ ] CI blocks PRs with high/critical vulnerabilities

### Deployment ✅
- [ ] One-click deploys via GitHub Actions
- [ ] Health check endpoint returns 200 OK
- [ ] Automated rollback on failed health checks
- [ ] Exact version tracking (commit hash)
- [ ] No more "latest" tag confusion

### Documentation ✅
- [ ] README documents security practices
- [ ] README documents deployment process
- [ ] VERSIONING.md explains tagging strategy
- [ ] Health check endpoint documented

### Resume ✅
- [ ] Can demo automated security scanning
- [ ] Can explain CI/CD pipeline in interviews
- [ ] Can show GitHub Security tab
- [ ] Can perform one-click deploy in demo

---

## Troubleshooting

### CI Fails with "npm audit found vulnerabilities"
**Fix:** Run `npm audit fix` locally, test, commit

### Trivy scan times out
**Fix:** Increase timeout in workflow (default 5min → 10min)

### Deployment hangs at health check
**Fix:**
- SSH to EC2, check container logs: `docker logs <container>`
- Verify health endpoint works: `curl localhost:3000/api/health`
- Check database connectivity from EC2

### SSH key authentication fails
**Fix:**
- Verify public key in EC2 `~/.ssh/authorized_keys`
- Verify private key in GitHub Secrets
- Test SSH manually: `ssh -i ~/.ssh/deploy_key ec2-user@ec2-ip`

### Image not found in ECR
**Fix:**
- Verify image was pushed: Check ECR console
- Verify tag matches: `docker images` vs workflow input
- Check CI logs for push failures

---

## Next Steps After Implementation

Once production-grade CI/CD is running:

1. **Monitor for 1 week** - Ensure stability
2. **Update resume** - Add new technical skills
3. **Document for interviews** - Practice explaining the pipeline
4. **Show your mentor** - Get feedback on implementation
5. **Consider adding:**
   - Staging environment
   - CloudWatch dashboards
   - Slack/Discord deploy notifications
   - Performance testing in CI

---

**Ready to start?** Begin with Phase 1.1 (Fix Existing Vulnerabilities)

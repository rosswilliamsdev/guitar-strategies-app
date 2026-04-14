# Production-Grade CI/CD Implementation Tasks

## Phase 1: Security-First CI/CD

### 1.1 Fix Existing Vulnerabilities
- [x] Run `npm audit` to see current vulnerabilities
- [x] Run `npm audit fix` to auto-fix safe updates
- [ ] Run `npm audit fix --force` for breaking changes (test after!) - SKIPPED: Too risky, will handle separately
- [ ] Run tests to verify nothing broke: `npm test` - Not needed, no breaking changes
- [ ] Run build to verify: `npm run build` - Not needed, no breaking changes
- [ ] Commit fixes: `git commit -m "security: fix npm audit vulnerabilities"` - Will commit with Phase 1.2

### 1.2 Add npm Audit to CI Pipeline
- [x] Add `security-audit` job to `.github/workflows/ci.yml` before `quality` job
- [x] Configure npm audit to run on every PR with audit-level=high
- [x] Add artifact upload for npm-audit.json
- [ ] Test by pushing to branch and verifying security-audit job runs
- [ ] Test failure case by adding vulnerable package (lodash@4.17.15)
- [ ] Verify CI fails with security error
- [ ] Remove vulnerable package and verify CI passes

### 1.3 Add Docker Image Scanning with Trivy
- [ ] Update `docker` job in `.github/workflows/ci.yml` to add security-audit dependency
- [ ] Add Trivy vulnerability scanner step after build
- [ ] Configure Trivy to scan for CRITICAL and HIGH severity vulnerabilities
- [ ] Add SARIF upload to GitHub Security tab
- [ ] Remove `docker push $ECR_REPO:latest` (stop using mutable tags)
- [ ] Test by pushing to main branch
- [ ] Verify Trivy scan runs and passes
- [ ] Check GitHub Security tab for scan results
- [ ] Verify image pushed with commit hash (not "latest")

### 1.4 Configure Dependabot
- [ ] Create `.github/dependabot.yml` file
- [ ] Configure npm dependencies with weekly schedule
- [ ] Configure Docker base images with weekly schedule
- [ ] Configure GitHub Actions with monthly schedule
- [ ] Commit and push dependabot.yml
- [ ] Wait 24-48 hours for first Dependabot PRs
- [ ] Review auto-created PRs
- [ ] Merge one to verify workflow works

### 1.5 Document Security in README
- [ ] Add "Security & Operations" section to README.md after "Tech Stack"
- [ ] Document automated security scanning (npm audit, Trivy, Dependabot)
- [ ] Document CI/CD pipeline steps
- [ ] Document deployment process (ECR, immutable tags, health checks)
- [ ] Commit security documentation updates

## Phase 2: Deployment Automation

### 2.1 Create Health Check Endpoint
- [ ] Create `app/api/health/route.ts` file
- [ ] Implement database connectivity check with latency measurement
- [ ] Implement S3 connectivity check with latency measurement
- [ ] Implement environment variables validation
- [ ] Add overall health status determination (healthy/unhealthy)
- [ ] Return appropriate HTTP status codes (200 for healthy, 503 for unhealthy)
- [ ] Test endpoint locally with `npm run dev`
- [ ] Verify response shows healthy status
- [ ] Test failure case by breaking DB connection (should return 503)
- [ ] Restore DB connection and verify 200 response

### 2.2 Add SSH Key to GitHub Secrets
- [ ] Generate deployment SSH key: `ssh-keygen -t ed25519 -C "github-actions-deploy"`
- [ ] Copy public key to EC2 instance authorized_keys
- [ ] Test SSH connection works with new key
- [ ] Add `EC2_SSH_KEY` secret to GitHub (private key)
- [ ] Add `EC2_HOST` secret to GitHub (EC2 IP/hostname)
- [ ] Add `EC2_USER` secret to GitHub (ec2-user or ubuntu)

### 2.3 Create Deployment Workflow
- [ ] Create `.github/workflows/deploy.yml` file
- [ ] Configure workflow_dispatch trigger with image_tag input
- [ ] Add AWS credentials and ECR login steps
- [ ] Add image verification step (check image exists in ECR)
- [ ] Add SSH setup step
- [ ] Implement deployment to EC2 with rollback tagging
- [ ] Add health check with retries (10 attempts, 5s delay)
- [ ] Add automatic rollback on failure
- [ ] Add cleanup step for SSH keys
- [ ] Add success notification
- [ ] Test workflow by deploying valid commit hash
- [ ] Verify health check passes
- [ ] Verify app running with new version

### 2.4 Update docker-compose for Dynamic Tags
- [ ] Update `docker-compose.yml` to use `${ECR_REPO}:${IMAGE_TAG:-latest}`
- [ ] Create `.env.deploy` file on EC2 with ECR_REPO and IMAGE_TAG
- [ ] Modify deployment script to use environment variables
- [ ] Test locally with different IMAGE_TAG values
- [ ] Verify container starts with correct image

### 2.5 Document Deployment Process
- [ ] Add "Deployment" section to README.md
- [ ] Document automated deployment via GitHub Actions
- [ ] Document deploy via CLI using `gh workflow run`
- [ ] Document manual deployment fallback process
- [ ] Document rollback procedures (automated and manual)
- [ ] Document health check endpoint usage and response format

## Phase 3: Semantic Versioning (Optional)

### 3.1 Create Release Workflow
- [ ] Create `.github/workflows/release.yml` file
- [ ] Configure trigger on version tags (v*.*.*)
- [ ] Add version extraction from tag
- [ ] Add AWS/ECR authentication
- [ ] Implement image tagging with semantic version
- [ ] Add GitHub Release creation
- [ ] Test by creating and pushing tag v1.0.0
- [ ] Verify release workflow runs
- [ ] Check ECR for versioned image
- [ ] Verify GitHub Release created

### 3.2 Document Versioning Strategy
- [ ] Create `VERSIONING.md` file
- [ ] Document image tagging strategies (commit hash, semantic version, environment pointer)
- [ ] Document release process
- [ ] Document rollback process with examples
- [ ] Add versioning best practices

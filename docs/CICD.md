# Privora — CI/CD Pipeline Guide

## Overview

Privora uses GitHub Actions for fully automated CI/CD with:
- **CI**: Tests + Lint + Security scan on every push/PR
- **CD Staging**: Auto-deploy on push to `develop`
- **CD Production**: Auto-deploy on push to `main` (with approval gate)
- **Rollback**: One-click via GitHub Actions manual dispatch

---

## Branching Strategy

```
main          ─── Production (protected, requires PR review)
develop       ─── Staging (auto-deploys on push)
feature/*     ─── Feature development (CI runs, no deploy)
fix/*         ─── Bug fixes
```

**Rules enforced via CODEOWNERS:**
- `main` and `develop` require at least 1 reviewer approval
- No direct pushes to `main` (configure via GitHub Branch Protection Rules)

---

## Pipeline Flow

```
Push / PR
   │
   ▼
CI Workflow (ci.yml)
   ├── Backend ESLint
   ├── Backend Jest tests (SQLite in-memory — no DB needed)
   ├── Backend npm audit
   ├── Backend secret scan
   └── Frontend Vite build
         │
         ├── [feature/*] ── STOP (no deploy)
         │
         ├── [develop] ──── CD Staging (cd-staging.yml)
         │                    ├── Build backend Docker image → push to ECR :staging
         │                    ├── Build frontend Docker image → push to ECR :staging
         │                    ├── SSH deploy to staging EC2
         │                    └── Health check → Slack notify
         │
         └── [main] ──────── CD Production (cd-production.yml)
                               ├── Build backend Docker image → push to ECR :v-<sha>,:latest
                               ├── Build frontend Docker image → push to ECR :v-<sha>,:latest
                               ├── [Optional: manual approval gate]
                               ├── SSH deploy to production EC2
                               ├── Health check → auto-rollback on failure
                               └── Slack notify
```

---

## Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM key for ECR push | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret | `wJalrXUtn...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `ECR_REGISTRY` | ECR registry URL | `123456789.dkr.ecr.us-east-1.amazonaws.com` |
| `EC2_HOST_STAGING` | Staging server IP/hostname | `54.123.45.67` |
| `EC2_HOST_PRODUCTION` | Production server IP/hostname | `54.234.56.78` |
| `EC2_USER` | SSH user on EC2 | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key (PEM content) | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | `https://hooks.slack.com/...` |

### AWS Setup (one-time)

1. **Create ECR repositories:**
   ```bash
   aws ecr create-repository --repository-name privora-backend --region us-east-1
   aws ecr create-repository --repository-name privora-frontend --region us-east-1
   ```

2. **Create IAM user for GitHub Actions** with policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability",
                    "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
                    "ecr:CompleteLayerUpload", "ecr:BatchGetImage"],
         "Resource": "*"
       }
     ]
   }
   ```

3. **EC2 instance IAM role** — attach `AmazonEC2ContainerRegistryReadOnly`

---

## EC2 Server Setup

Run once on both staging and production servers:

```bash
# Clone repo to get setup script
git clone https://github.com/0xBassam/Bassam.git /tmp/privora
cd /tmp/privora

# Run setup (installs Docker, Docker Compose, creates /opt/privora/)
sudo bash scripts/ec2-setup.sh production   # or staging

# Fill in secrets
sudo nano /opt/privora/.env.production
```

### Environment file (`/opt/privora/.env.production`)

```env
NODE_ENV=production
DB_NAME=privora_db
DB_USER=privora
DB_PASSWORD=<strong-random-password>
JWT_SECRET=<minimum-64-char-random-string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
OTP_EXPIRES_MINUTES=10
OTP_LENGTH=6
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<smtp-password>
EMAIL_FROM=Privora <noreply@yourdomain.com>
ENCRYPTION_KEY=<exactly-32-chars>
FRONTEND_URL=https://yourdomain.com
```

---

## Image Tagging Strategy

| Environment | Backend Tag | Frontend Tag | Also tagged as |
|------------|-------------|--------------|----------------|
| Staging | `staging-a1b2c3d4` | `staging-a1b2c3d4` | `:staging` |
| Production | `v-a1b2c3d4` | `v-a1b2c3d4` | `:latest` |

The 8-char SHA suffix enables pinpoint rollback to any previous deploy.

---

## Rollback

### Automatic (production only)
If the post-deployment health check fails, the pipeline automatically SSHs back into EC2 and runs `rollback.sh` to restore the previous image version.

### Manual
1. Go to **Actions → Rollback — Manual → Run workflow**
2. Select environment: `production` or `staging`
3. Optionally specify an exact image tag (e.g. `v-a1b2c3d4`), or leave empty to restore the last known good version
4. Enter a reason (logged to Slack)

---

## Health Check

Every deployment validates the backend health endpoint:
```
GET /api/v1/health
→ 200 { "data": { "status": "healthy" } }
```

- **Staging**: 5 retries × 10s interval
- **Production**: 6 retries × 15s interval (with 30s initial wait)
- **Failure action**: automatic rollback (production) or manual fix (staging)

---

## Branch Protection Rules (configure in GitHub)

**For `main`:**
- Require pull request reviews: **1 approval**
- Require status checks to pass: `ci-gate`
- Require branches to be up to date before merging
- Restrict who can push: admins only

**For `develop`:**
- Require pull request reviews: **1 approval**
- Require status checks to pass: `ci-gate`

---

## CI Job Details

| Job | Trigger | Time (est.) |
|-----|---------|-------------|
| `backend-lint` | All pushes/PRs | ~1 min |
| `backend-test` | All pushes/PRs | ~2 min (SQLite in-memory) |
| `backend-security` | All pushes/PRs | ~1 min |
| `frontend-build` | All pushes/PRs | ~3 min |
| `ci-gate` | After all above | <1 min |

---

## Deployment Times (est.)

| Step | Staging | Production |
|------|---------|------------|
| CI checks | ~5 min | ~5 min |
| Docker build + ECR push | ~4 min | ~4 min |
| EC2 deploy | ~1 min | ~1 min |
| Health check | ~1 min | ~2 min |
| **Total** | **~11 min** | **~12 min** |

---

## Security (DevSecOps)

1. **npm audit** runs on every CI — fails on `high` or `critical` vulnerabilities
2. **Secret scanning** — custom grep pattern blocks any hardcoded credentials in `src/`
3. **No secrets in code** — all secrets via GitHub Secrets → environment variables
4. **Non-root Docker user** — backend Dockerfile runs as `privora` user
5. **CODEOWNERS** — all changes require owner review
6. **ECR image scanning** — enable in AWS Console: ECR → Repository → Scan on push

---

## Slack Notifications

| Event | Color | Message |
|-------|-------|---------|
| CI failed | Red | Branch + actor + link to run |
| Staging deployed | Green | SHA + actor |
| Staging failed | Red | SHA + actor |
| Production deployed | Green | SHA + actor + health check confirmed |
| Production failed + rollback | Red | SHA + actor + rollback triggered |
| Manual rollback | Yellow | Environment + reason + actor |

---

## Troubleshooting

**CI fails: `eslint` not found**
→ Run `npm ci` in `backend/` — eslint is in devDependencies

**CD fails: ECR push access denied**
→ Verify `AWS_ACCESS_KEY_ID` secret and IAM policy includes ECR push permissions

**Deploy fails: SSH timeout**
→ Check EC2 security group allows inbound port 22 from GitHub Actions IPs

**Health check fails after deploy**
→ Check backend logs: `docker logs privora_backend --tail 100`
→ Check environment file: `cat /opt/privora/.env.production`

**Rollback state file missing**
→ First deployment has no previous version; use manual rollback with explicit image tag

---

*Last updated: Phase 2+3 — Privora CI/CD Pipeline*

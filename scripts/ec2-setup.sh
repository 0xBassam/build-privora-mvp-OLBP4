#!/usr/bin/env bash
# ec2-setup.sh — One-time EC2 instance setup for Privora deployment
# Run once on a fresh Ubuntu 22.04 EC2 instance as root or with sudo.
set -euo pipefail

DEPLOY_DIR="/opt/privora"
ENVIRONMENT="${1:-production}"  # production | staging

log() { echo "[SETUP] $*"; }

log "Setting up Privora EC2 instance (${ENVIRONMENT})..."

# ─── System updates ───────────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y curl unzip jq awscli

# ─── Install Docker ───────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu
  systemctl enable docker
  systemctl start docker
fi

# ─── Install Docker Compose v2 ───────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin..."
  COMPOSE_VERSION="2.24.5"
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# ─── Create deployment directory structure ────────────────────────────────────
log "Creating deployment directories..."
mkdir -p "${DEPLOY_DIR}/scripts"
mkdir -p "${DEPLOY_DIR}/logs"

# Copy scripts
cp "$(dirname "$0")/deploy.sh" "${DEPLOY_DIR}/scripts/deploy.sh"
cp "$(dirname "$0")/rollback.sh" "${DEPLOY_DIR}/scripts/rollback.sh"
chmod +x "${DEPLOY_DIR}/scripts/"*.sh

# Copy docker-compose.yml
cp docker-compose.yml "${DEPLOY_DIR}/docker-compose.yml"

# ─── Create environment file template ────────────────────────────────────────
ENV_FILE="${DEPLOY_DIR}/.env.${ENVIRONMENT}"
if [ ! -f "${ENV_FILE}" ]; then
  log "Creating environment file template: ${ENV_FILE}"
  cat > "${ENV_FILE}" <<'ENVEOF'
# Privora Production Environment
# Fill in all values before deploying

NODE_ENV=production
DB_NAME=privora_db
DB_USER=privora
DB_PASSWORD=CHANGE_ME_strong_password_here
JWT_SECRET=CHANGE_ME_minimum_64_chars_random_string_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
OTP_EXPIRES_MINUTES=10
OTP_LENGTH=6
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=CHANGE_ME
EMAIL_FROM=Privora <noreply@yourdomain.com>
ENCRYPTION_KEY=CHANGE_ME_exactly_32_characters!!
FRONTEND_URL=https://yourdomain.com
ENVEOF
  log "IMPORTANT: Edit ${ENV_FILE} with your actual values before first deployment"
fi

# ─── Configure AWS CLI for ECR access ────────────────────────────────────────
log "Configuring AWS CLI..."
log "Ensure this EC2 instance has an IAM role with AmazonEC2ContainerRegistryReadOnly policy"
log "Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in ${ENV_FILE}"

# ─── Firewall (UFW) ──────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  log "Configuring firewall..."
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP (frontend via nginx)
  ufw allow 443/tcp  # HTTPS
  ufw allow 3000/tcp # Frontend direct (optional)
  ufw allow 5000/tcp # Backend direct (health checks from GitHub Actions)
  ufw --force enable
fi

log "=== EC2 setup complete ==="
log ""
log "Next steps:"
log "  1. Edit ${ENV_FILE} with production secrets"
log "  2. Add GitHub Actions secrets (see docs/CICD.md)"
log "  3. Push to 'develop' for staging or 'main' for production"

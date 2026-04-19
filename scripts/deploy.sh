#!/usr/bin/env bash
# deploy.sh — Zero-downtime deployment script
# Usage: deploy.sh <ecr-registry> <backend-image> <backend-tag> <frontend-image> <frontend-tag> <environment>
# Runs on the EC2 instance. Called by GitHub Actions CD workflows.
set -euo pipefail

ECR_REGISTRY="${1:?ECR_REGISTRY required}"
BACKEND_IMAGE="${2:?BACKEND_IMAGE required}"
BACKEND_TAG="${3:?BACKEND_TAG required}"
FRONTEND_IMAGE="${4:?FRONTEND_IMAGE required}"
FRONTEND_TAG="${5:?FRONTEND_TAG required}"
ENVIRONMENT="${6:?ENVIRONMENT required}"

DEPLOY_DIR="/opt/privora"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
STATE_FILE="${DEPLOY_DIR}/.deploy-state"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log "=== Privora Deployment ==="
log "Environment : ${ENVIRONMENT}"
log "Backend tag : ${BACKEND_TAG}"
log "Frontend tag: ${FRONTEND_TAG}"

# ─── Save current state for rollback ─────────────────────────────────────────
CURRENT_BACKEND_TAG=""
CURRENT_FRONTEND_TAG=""
if [ -f "${STATE_FILE}" ]; then
  CURRENT_BACKEND_TAG=$(grep "^BACKEND_TAG=" "${STATE_FILE}" | cut -d= -f2 || true)
  CURRENT_FRONTEND_TAG=$(grep "^FRONTEND_TAG=" "${STATE_FILE}" | cut -d= -f2 || true)
  log "Saving current state for rollback: backend=${CURRENT_BACKEND_TAG} frontend=${CURRENT_FRONTEND_TAG}"
fi

# Write new state (keep previous as backup)
if [ -n "${CURRENT_BACKEND_TAG}" ]; then
  echo "PREV_BACKEND_TAG=${CURRENT_BACKEND_TAG}" > "${STATE_FILE}.prev"
  echo "PREV_FRONTEND_TAG=${CURRENT_FRONTEND_TAG}" >> "${STATE_FILE}.prev"
fi

# ─── Pull new images ──────────────────────────────────────────────────────────
log "Pulling backend image: ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BACKEND_TAG}"
docker pull "${ECR_REGISTRY}/${BACKEND_IMAGE}:${BACKEND_TAG}"

log "Pulling frontend image: ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${FRONTEND_TAG}"
docker pull "${ECR_REGISTRY}/${FRONTEND_IMAGE}:${FRONTEND_TAG}"

# ─── Write environment override ───────────────────────────────────────────────
OVERRIDE_FILE="${DEPLOY_DIR}/docker-compose.override.yml"
cat > "${OVERRIDE_FILE}" <<EOF
version: '3.9'
services:
  backend:
    image: ${ECR_REGISTRY}/${BACKEND_IMAGE}:${BACKEND_TAG}
  frontend:
    image: ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${FRONTEND_TAG}
EOF

# ─── Load environment secrets from file ──────────────────────────────────────
ENV_FILE="${DEPLOY_DIR}/.env.${ENVIRONMENT}"
if [ ! -f "${ENV_FILE}" ]; then
  log "ERROR: Environment file not found: ${ENV_FILE}"
  exit 1
fi

# ─── Rolling restart: backend first, then frontend ────────────────────────────
log "Restarting backend..."
cd "${DEPLOY_DIR}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" \
  up -d --no-deps --remove-orphans backend

# Brief pause for backend to start before frontend re-connects
sleep 5

log "Restarting frontend..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" -f "${OVERRIDE_FILE}" \
  up -d --no-deps --remove-orphans frontend

# ─── Persist new state ────────────────────────────────────────────────────────
cat > "${STATE_FILE}" <<EOF
BACKEND_TAG=${BACKEND_TAG}
FRONTEND_TAG=${FRONTEND_TAG}
DEPLOYED_AT=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
ENVIRONMENT=${ENVIRONMENT}
EOF

log "Cleaning up dangling images..."
docker image prune -f --filter "until=48h" || true

log "=== Deployment complete ==="

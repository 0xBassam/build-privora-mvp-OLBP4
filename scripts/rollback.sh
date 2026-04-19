#!/usr/bin/env bash
# rollback.sh — Restore the previously deployed image versions
# Usage: rollback.sh <environment>
# Runs on the EC2 instance. Called by GitHub Actions on failed health check or manual rollback.
set -euo pipefail

ENVIRONMENT="${1:?ENVIRONMENT required}"
DEPLOY_DIR="/opt/privora"
STATE_FILE="${DEPLOY_DIR}/.deploy-state"
PREV_STATE="${STATE_FILE}.prev"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] $*"; }
log "=== Rollback initiated for ${ENVIRONMENT} ==="

if [ ! -f "${PREV_STATE}" ]; then
  log "ERROR: No previous state file found at ${PREV_STATE}. Cannot rollback automatically."
  log "Use the manual rollback workflow and specify an explicit image tag."
  exit 1
fi

PREV_BACKEND_TAG=$(grep "^PREV_BACKEND_TAG=" "${PREV_STATE}" | cut -d= -f2)
PREV_FRONTEND_TAG=$(grep "^PREV_FRONTEND_TAG=" "${PREV_STATE}" | cut -d= -f2)

if [ -z "${PREV_BACKEND_TAG}" ] || [ -z "${PREV_FRONTEND_TAG}" ]; then
  log "ERROR: Previous tags not found in state file."
  cat "${PREV_STATE}"
  exit 1
fi

log "Restoring: backend=${PREV_BACKEND_TAG} frontend=${PREV_FRONTEND_TAG}"

# Call deploy script with previous tags (images already pulled — fast)
bash "${DEPLOY_DIR}/scripts/deploy.sh" \
  "${ECR_REGISTRY:?ECR_REGISTRY required}" \
  "privora-backend" "${PREV_BACKEND_TAG}" \
  "privora-frontend" "${PREV_FRONTEND_TAG}" \
  "${ENVIRONMENT}"

log "=== Rollback complete ==="

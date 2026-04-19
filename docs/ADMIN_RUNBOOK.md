# Privora — Admin Runbook

## Purpose

This runbook defines procedures for operating, monitoring, and recovering the Privora platform. Follow these procedures for incidents, deployments, and routine operations.

---

## 1. System Overview

| Component | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + Nginx | Vercel / Docker |
| Backend API | Node.js + Express | Railway / Docker |
| Database | PostgreSQL 15 | Railway DB / Self-hosted |
| Email | nodemailer + SMTP | SendGrid / AWS SES |

**Key URLs**
- Production API: `https://api.privora.sa/api/v1`
- Production App: `https://app.privora.sa`
- API Health: `https://api.privora.sa/api/v1/health`
- API Docs: `https://api.privora.sa/api/docs`

---

## 2. Health Checks

### API Health

```bash
curl https://api.privora.sa/api/v1/health
# Expected: {"success": true, "data": {"status": "ok"}}
```

### Database Health

```bash
# Via Railway CLI
railway run psql $DATABASE_URL -c "SELECT 1;"

# Via Docker
docker compose exec db pg_isready -U privora_user
```

### Frontend Health

Open `https://app.privora.sa` in a browser. If it loads, the frontend is healthy.

---

## 3. Incident Playbooks

### 3.1 — Backend Is Down (503 / No Response)

**Symptoms:** API health check fails, users cannot log in.

**Steps:**
1. Check Railway dashboard → your service → see if it's running or crashed
2. View recent logs: Railway dashboard → Deployments → View logs
3. Common causes:
   - Database connection refused → see 3.2
   - Out of memory → upgrade Railway plan
   - Bad deployment → see 3.3 (rollback)
4. Restart service in Railway dashboard if no obvious cause

**Recovery time target:** Under 15 minutes.

---

### 3.2 — Database Connection Failure

**Symptoms:** Backend logs show `Unable to connect to the database`, API returns 500.

**Steps:**
1. Check PostgreSQL service status in Railway (or your DB host)
2. Verify `DB_URL` environment variable is correct in Railway
3. Check if DB host/IP changed (Railway sometimes rotates connection strings)
4. Test connection manually:
   ```bash
   psql "postgresql://user:pass@host:5432/dbname" -c "SELECT 1;"
   ```
5. If using Railway PostgreSQL: go to Railway → Database → Connect → copy new connection string → update backend env var → redeploy

**Recovery time target:** Under 30 minutes.

---

### 3.3 — Rollback After Bad Deployment

**Symptoms:** Errors immediately after a new deployment.

**Steps:**
1. Railway dashboard → your service → Deployments tab
2. Find the last working deployment
3. Click "Rollback" (Railway keeps the last 5 deployments)
4. Verify health check passes after rollback
5. Investigate the failed deployment code before re-deploying

---

### 3.4 — OTP Emails Not Delivering

**Symptoms:** Users report not receiving OTP emails. Login is impossible.

**Steps:**
1. Check SMTP provider dashboard (SendGrid → Activity → see if emails are bouncing)
2. Verify SMTP credentials in Railway environment variables
3. Test email manually:
   ```bash
   # Railway console or local
   node -e "
   const nodemailer = require('nodemailer');
   const t = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: 587,
     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
   });
   t.sendMail({from:'test@privora.sa', to:'bassam@email.com', subject:'Test', text:'Test'})
    .then(console.log).catch(console.error);
   "
   ```
4. If SendGrid is down: switch to AWS SES — update SMTP_HOST, SMTP_USER, SMTP_PASS
5. Temporary workaround: check backend logs — OTP is logged to console in development

**Note:** Until this is fixed, no new users can log in. Treat as critical.

---

### 3.5 — Security Incident (Suspected Unauthorized Access)

**Symptoms:** Unusual activity in audit logs, user reports of unauthorized actions.

**Immediate steps (within 1 hour):**
1. Rotate JWT_SECRET and JWT_REFRESH_SECRET immediately (all sessions invalidated)
   - Railway dashboard → Variables → update both secrets → redeploy
2. Query audit logs for the suspicious actor:
   ```
   GET /api/v1/audit-logs?actorId={suspicious_user_id}&severity=critical
   ```
3. Disable the affected user account if identified
4. Review what data was accessed using audit logs
5. If personal data was exposed: log it as a breach incident in Privora itself
6. If more than 1000 users affected: PDPL Art. 19 requires SDAIA notification within 72 hours

---

### 3.6 — Database Full / Disk Space

**Symptoms:** Backend logs show disk space errors, new records failing to save.

**Steps:**
1. Check disk usage in Railway (or your DB host) dashboard
2. Archive old audit logs (oldest first, 12+ months):
   ```sql
   DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '12 months'
   AND severity = 'info';
   ```
3. Vacuum and analyze the database:
   ```sql
   VACUUM ANALYZE;
   ```
4. Upgrade storage tier if needed

---

## 4. Routine Operations

### 4.1 — Deploy New Version

**Backend:**
```bash
git add .
git commit -m "your commit message"
git push origin main
# Railway auto-deploys in 2-3 minutes
```

**Frontend:**
```bash
cd frontend
npm run build
# If using Vercel: push to GitHub → Vercel auto-deploys
# If using gh-pages:
npx gh-pages -d dist
```

**Verify after deploy:**
```bash
curl https://api.privora.sa/api/v1/health
```

---

### 4.2 — Database Backup

**Manual backup:**
```bash
pg_dump "postgresql://user:pass@host:5432/privora" > backup-$(date +%Y%m%d-%H%M).sql
gzip backup-$(date +%Y%m%d-%H%M).sql
```

**Store backups:** Upload to S3 bucket or secure cloud storage. Keep 30 days minimum.

**Test restore (monthly drill):**
```bash
psql "postgresql://user:pass@staging-host:5432/privora_test" < backup-20260413.sql
```

---

### 4.3 — Rotate JWT Secrets

Rotate every 90 days (or immediately after a security incident).

```bash
# Generate new secret
openssl rand -hex 64

# Steps:
# 1. Generate new JWT_SECRET and JWT_REFRESH_SECRET values
# 2. Update in Railway environment variables
# 3. Redeploy backend
# 4. ALL users will need to log in again (all tokens invalidated)
# 5. Communicate this to users in advance if planned
```

---

### 4.4 — Add a New Organization

```bash
POST /api/v1/auth/register-org
Authorization: Bearer <super_admin_token>
{
  "organizationName": "New Org Name",
  "adminName": "Admin Full Name",
  "adminEmail": "admin@neworg.com"
}
```

The admin receives an OTP email to complete registration.

---

### 4.5 — Disable an Organization

```bash
PATCH /api/v1/organizations/{orgId}
Authorization: Bearer <super_admin_token>
{
  "isActive": false
}
```

This prevents the org's admins from logging in and hides their data from queries.

---

## 5. Monitoring Setup

### Uptime Monitoring

Set up BetterUptime or UptimeRobot to ping every 5 minutes:
```
https://api.privora.sa/api/v1/health
```

Alert channels: Email + SMS to Bassam.

### Railway Alerts

In Railway dashboard → your service → Settings → enable alerts for:
- Service crash
- Memory usage > 80%
- Disk usage > 80%

### Log Monitoring

Railway logs stream in real time. For production, add a log drain to:
- **Papertrail** — simple log aggregation
- **Datadog** — full observability (recommended at enterprise scale)

---

## 6. Useful Queries

### Check active sessions (refresh tokens)

```sql
SELECT u.email, u.role, rt.created_at, rt.expires_at
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.is_revoked = false AND rt.expires_at > NOW()
ORDER BY rt.created_at DESC;
```

### Check overdue DSARs

```sql
SELECT u.email, d.request_type, d.sla_deadline, d.status
FROM dsar_requests d
JOIN users u ON u.id = d.user_id
WHERE d.sla_deadline < NOW() AND d.status NOT IN ('completed', 'rejected')
ORDER BY d.sla_deadline ASC;
```

### Check overdue breach notifications

```sql
SELECT title, severity, discovered_at, authority_deadline, status
FROM breach_incidents
WHERE authority_deadline < NOW() AND notified_authority = false
ORDER BY authority_deadline ASC;
```

### Recent audit log entries

```sql
SELECT actor_role, action, resource_type, description, ip_address, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

---

## 7. Contacts & Escalation

| Role | Responsibility | Contact |
|---|---|---|
| Founder (Bassam) | All decisions, security incidents | Direct |
| Lead Developer | Code issues, deployments, backend | TBD |
| Railway Support | Infrastructure issues | railway.app/support |
| SendGrid Support | Email delivery | sendgrid.com/support |
| MongoDB / PostgreSQL | DB issues | Respective support portals |

**For PDPL regulatory incidents (breach notification to SDAIA):**
Contact: sdaia.gov.sa — notification required within 72 hours of discovery.

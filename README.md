# Privora — Consent Management & Privacy Platform

**Aligned with Saudi PDPL | NCA ECC Cybersecurity Practices**

Privora is a full-stack Consent Management Platform (CMP) that enables organizations to collect, manage, track, and audit user consent in compliance with the Saudi Personal Data Protection Law (PDPL).

---

## Architecture

```
privora/
├── backend/          # Node.js + Express REST API
├── frontend/         # React + TypeScript SPA
├── docker-compose.yml
└── .env.example
```

### Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | Node.js 20, Express.js, Sequelize ORM   |
| Database   | PostgreSQL 15                           |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS|
| Auth       | JWT (RS256) + Email OTP                 |
| Docs       | Swagger / OpenAPI 3.0                   |
| Deployment | Docker Compose                          |

---

## Features (MVP)

### User Portal
- Secure login via Email + OTP
- View incoming consent requests
- Approve / Reject / Withdraw consent
- Full consent history with audit trail

### Organization Dashboard
- Admin login with RBAC
- Create consent requests (data type, purpose, legal basis)
- Track responses (Approved / Rejected / Withdrawn)
- Analytics dashboard (response rates, trends)

### Consent Engine
- Immutable, timestamped audit logs
- Consent linked to user, entity, purpose, and data type
- Withdrawal support with reason tracking

### Security
- HTTPS / TLS 1.2+ (via reverse proxy)
- JWT authentication (access + refresh tokens)
- Role-Based Access Control (user / org_admin / super_admin)
- Encrypted PII fields
- Rate limiting & input sanitization
- Helmet.js security headers

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### 1. Clone & Configure

```bash
git clone <repo>
cd privora
cp .env.example .env
# Edit .env with your values
```

### 2. Run with Docker

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs
- PostgreSQL: localhost:5432

### 3. Local Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

---

## API Endpoints

| Method | Path                                  | Description                    | Auth     |
|--------|---------------------------------------|--------------------------------|----------|
| POST   | /api/v1/auth/request-otp              | Request OTP for login          | Public   |
| POST   | /api/v1/auth/verify-otp               | Verify OTP & receive JWT       | Public   |
| POST   | /api/v1/auth/admin/login              | Admin password login           | Public   |
| POST   | /api/v1/auth/refresh                  | Refresh access token           | Public   |
| GET    | /api/v1/users/me                      | Get current user profile       | User     |
| GET    | /api/v1/consents/requests             | List consent requests for user | User     |
| POST   | /api/v1/consents/:id/respond          | Respond to consent request     | User     |
| GET    | /api/v1/consents/history              | User consent history           | User     |
| POST   | /api/v1/organizations/consents        | Create consent request         | OrgAdmin |
| GET    | /api/v1/organizations/consents        | List org consent requests      | OrgAdmin |
| GET    | /api/v1/organizations/analytics       | Analytics dashboard data       | OrgAdmin |
| GET    | /api/v1/audit-logs                    | View audit logs                | OrgAdmin |

Full docs: http://localhost:5000/api-docs

---

## PDPL Alignment

| PDPL Requirement                        | Implementation                          |
|-----------------------------------------|-----------------------------------------|
| Explicit consent before processing      | Consent request workflow                |
| Right to withdraw consent               | Withdraw action with timestamp          |
| Purpose limitation                      | Purpose field on every consent request  |
| Data minimization                       | Data types explicitly listed            |
| Audit trail                             | Immutable AuditLog table                |
| Data retention limits                   | Retention period field + expiry logic   |
| Subject rights (access, correction)     | User portal history & profile           |

---

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `SMTP_*` — Email provider for OTP delivery
- `ENCRYPTION_KEY` — 32-byte key for PII field encryption

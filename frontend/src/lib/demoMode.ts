// ─── Demo Mode — Axios Interceptor ───────────────────────────────────────────
// Intercepts every API call and returns mock data so the app runs without a
// backend (used for the GitHub Pages public demo).

import { useAuthStore } from '@/store/authStore';
import {
  DEMO_USER, DEMO_ADMIN, DEMO_TOKENS,
  DEMO_CONSENT_REQUESTS, DEMO_CONSENT_HISTORY,
  DEMO_ORG_REQUESTS, DEMO_ANALYTICS, DEMO_AUDIT_LOGS,
  DEMO_USER_DATA_SHARING_REQUESTS, DEMO_ORG_DATA_SHARING_REQUESTS,
  DEMO_DATA_SHARING_TRANSACTIONS,
  DEMO_USER_DSAR_REQUESTS, DEMO_ADMIN_DSAR_REQUESTS, DEMO_BREACH_INCIDENTS,
  DEMO_RETENTION_POLICIES, DEMO_PRIVACY_NOTICES, DEMO_PURPOSES,
  DEMO_ROPA_RECORDS, DEMO_DPIA_ASSESSMENTS, DEMO_SENSITIVE_DATA_RECORDS,
  DEMO_DISCLOSURE_RECORDS, DEMO_DESTRUCTION_CERTIFICATES,
} from './demoData';

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// Simple delay to make it feel realistic
const delay = (ms = 400) => new Promise((res) => setTimeout(res, ms));

// In-memory mutable state for the demo session
let pendingRequests = [...DEMO_CONSENT_REQUESTS];
let historyItems = [...DEMO_CONSENT_HISTORY];
let orgRequests = [...DEMO_ORG_REQUESTS];
let userDsrList = [...DEMO_USER_DATA_SHARING_REQUESTS];
let orgDsrList = [...DEMO_ORG_DATA_SHARING_REQUESTS];
let dsrTransactions = [...DEMO_DATA_SHARING_TRANSACTIONS];
let userDsarList = [...DEMO_USER_DSAR_REQUESTS];
let adminDsarList = [...DEMO_ADMIN_DSAR_REQUESTS];
let breachList = [...DEMO_BREACH_INCIDENTS];
let retentionList = [...DEMO_RETENTION_POLICIES];
let privacyNoticeList = [...DEMO_PRIVACY_NOTICES];
let purposeList = [...DEMO_PURPOSES];
let ropaList = [...DEMO_ROPA_RECORDS];
let dpiaList = [...DEMO_DPIA_ASSESSMENTS];
let sensitiveDataList = [...DEMO_SENSITIVE_DATA_RECORDS];
let disclosureList = [...DEMO_DISCLOSURE_RECORDS];
let destructionList = [...DEMO_DESTRUCTION_CERTIFICATES];

export function setupDemoInterceptor(api: import('axios').AxiosInstance) {
  if (!IS_DEMO) return;

  api.interceptors.request.use(async (config) => {
    await delay();

    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    const body = config.data
      ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data)
      : {};

    // ── Auth ─────────────────────────────────────────────────────────────────
    if (method === 'post' && url.includes('/auth/request-otp')) {
      throw buildError(200, { success: true, message: 'OTP sent to your email' }, config);
    }

    if (method === 'post' && url.includes('/auth/verify-otp')) {
      // Accept any 6-digit OTP in demo mode
      if (!/^\d{4,8}$/.test(body.otp || '')) {
        throw buildError(401, { success: false, message: 'Invalid OTP' }, config);
      }
      throw buildError(200, {
        success: true,
        data: { user: DEMO_USER, ...DEMO_TOKENS },
      }, config);
    }

    if (method === 'post' && url.includes('/auth/admin/login')) {
      if (body.email === 'admin@privora.demo' && body.password === 'Admin@1234') {
        throw buildError(200, {
          success: true,
          data: { user: DEMO_ADMIN, ...DEMO_TOKENS },
        }, config);
      }
      throw buildError(401, { success: false, message: 'Invalid credentials' }, config);
    }

    if (method === 'post' && url.includes('/auth/refresh')) {
      throw buildError(200, {
        success: true,
        data: { accessToken: DEMO_TOKENS.accessToken },
      }, config);
    }

    if (method === 'post' && url.includes('/auth/logout')) {
      useAuthStore.getState().logout();
      throw buildError(200, { success: true }, config);
    }

    // ── User: Consent Requests ────────────────────────────────────────────────
    if (method === 'get' && url.includes('/consents/requests')) {
      throw buildError(200, {
        success: true,
        data: {
          requests: pendingRequests,
          pagination: { total: pendingRequests.length, page: 1, limit: 50, pages: 1 },
        },
      }, config);
    }

    // User respond to consent
    if (method === 'post' && /\/consents\/[^/]+\/respond/.test(url)) {
      const id = url.split('/consents/')[1].split('/')[0];
      const { status, reason } = body;
      const req = pendingRequests.find((r) => r.id === id);
      if (req) {
        pendingRequests = pendingRequests.filter((r) => r.id !== id);
        historyItems = [{
          id: `hist-${Date.now()}`,
          status,
          reason: reason || null,
          createdAt: new Date().toISOString(),
          consentRequest: { id: req.id, title: req.title, organization: req.organization },
        }, ...historyItems];
      }
      throw buildError(200, { success: true, data: { status } }, config);
    }

    // ── User: History ─────────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/consents/history')) {
      throw buildError(200, {
        success: true,
        data: {
          history: historyItems,
          pagination: { total: historyItems.length, page: 1, limit: 50, pages: 1 },
        },
      }, config);
    }

    // Withdraw consent
    if (method === 'post' && /\/consents\/[^/]+\/withdraw/.test(url)) {
      const id = url.split('/consents/')[1].split('/')[0];
      historyItems = historyItems.map((h) =>
        h.consentRequest?.id === id ? { ...h, status: 'withdrawn' } : h
      );
      throw buildError(200, { success: true }, config);
    }

    // ── User: Profile ─────────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/users/profile')) {
      throw buildError(200, { success: true, data: { user: DEMO_USER } }, config);
    }
    if (method === 'put' && url.includes('/users/profile')) {
      throw buildError(200, { success: true, data: { user: { ...DEMO_USER, ...body } } }, config);
    }

    // ── Org: Consent Requests ─────────────────────────────────────────────────
    if (method === 'get' && url.includes('/consents/org')) {
      throw buildError(200, {
        success: true,
        data: {
          requests: orgRequests,
          pagination: { total: orgRequests.length, page: 1, limit: 50, pages: 1 },
        },
      }, config);
    }

    if (method === 'post' && url.endsWith('/consents/org')) {
      const newReq = {
        id: `req-${Date.now()}`,
        ...body,
        dataTypes: body.dataTypes || [],
        isActive: true,
        createdAt: new Date().toISOString(),
        _count: { transactions: 0 },
      };
      orgRequests = [newReq, ...orgRequests];
      throw buildError(201, { success: true, data: { request: newReq } }, config);
    }

    if ((method === 'get') && /\/consents\/org\/[^/]+$/.test(url)) {
      const id = url.split('/consents/org/')[1];
      const req = orgRequests.find((r) => r.id === id) || orgRequests[0];
      throw buildError(200, {
        success: true,
        data: {
          request: req,
          transactions: historyItems.slice(0, 5).map((h) => ({
            id: h.id, status: h.status, createdAt: h.createdAt, reason: h.reason,
            user: { name: 'Sara Al-Rashidi', email: 'sara@example.com' },
          })),
        },
      }, config);
    }

    if (method === 'patch' && /\/consents\/org\/[^/]+$/.test(url)) {
      const id = url.split('/consents/org/')[1];
      orgRequests = orgRequests.map((r) => r.id === id ? { ...r, ...body } : r);
      throw buildError(200, { success: true }, config);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/analytics/audit-logs')) {
      const sev = new URL(url, 'http://x').searchParams.get('severity');
      const logs = sev ? DEMO_AUDIT_LOGS.filter((l) => l.severity === sev) : DEMO_AUDIT_LOGS;
      throw buildError(200, { success: true, data: { logs } }, config);
    }

    if (method === 'get' && url.includes('/analytics')) {
      throw buildError(200, { success: true, data: DEMO_ANALYTICS }, config);
    }

    // ── Data Sharing: User view ───────────────────────────────────────────────
    if (method === 'get' && url.includes('/data-sharing/user/requests')) {
      throw buildError(200, {
        success: true,
        data: {
          requests: userDsrList,
          pagination: { total: userDsrList.length, page: 1, limit: 50, pages: 1 },
        },
      }, config);
    }

    // User respond to data sharing request
    if (method === 'post' && /\/data-sharing\/requests\/[^/]+\/respond/.test(url)) {
      const id = url.split('/data-sharing/requests/')[1].split('/')[0];
      const { status, reason } = body;
      const newStatus = status === 'approved' ? 'consent_approved' : 'rejected';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userDsrList = userDsrList.map((r) =>
        r.id === id
          ? { ...r, status: newStatus, respondedAt: new Date().toISOString() }
          : r
      ) as typeof userDsrList;
      const updated = userDsrList.find((r) => r.id === id);
      throw buildError(200, {
        success: true,
        data: { request: { ...updated, rejectionReason: reason || null } },
      }, config);
    }

    // ── Data Sharing: Org view ────────────────────────────────────────────────
    // List org DSRs
    if (method === 'get' && /\/data-sharing\/requests(\?.*)?$/.test(url)) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const filtered = statusParam
        ? orgDsrList.filter((r) => r.status === statusParam)
        : orgDsrList;
      throw buildError(200, {
        success: true,
        data: {
          requests: filtered,
          pagination: { total: filtered.length, page: 1, limit: 20, pages: 1 },
        },
      }, config);
    }

    // Create org DSR
    if (method === 'post' && url.endsWith('/data-sharing/requests')) {
      const existing = userDsrList.find(
        (r) => r.status === 'consent_approved' || r.status === 'completed'
      );
      const newStatus = existing ? 'consent_approved' : 'pending_consent';
      const newDsr = {
        id: `dsr-org-${Date.now()}`,
        ...body,
        dataTypes: body.dataTypes || [],
        status: newStatus,
        createdAt: new Date().toISOString(),
        dataSubject: { id: body.userId, name: 'Demo User', email: 'user@example.com' },
        providingOrg: null,
      };
      orgDsrList = [newDsr, ...orgDsrList];
      // Add to user's incoming list as well
      const newUserDsr = {
        id: newDsr.id,
        title: newDsr.title,
        purpose: newDsr.purpose,
        purposeCategory: newDsr.purposeCategory || 'other',
        dataTypes: newDsr.dataTypes,
        duration: newDsr.duration,
        legalBasis: newDsr.legalBasis || 'consent',
        privacyNotice: newDsr.privacyNotice || undefined,
        status: newStatus,
        createdAt: newDsr.createdAt,
        requestingOrg: { id: 'org-001', name: 'Ministry of Health' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userDsrList = [newUserDsr as any, ...userDsrList];
      throw buildError(201, {
        success: true,
        data: {
          request: newDsr,
          user: { id: body.userId, name: 'Demo User', email: 'user@example.com' },
        },
      }, config);
    }

    // Execute data sharing
    if (method === 'post' && /\/data-sharing\/requests\/[^/]+\/execute/.test(url)) {
      const id = url.split('/data-sharing/requests/')[1].split('/')[0];
      const dsr = orgDsrList.find((r) => r.id === id);
      if (!dsr || dsr.status !== 'consent_approved') {
        throw buildError(404, { success: false, message: 'Request not found or consent not approved' }, config);
      }
      orgDsrList = orgDsrList.map((r) => r.id === id ? { ...r, status: 'completed' } : r);
      const allowedFields: Record<string, string | undefined> = {
        name: 'Sara Al-Rashidi',
        email: 'sara@example.com',
        phone: '+966 50 123 4567',
        national_id: '1012345678',
      };
      const sharedData: Record<string, string> = {};
      for (const field of (dsr.dataTypes || [])) {
        if (allowedFields[field] !== undefined) sharedData[field] = allowedFields[field] as string;
      }
      const dataHash = `demo${Date.now().toString(16)}abcdef1234567890abcdef1234`;
      const tx = {
        id: `tx-${Date.now()}`,
        dataSharingRequestId: id,
        dataTypesShared: dsr.dataTypes,
        purpose: dsr.purpose,
        dataHash,
        sharedAt: new Date().toISOString(),
        expiresAt: undefined as string | undefined,
        request: { id, title: dsr.title, purpose: dsr.purpose },
        dataSubject: dsr.dataSubject || { id: 'unknown', name: 'Demo User', email: 'user@example.com' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dsrTransactions = [tx as any, ...dsrTransactions];
      throw buildError(200, {
        success: true,
        data: {
          transaction: tx,
          sharedData,
          dataHash,
          sharedAt: tx.sharedAt,
          expiresAt: null,
          purpose: dsr.purpose,
          dataMinimizationNote: 'Only the approved minimal fields were included in this response.',
        },
      }, config);
    }

    // Data sharing transactions audit trail
    if (method === 'get' && url.includes('/data-sharing/transactions')) {
      throw buildError(200, {
        success: true,
        data: {
          transactions: dsrTransactions,
          pagination: { total: dsrTransactions.length, page: 1, limit: 50, pages: 1 },
        },
      }, config);
    }

    // ── DSAR: User view ───────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/dsar/requests') && !url.includes('/admin')) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const filtered = statusParam ? userDsarList.filter((r) => r.status === statusParam) : userDsarList;
      throw buildError(200, {
        success: true,
        data: { requests: filtered, pagination: { total: filtered.length, page: 1, limit: 50, pages: 1 } },
      }, config);
    }

    if (method === 'post' && url.endsWith('/dsar/requests')) {
      const org = { id: body.organizationId, name: 'Demo Organization' };
      // Check for duplicate
      const existing = userDsarList.find(
        (r) => r.organizationId === body.organizationId &&
          r.requestType === body.requestType &&
          (r.status === 'pending' || r.status === 'in_progress')
      );
      if (existing) {
        throw buildError(400, { success: false, message: `You already have an open ${body.requestType} request with this organization` }, config);
      }
      const newReq = {
        id: `dsar-user-${Date.now()}`,
        organizationId: body.organizationId,
        requestType: body.requestType,
        description: body.description || null,
        status: 'pending',
        slaDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 30,
        isOverdue: false,
        adminNotes: null,
        responseData: null,
        rejectionReason: null,
        processedAt: null,
        createdAt: new Date().toISOString(),
        organization: org,
      };
      userDsarList = [newReq, ...userDsarList];
      throw buildError(201, {
        success: true,
        data: { request: newReq },
        message: 'DSAR submitted successfully. The organization has 30 days to respond.',
      }, config);
    }

    // ── DSAR: Admin view ──────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/dsar/admin/requests') && !url.match(/\/dsar\/admin\/requests\/[^/?]/)) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const typeParam = new URL(url, 'http://x').searchParams.get('requestType');
      let filtered = [...adminDsarList];
      if (statusParam) filtered = filtered.filter((r) => r.status === statusParam);
      if (typeParam) filtered = filtered.filter((r) => r.requestType === typeParam);
      const overdue = filtered.filter((r) => r.isOverdue).length;
      throw buildError(200, {
        success: true,
        data: {
          requests: filtered,
          pagination: { total: filtered.length, page: 1, limit: 50, pages: 1 },
          summary: { total: adminDsarList.length, overdue },
        },
      }, config);
    }

    if (method === 'get' && /\/dsar\/admin\/requests\/[^/?]+$/.test(url)) {
      const id = url.split('/dsar/admin/requests/')[1].split('?')[0];
      const req = adminDsarList.find((r) => r.id === id);
      if (!req) throw buildError(404, { success: false, message: 'DSAR request not found' }, config);
      throw buildError(200, { success: true, data: { request: req } }, config);
    }

    if (method === 'patch' && /\/dsar\/admin\/requests\/[^/?]+$/.test(url)) {
      const id = url.split('/dsar/admin/requests/')[1].split('?')[0];
      const req = adminDsarList.find((r) => r.id === id);
      if (!req) throw buildError(404, { success: false, message: 'DSAR request not found' }, config);
      if (req.status === 'completed' || req.status === 'rejected') {
        throw buildError(400, { success: false, message: 'This request has already been closed' }, config);
      }
      const updated = { ...req, ...body };
      if (body.status === 'completed' || body.status === 'rejected') {
        updated.processedAt = new Date().toISOString();
      }
      adminDsarList = adminDsarList.map((r) => r.id === id ? updated : r);
      throw buildError(200, { success: true, data: { request: updated } }, config);
    }

    // ── Breaches ──────────────────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/breaches(\?.*)?$/) && !url.includes('/breaches/')) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const severityParam = new URL(url, 'http://x').searchParams.get('severity');
      let filtered = [...breachList];
      if (statusParam) filtered = filtered.filter((b) => b.status === statusParam);
      if (severityParam) filtered = filtered.filter((b) => b.severity === severityParam);
      const open = filtered.filter((b) => b.status === 'open' || b.status === 'investigating').length;
      const unnotified = filtered.filter((b) => !b.notifiedAuthority).length;
      throw buildError(200, {
        success: true,
        data: {
          incidents: filtered,
          pagination: { total: filtered.length, page: 1, limit: 50, pages: 1 },
          summary: { total: breachList.length, open, unnotified },
        },
      }, config);
    }

    if (method === 'get' && /\/breaches\/[^/?]+$/.test(url)) {
      const id = url.split('/breaches/')[1].split('?')[0];
      const incident = breachList.find((b) => b.id === id);
      if (!incident) throw buildError(404, { success: false, message: 'Incident not found' }, config);
      throw buildError(200, { success: true, data: { incident } }, config);
    }

    if (method === 'post' && url.endsWith('/breaches')) {
      const newIncident = {
        id: `breach-${Date.now()}`,
        organizationId: 'org-001',
        reportedBy: 'demo-admin-001',
        title: body.title,
        description: body.description,
        breachType: body.breachType,
        severity: body.severity || 'medium',
        affectedDataTypes: body.affectedDataTypes || [],
        estimatedAffectedUsers: body.estimatedAffectedUsers || null,
        status: 'open',
        discoveredAt: body.discoveredAt || new Date().toISOString(),
        resolvedAt: null,
        actionsTaken: body.actionsTaken || null,
        timeline: [{
          timestamp: new Date().toISOString(),
          action: 'Incident reported',
          performedBy: 'demo-admin-001',
          note: `${body.breachType} incident logged by Mohammed Alharbi`,
        }],
        notifiedAuthority: false,
        notifiedAuthorityAt: null,
        notifiedUsers: false,
        notifiedUsersAt: null,
        authorityDeadline: new Date(new Date().getTime() + 72 * 60 * 60 * 1000).toISOString(),
        isAuthorityOverdue: false,
        createdAt: new Date().toISOString(),
        reporter: { id: 'demo-admin-001', name: 'Mohammed Alharbi', email: 'admin@privora.demo' },
      };
      breachList = [newIncident, ...breachList];
      throw buildError(201, {
        success: true,
        data: { incident: newIncident },
        message: 'Breach incident created. Review notification obligations under PDPL Art. 19.',
      }, config);
    }

    if (method === 'patch' && /\/breaches\/[^/?]+$/.test(url)) {
      const id = url.split('/breaches/')[1].split('?')[0];
      const incident = breachList.find((b) => b.id === id);
      if (!incident) throw buildError(404, { success: false, message: 'Incident not found' }, config);
      const updates: Record<string, unknown> = { ...body };
      if (body.notifiedAuthority && !incident.notifiedAuthorityAt) {
        updates.notifiedAuthorityAt = new Date().toISOString();
      }
      if (body.notifiedUsers && !incident.notifiedUsersAt) {
        updates.notifiedUsersAt = new Date().toISOString();
      }
      if (body.status === 'resolved' && !incident.resolvedAt) {
        updates.resolvedAt = new Date().toISOString();
      }
      if (body.timelineNote) {
        const currentTimeline = Array.isArray(incident.timeline) ? incident.timeline : [];
        updates.timeline = [...currentTimeline, {
          timestamp: new Date().toISOString(),
          action: body.timelineNote,
          performedBy: 'demo-admin-001',
        }];
        delete updates.timelineNote;
      }
      const updated = { ...incident, ...updates };
      breachList = breachList.map((b) => b.id === id ? updated : b);
      throw buildError(200, { success: true, data: { incident: updated }, message: 'Incident updated' }, config);
    }

    // ── Retention Policies ────────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/retention\/policies(\?.*)?$/) && !url.includes('/retention/policies/')) {
      const byCategory: Record<string, number> = {};
      retentionList.forEach((p) => { byCategory[p.dataCategory] = (byCategory[p.dataCategory] || 0) + 1; });
      throw buildError(200, {
        success: true,
        data: {
          policies: retentionList,
          summary: { total: retentionList.length, active: retentionList.filter((p) => p.isActive).length, byCategory },
        },
      }, config);
    }

    if (method === 'get' && url.match(/\/retention\/status(\?.*)?$/)) {
      const active = retentionList.filter((p) => p.isActive);
      const coverageCategories = [...new Set(active.map((p) => p.dataCategory))];
      const allCats = ['pii', 'sensitive', 'financial', 'biometric', 'behavioral', 'location', 'general'];
      const missingCategories = allCats.filter((c) => !coverageCategories.includes(c));
      throw buildError(200, {
        success: true,
        data: {
          hasPolicies: active.length > 0,
          activePolicies: active.length,
          coverageCategories,
          missingCategories,
          lastRunAt: active[0]?.lastRunAt ?? null,
        },
      }, config);
    }

    if (method === 'post' && url.endsWith('/retention/policies')) {
      const newPolicy = {
        id: `ret-${Date.now()}`,
        organizationId: 'org-001',
        name: body.name,
        dataCategory: body.dataCategory,
        purpose: body.purpose || null,
        retentionDays: body.retentionDays,
        retentionYears: Math.round(body.retentionDays / 365 * 10) / 10,
        warningDays: body.warningDays ?? 30,
        action: body.action ?? 'alert_only',
        isActive: true,
        lastRunAt: null,
        createdAt: new Date().toISOString(),
      };
      retentionList = [newPolicy, ...retentionList];
      throw buildError(201, { success: true, data: { policy: newPolicy }, message: 'Retention policy created' }, config);
    }

    if (method === 'patch' && /\/retention\/policies\/[^/?]+$/.test(url)) {
      const id = url.split('/retention/policies/')[1].split('?')[0];
      const policy = retentionList.find((p) => p.id === id);
      if (!policy) throw buildError(404, { success: false, message: 'Policy not found' }, config);
      const updated = { ...policy, ...body, retentionYears: body.retentionDays ? Math.round(body.retentionDays / 365 * 10) / 10 : policy.retentionYears };
      retentionList = retentionList.map((p) => p.id === id ? updated : p);
      throw buildError(200, { success: true, data: { policy: updated } }, config);
    }

    if (method === 'delete' && /\/retention\/policies\/[^/?]+$/.test(url)) {
      const id = url.split('/retention/policies/')[1].split('?')[0];
      const policy = retentionList.find((p) => p.id === id);
      if (!policy) throw buildError(404, { success: false, message: 'Policy not found' }, config);
      retentionList = retentionList.filter((p) => p.id !== id);
      throw buildError(200, { success: true, message: 'Policy deleted' }, config);
    }

    if (method === 'post' && url.endsWith('/retention/run-check')) {
      const dryRun = body.dryRun !== false;
      throw buildError(200, {
        success: true,
        data: {
          dryRun,
          summary: {
            total: 0,
            policiesChecked: retentionList.filter((p) => p.isActive).length,
            transactionsScanned: 0,
            expiredFound: 0,
            actionsQueued: 0,
          },
        },
      }, config);
    }

    // ── Privacy Notices ───────────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/privacy-notices\/active(\?.*)?$/)) {
      const active = privacyNoticeList.find((n) => n.isActive);
      if (!active) throw buildError(404, { success: false, message: 'No active notice' }, config);
      throw buildError(200, { success: true, data: { notice: active } }, config);
    }

    if (method === 'get' && url.match(/\/privacy-notices(\?.*)?$/) && !url.includes('/privacy-notices/')) {
      const active = privacyNoticeList.find((n) => n.isActive) ?? null;
      throw buildError(200, { success: true, data: { notices: privacyNoticeList, activeNotice: active } }, config);
    }

    if (method === 'get' && /\/privacy-notices\/[^/?]+$/.test(url) && !url.includes('/activate')) {
      const id = url.split('/privacy-notices/')[1].split('?')[0];
      const notice = privacyNoticeList.find((n) => n.id === id);
      if (!notice) throw buildError(404, { success: false, message: 'Notice not found' }, config);
      throw buildError(200, { success: true, data: { notice } }, config);
    }

    if (method === 'post' && url.endsWith('/privacy-notices')) {
      const existing = privacyNoticeList.find((n) => n.version === body.version);
      if (existing) throw buildError(400, { success: false, message: 'A notice with this version already exists' }, config);
      // deactivate current active
      privacyNoticeList = privacyNoticeList.map((n) => ({ ...n, isActive: false }));
      const newNotice = {
        id: `pn-${Date.now()}`,
        organizationId: 'org-001',
        title: body.title,
        version: body.version,
        purposeOfProcessing: body.purposeOfProcessing,
        dataTypesCollected: body.dataTypesCollected ?? [],
        retentionSummary: body.retentionSummary ?? '',
        thirdPartySharing: body.thirdPartySharing ?? false,
        contactEmail: body.contactEmail ?? '',
        legalBasis: body.legalBasis ?? 'consent',
        dataSubjectRights: body.dataSubjectRights ?? ['access', 'correction', 'deletion', 'portability', 'objection'],
        effectiveDate: body.effectiveDate ?? null,
        changeNotes: body.changeNotes ?? null,
        isActive: true,
        previousVersionId: privacyNoticeList[0]?.id ?? null,
        createdAt: new Date().toISOString(),
      };
      privacyNoticeList = [newNotice, ...privacyNoticeList];
      throw buildError(201, { success: true, data: { notice: newNotice }, message: 'Privacy notice created' }, config);
    }

    if (method === 'patch' && /\/privacy-notices\/[^/?]+$/.test(url) && !url.includes('/activate')) {
      const id = url.split('/privacy-notices/')[1].split('?')[0];
      const notice = privacyNoticeList.find((n) => n.id === id);
      if (!notice) throw buildError(404, { success: false, message: 'Notice not found' }, config);
      const updated = { ...notice, ...body };
      privacyNoticeList = privacyNoticeList.map((n) => n.id === id ? updated : n);
      throw buildError(200, { success: true, data: { notice: updated } }, config);
    }

    if (method === 'post' && /\/privacy-notices\/[^/?]+\/activate$/.test(url)) {
      const id = url.split('/privacy-notices/')[1].split('/activate')[0];
      const notice = privacyNoticeList.find((n) => n.id === id);
      if (!notice) throw buildError(404, { success: false, message: 'Notice not found' }, config);
      privacyNoticeList = privacyNoticeList.map((n) => ({ ...n, isActive: n.id === id }));
      throw buildError(200, { success: true, data: { notice: { ...notice, isActive: true } }, message: 'Notice activated' }, config);
    }

    // ── Processing Purposes ───────────────────────────────────────────────────
    if (method === 'post' && url.endsWith('/purposes/validate')) {
      const { purposeId, dataTypes } = body as { purposeId: string; dataTypes: string[] };
      const purpose = purposeList.find((p) => p.id === purposeId);
      if (!purpose) throw buildError(404, { success: false, message: 'Purpose not found' }, config);
      if (!purpose.isActive) throw buildError(400, { success: false, message: 'Processing purpose is inactive' }, config);
      const unauthorized = (dataTypes || []).filter((dt: string) => !purpose.allowedDataTypes.includes(dt));
      const isValid = unauthorized.length === 0;
      throw buildError(200, {
        success: true,
        data: {
          isValid,
          purposeName: purpose.name,
          requestedDataTypes: dataTypes,
          allowedDataTypes: purpose.allowedDataTypes,
          unauthorizedDataTypes: unauthorized,
          ...(isValid ? {} : { violation: `PDPL Art. 5 — data minimization violated: ${unauthorized.join(', ')} not approved for this purpose` }),
        },
      }, config);
    }

    if (method === 'get' && url.match(/\/purposes(\?.*)?$/) && !url.includes('/purposes/')) {
      const byLegalBasis: Record<string, number> = {};
      purposeList.forEach((p) => { byLegalBasis[p.legalBasis] = (byLegalBasis[p.legalBasis] || 0) + 1; });
      throw buildError(200, {
        success: true,
        data: {
          purposes: purposeList,
          summary: {
            total: purposeList.length,
            active: purposeList.filter((p) => p.isActive).length,
            requiresExplicitConsent: purposeList.filter((p) => p.requiresExplicitConsent).length,
            byLegalBasis,
          },
        },
      }, config);
    }

    if (method === 'get' && /\/purposes\/[^/?]+$/.test(url)) {
      const id = url.split('/purposes/')[1].split('?')[0];
      const purpose = purposeList.find((p) => p.id === id);
      if (!purpose) throw buildError(404, { success: false, message: 'Purpose not found' }, config);
      throw buildError(200, { success: true, data: { purpose } }, config);
    }

    if (method === 'post' && url.endsWith('/purposes')) {
      const sensitiveCats = ['sensitive', 'biometric'];
      const hasSensitive = (body.dataCategories || []).some((c: string) => sensitiveCats.includes(c));
      if (hasSensitive && body.requiresExplicitConsent === false) {
        throw buildError(400, { success: false, message: 'Sensitive/biometric categories require explicit consent' }, config);
      }
      const newPurpose = {
        id: `purp-${Date.now()}`,
        organizationId: 'org-001',
        name: body.name,
        description: body.description,
        legalBasis: body.legalBasis,
        dataCategories: body.dataCategories ?? [],
        allowedDataTypes: body.allowedDataTypes ?? [],
        requiresExplicitConsent: hasSensitive ? true : (body.requiresExplicitConsent ?? true),
        retentionDays: body.retentionDays ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      purposeList = [newPurpose, ...purposeList];
      throw buildError(201, { success: true, data: { purpose: newPurpose }, message: 'Processing purpose created' }, config);
    }

    if (method === 'patch' && /\/purposes\/[^/?]+$/.test(url)) {
      const id = url.split('/purposes/')[1].split('?')[0];
      const purpose = purposeList.find((p) => p.id === id);
      if (!purpose) throw buildError(404, { success: false, message: 'Purpose not found' }, config);
      const updated = { ...purpose, ...body };
      purposeList = purposeList.map((p) => p.id === id ? updated : p);
      throw buildError(200, { success: true, data: { purpose: updated } }, config);
    }

    if (method === 'delete' && /\/purposes\/[^/?]+$/.test(url)) {
      const id = url.split('/purposes/')[1].split('?')[0];
      const purpose = purposeList.find((p) => p.id === id);
      if (!purpose) throw buildError(404, { success: false, message: 'Purpose not found' }, config);
      purposeList = purposeList.filter((p) => p.id !== id);
      throw buildError(200, { success: true, message: 'Purpose deleted' }, config);
    }

    // ── RoPA Records ─────────────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/ropa\/stats(\?.*)?$/)) {
      const byLegalBasis: Record<string, number> = {};
      ropaList.forEach((r) => { byLegalBasis[r.legalBasis] = (byLegalBasis[r.legalBasis] || 0) + 1; });
      throw buildError(200, {
        success: true,
        data: {
          total: ropaList.length,
          active: ropaList.filter((r) => r.status === 'active').length,
          draft: ropaList.filter((r) => r.status === 'draft').length,
          underReview: ropaList.filter((r) => r.status === 'under_review').length,
          archived: ropaList.filter((r) => r.status === 'archived').length,
          withSensitiveData: ropaList.filter((r) => r.isSensitiveData).length,
          withCrossBorderTransfers: ropaList.filter((r) => r.crossBorderTransfers).length,
          dpiaRequired: ropaList.filter((r) => r.dpiaRequired).length,
          dpiaCompleted: ropaList.filter((r) => r.dpiaRequired && r.dpiaId).length,
          byLegalBasis,
        },
      }, config);
    }

    if (method === 'get' && url.match(/\/ropa\/records(\?.*)?$/) && !url.includes('/ropa/records/')) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const filtered = statusParam ? ropaList.filter((r) => r.status === statusParam) : ropaList;
      const summary = {
        total: filtered.length,
        byStatus: filtered.reduce((acc: Record<string, number>, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}),
        sensitiveDataCount: filtered.filter((r) => r.isSensitiveData).length,
        crossBorderCount: filtered.filter((r) => r.crossBorderTransfers).length,
        dpiaRequiredCount: filtered.filter((r) => r.dpiaRequired).length,
        dpiaCompletedCount: filtered.filter((r) => r.dpiaRequired && r.dpiaId).length,
      };
      throw buildError(200, { success: true, data: { records: filtered, summary } }, config);
    }

    if (method === 'get' && /\/ropa\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/ropa/records/')[1].split('?')[0];
      const record = ropaList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'RoPA record not found' }, config);
      throw buildError(200, { success: true, data: { record } }, config);
    }

    if (method === 'post' && url.endsWith('/ropa/records')) {
      const newRecord = {
        id: `ropa-${Date.now()}`,
        organizationId: 'org-001',
        ...body,
        dataCategories: body.dataCategories ?? [],
        dataSubjectCategories: body.dataSubjectCategories ?? [],
        recipientCategories: body.recipientCategories ?? [],
        thirdPartyTransfers: body.thirdPartyTransfers ?? false,
        crossBorderTransfers: body.crossBorderTransfers ?? false,
        isSensitiveData: body.isSensitiveData ?? false,
        dpiaRequired: body.dpiaRequired ?? false,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      ropaList = [newRecord, ...ropaList];
      throw buildError(201, { success: true, data: { record: newRecord }, message: 'RoPA record created' }, config);
    }

    if (method === 'patch' && /\/ropa\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/ropa/records/')[1].split('?')[0];
      const record = ropaList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'RoPA record not found' }, config);
      const updated = { ...record, ...body };
      ropaList = ropaList.map((r) => r.id === id ? updated : r);
      throw buildError(200, { success: true, data: { record: updated }, message: 'RoPA record updated' }, config);
    }

    if (method === 'delete' && /\/ropa\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/ropa/records/')[1].split('?')[0];
      const record = ropaList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'RoPA record not found' }, config);
      if (record.status === 'active') throw buildError(400, { success: false, message: 'Cannot delete an active RoPA record. Archive it first.' }, config);
      ropaList = ropaList.filter((r) => r.id !== id);
      throw buildError(200, { success: true, message: 'RoPA record deleted' }, config);
    }

    // ── DPIA Assessments ──────────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/dpia\/assessments(\?.*)?$/) && !url.includes('/dpia/assessments/')) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const filtered = statusParam ? dpiaList.filter((a) => a.status === statusParam) : dpiaList;
      const summary = {
        total: filtered.length,
        byStatus: filtered.reduce((acc: Record<string, number>, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
        byRiskLevel: filtered.reduce((acc: Record<string, number>, a) => {
          if (a.overallRiskLevel) acc[a.overallRiskLevel] = (acc[a.overallRiskLevel] || 0) + 1; return acc;
        }, {}),
        pendingDpoConsultation: filtered.filter((a) => a.dpoConsultationRequired && a.dpoApproved === null).length,
      };
      throw buildError(200, { success: true, data: { assessments: filtered, summary } }, config);
    }

    if (method === 'get' && /\/dpia\/assessments\/[^/?]+$/.test(url)) {
      const id = url.split('/dpia/assessments/')[1].split('?')[0];
      const assessment = dpiaList.find((a) => a.id === id);
      if (!assessment) throw buildError(404, { success: false, message: 'DPIA not found' }, config);
      throw buildError(200, { success: true, data: { assessment } }, config);
    }

    if (method === 'post' && url.endsWith('/dpia/assessments')) {
      const newAssessment = {
        id: `dpia-${Date.now()}`,
        organizationId: 'org-001',
        ...body,
        risksIdentified: body.risksIdentified ?? [],
        mitigationMeasures: body.mitigationMeasures ?? [],
        dpoConsultationRequired: body.dpoConsultationRequired ?? false,
        dpoApproved: null,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      dpiaList = [newAssessment, ...dpiaList];
      throw buildError(201, { success: true, data: { assessment: newAssessment }, message: 'DPIA assessment created' }, config);
    }

    if (method === 'patch' && /\/dpia\/assessments\/[^/?]+$/.test(url) && !url.includes('/dpo-review')) {
      const id = url.split('/dpia/assessments/')[1].split('?')[0];
      const assessment = dpiaList.find((a) => a.id === id);
      if (!assessment) throw buildError(404, { success: false, message: 'DPIA not found' }, config);
      if (assessment.status === 'approved') throw buildError(400, { success: false, message: 'Approved DPIAs cannot be edited.' }, config);
      const updates: Record<string, unknown> = { ...body };
      if (body.status === 'approved') { updates.approvedAt = new Date().toISOString(); }
      const updated = { ...assessment, ...updates };
      dpiaList = dpiaList.map((a) => a.id === id ? updated : a);
      throw buildError(200, { success: true, data: { assessment: updated }, message: 'DPIA updated' }, config);
    }

    if (method === 'post' && /\/dpia\/assessments\/[^/?]+\/dpo-review$/.test(url)) {
      const id = url.split('/dpia/assessments/')[1].split('/dpo-review')[0];
      const assessment = dpiaList.find((a) => a.id === id);
      if (!assessment) throw buildError(404, { success: false, message: 'DPIA not found' }, config);
      const updated = {
        ...assessment,
        dpoApproved: body.approved,
        dpoRecommendation: body.recommendation ?? null,
        dpoConsultationDate: new Date().toISOString(),
        status: body.approved ? 'in_review' : 'requires_update',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dpiaList = dpiaList.map((a) => a.id === id ? updated : a) as any;
      throw buildError(200, { success: true, data: { assessment: updated } }, config);
    }

    if (method === 'delete' && /\/dpia\/assessments\/[^/?]+$/.test(url)) {
      const id = url.split('/dpia/assessments/')[1].split('?')[0];
      const assessment = dpiaList.find((a) => a.id === id);
      if (!assessment) throw buildError(404, { success: false, message: 'DPIA not found' }, config);
      if (assessment.status === 'approved') throw buildError(400, { success: false, message: 'Cannot delete an approved DPIA.' }, config);
      dpiaList = dpiaList.filter((a) => a.id !== id);
      throw buildError(200, { success: true, message: 'DPIA deleted' }, config);
    }

    // ── Sensitive Data Records ────────────────────────────────────────────────
    if (method === 'get' && url.match(/\/sensitive-data\/risk-overview(\?.*)?$/)) {
      const active = sensitiveDataList.filter((r) => r.status === 'active');
      const unprotected = active.filter((r) => !r.encryptionApplied && !r.pseudonymizationApplied);
      const dpiaNotStarted = active.filter((r) => r.dpiaRequired && r.dpiaStatus === 'not_started');
      const byDataType = active.reduce((acc: Record<string, number>, r) => { acc[r.dataType] = (acc[r.dataType] || 0) + 1; return acc; }, {});
      throw buildError(200, {
        success: true,
        data: {
          totalActive: active.length,
          unprotectedRecords: unprotected.length,
          dpiaNotStarted: dpiaNotStarted.length,
          consentBasedRecords: active.filter((r) => r.legalBasis === 'explicit_consent').length,
          riskScore: unprotected.length > 0 || dpiaNotStarted.length > 0 ? 'high' : 'low',
          byDataType,
        },
      }, config);
    }

    if (method === 'get' && url.match(/\/sensitive-data\/records(\?.*)?$/) && !url.includes('/sensitive-data/records/')) {
      const statusParam = new URL(url, 'http://x').searchParams.get('status');
      const typeParam = new URL(url, 'http://x').searchParams.get('dataType');
      let filtered = [...sensitiveDataList];
      if (statusParam) filtered = filtered.filter((r) => r.status === statusParam);
      if (typeParam) filtered = filtered.filter((r) => r.dataType === typeParam);
      const summary = {
        total: filtered.length,
        active: filtered.filter((r) => r.status === 'active').length,
        byDataType: filtered.reduce((acc: Record<string, number>, r) => { acc[r.dataType] = (acc[r.dataType] || 0) + 1; return acc; }, {}),
        byLegalBasis: filtered.reduce((acc: Record<string, number>, r) => { acc[r.legalBasis] = (acc[r.legalBasis] || 0) + 1; return acc; }, {}),
        dpiaNotStarted: filtered.filter((r) => r.dpiaRequired && r.dpiaStatus === 'not_started').length,
        withEncryption: filtered.filter((r) => r.encryptionApplied).length,
        withPseudonymization: filtered.filter((r) => r.pseudonymizationApplied).length,
      };
      throw buildError(200, { success: true, data: { records: filtered, summary } }, config);
    }

    if (method === 'get' && /\/sensitive-data\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/sensitive-data/records/')[1].split('?')[0];
      const record = sensitiveDataList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'Sensitive data record not found' }, config);
      throw buildError(200, { success: true, data: { record } }, config);
    }

    if (method === 'post' && url.endsWith('/sensitive-data/records')) {
      if (body.legalBasis === 'explicit_consent' && !body.consentRequestId) {
        throw buildError(400, { success: false, message: 'A consentRequestId is required when legalBasis is explicit_consent' }, config);
      }
      const newRecord = {
        id: `sdr-${Date.now()}`,
        organizationId: 'org-001',
        ...body,
        dpiaRequired: true,
        dpiaStatus: 'not_started',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      sensitiveDataList = [newRecord, ...sensitiveDataList];
      throw buildError(201, { success: true, data: { record: newRecord }, message: 'Sensitive data record created. DPIA assessment required.' }, config);
    }

    if (method === 'patch' && /\/sensitive-data\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/sensitive-data/records/')[1].split('?')[0];
      const record = sensitiveDataList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'Sensitive data record not found' }, config);
      const updated = { ...record, ...body };
      sensitiveDataList = sensitiveDataList.map((r) => r.id === id ? updated : r);
      throw buildError(200, { success: true, data: { record: updated }, message: 'Sensitive data record updated' }, config);
    }

    if (method === 'delete' && /\/sensitive-data\/records\/[^/?]+$/.test(url)) {
      const id = url.split('/sensitive-data/records/')[1].split('?')[0];
      const record = sensitiveDataList.find((r) => r.id === id);
      if (!record) throw buildError(404, { success: false, message: 'Sensitive data record not found' }, config);
      if (record.status === 'active') throw buildError(400, { success: false, message: 'Cannot delete an active sensitive data record. Suspend or discontinue it first.' }, config);
      sensitiveDataList = sensitiveDataList.filter((r) => r.id !== id);
      throw buildError(200, { success: true, message: 'Sensitive data record deleted' }, config);
    }

    // ── Disclosure Register ───────────────────────────────────────────────────
    if (method === 'get' && url.includes('/disclosure/records') && !url.includes('/validate')) {
      const approved = disclosureList.filter((r) => r.art16ClearanceResult === 'approved').length;
      const blocked = disclosureList.filter((r) => r.art16ClearanceResult === 'blocked').length;
      const crossBorder = disclosureList.filter((r) => r.isCrossBorder).length;
      const executed = disclosureList.filter((r) => r.status === 'executed').length;
      const summary = { total: disclosureList.length, approved, blocked, crossBorder, executed };
      throw buildError(200, { success: true, data: { records: disclosureList, summary } }, config);
    }

    if (method === 'post' && url.endsWith('/disclosure/records')) {
      const newRecord = {
        id: `disc-${Date.now()}`, organizationId: 'org-001', ...body,
        art16ClearanceResult: 'approved', art16Violations: [],
        status: 'pending', createdAt: new Date().toISOString(),
      };
      disclosureList = [newRecord, ...disclosureList];
      throw buildError(201, { success: true, data: { record: newRecord, art16Result: { allowed: true, violations: [], warnings: [] } }, message: 'Disclosure record created — Art. 16 clearance: APPROVED' }, config);
    }

    if (method === 'post' && url.includes('/disclosure/validate-art16')) {
      const dataTypes: string[] = (body as any).dataTypes || [];
      const sensitiveTypes = ['health', 'biometric', 'genetic', 'health_data'];
      const hasSensitive = dataTypes.some((t: string) => sensitiveTypes.includes(t));
      const allowed = !hasSensitive;
      const violations = hasSensitive
        ? [{ ruleId: 'ART16-001', reason: 'Sensitive data types detected — explicit consent required', severity: 'critical', requiredAction: 'Obtain explicit written consent from data subjects' }]
        : [];
      throw buildError(200, { success: true, data: { allowed, decision: allowed ? 'APPROVED' : 'BLOCKED', violations, warnings: [], recommendation: allowed ? 'All Art. 16 checks passed' : 'Resolve violations before sharing data' } }, config);
    }

    if (method === 'post' && /\/disclosure\/records\/[^/?]+\/revoke$/.test(url)) {
      const id = url.split('/disclosure/records/')[1].split('/')[0];
      disclosureList = disclosureList.map((r) => r.id === id ? { ...r, status: 'revoked' } : r);
      throw buildError(200, { success: true, message: 'Disclosure record revoked' }, config);
    }

    // ── Destruction Certificates ──────────────────────────────────────────────
    if (method === 'get' && url.includes('/destruction/certificates') && !url.includes('/verify')) {
      const byMethod = destructionList.reduce((acc: Record<string, number>, c) => { acc[c.destructionMethod] = (acc[c.destructionMethod] || 0) + 1; return acc; }, {});
      const byTrigger = destructionList.reduce((acc: Record<string, number>, c) => { acc[c.destructionTrigger] = (acc[c.destructionTrigger] || 0) + 1; return acc; }, {});
      const verified = destructionList.filter((c) => c.verifiedAt).length;
      const totalRecordsDestroyed = destructionList.reduce((sum, c) => sum + (c.recordCount || 0), 0);
      const summary = { total: destructionList.length, byMethod, byTrigger, verified, totalRecordsDestroyed };
      throw buildError(200, { success: true, data: { certificates: destructionList, summary } }, config);
    }

    if (method === 'post' && url.endsWith('/destruction/certificates')) {
      const year = new Date().getFullYear();
      const certificateNumber = `DEST-${year}-${String(destructionList.length + 1).padStart(6, '0')}`;
      const newCert = {
        id: `cert-${Date.now()}`, organizationId: 'org-001', certificateNumber,
        ...body, verificationHash: 'demo-hash-' + Date.now(), verifiedAt: null,
        createdAt: new Date().toISOString(),
      };
      destructionList = [newCert, ...destructionList];
      throw buildError(201, { success: true, data: { certificate: newCert }, message: `Destruction certificate ${certificateNumber} issued` }, config);
    }

    if (method === 'post' && /\/destruction\/certificates\/[^/?]+\/verify$/.test(url)) {
      const id = url.split('/destruction/certificates/')[1].split('/')[0];
      destructionList = destructionList.map((c) => c.id === id ? { ...c, verifiedAt: new Date().toISOString() } : c);
      throw buildError(200, { success: true, message: 'Certificate verified' }, config);
    }

    // ── Breach harm assessment ────────────────────────────────────────────────
    if (method === 'post' && /\/breaches\/[^/?]+\/harm-assessment$/.test(url)) {
      const harmLevel = (body as any).harmLevel || 'medium';
      const notifyAuthorityRequired = ['medium', 'high', 'critical'].includes(harmLevel);
      const notifyUsersRequired = ['high', 'critical'].includes(harmLevel);
      throw buildError(200, {
        success: true,
        data: {
          incident: { id: url.split('/breaches/')[1].split('/')[0], harmLevel },
          notificationRequirements: { notifyAuthorityRequired, notifyUsersRequired, message: notifyAuthorityRequired ? 'SDAIA notification required within 72h' : 'No authority notification required' },
        },
        message: 'Harm assessment recorded',
      }, config);
    }

    // ── DSAR identity verification ────────────────────────────────────────────
    if (method === 'post' && /\/dsar\/admin\/requests\/[^/?]+\/verify-identity$/.test(url)) {
      const method_ = (body as any).identityVerificationMethod || 'otp';
      throw buildError(200, { success: true, data: { request: { identityVerified: true, identityVerifiedAt: new Date().toISOString(), identityVerificationMethod: method_ } }, message: 'Identity verified successfully' }, config);
    }

    // ── Health check ──────────────────────────────────────────────────────────
    if (method === 'get' && url.includes('/health')) {
      throw buildError(200, { success: true, data: { status: 'healthy' } }, config);
    }

    // Fallback — return empty success
    throw buildError(200, { success: true, data: {} }, config);
  });

  // Convert our "fake errors" back to resolved responses
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.__demoResponse) {
        if (err.status >= 400) return Promise.reject(err);
        return Promise.resolve(err);
      }
      return Promise.reject(err);
    }
  );
}

// ─── Helper: build a fake axios-like error/response ──────────────────────────
function buildError(status: number, data: unknown, config: unknown) {
  const err: Record<string, unknown> = {
    __demoResponse: true,
    status,
    data,
    config,
    headers: {},
    response: { status, data },
  };
  return err;
}

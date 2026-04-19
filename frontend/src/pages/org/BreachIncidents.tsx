import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface BreachIncident {
  id: string;
  title: string;
  description: string;
  breachType: string;
  severity: string;
  status: string;
  affectedDataTypes: string[];
  estimatedAffectedUsers?: number;
  discoveredAt: string;
  resolvedAt?: string;
  actionsTaken?: string;
  timeline: Array<{ timestamp: string; action: string; performedBy: string; note?: string }>;
  notifiedAuthority: boolean;
  notifiedAuthorityAt?: string;
  notifiedUsers: boolean;
  notifiedUsersAt?: string;
  notifyAuthorityRequired: boolean;
  notifyUsersRequired: boolean;
  authorityDeadline?: string;
  isAuthorityOverdue: boolean;
  harmLevel?: string;
  harmAssessment?: Record<string, unknown>;
  rootCauseAnalysis?: string;
  rootCauseCategory?: string;
  preventiveMeasures?: string;
  createdAt: string;
  reporter?: { id: string; name: string; email: string };
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700', investigating: 'bg-orange-100 text-orange-700',
  contained: 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700',
};

const BREACH_TYPE_LABELS: Record<string, string> = {
  unauthorized_access: 'Unauthorized Access', data_loss: 'Data Loss', ransomware: 'Ransomware',
  insider_threat: 'Insider Threat', system_compromise: 'System Compromise',
  accidental_disclosure: 'Accidental Disclosure', other: 'Other',
};

const RCA_CATEGORIES: Record<string, string> = {
  human_error: 'Human Error', technical_failure: 'Technical Failure',
  malicious_attack: 'Malicious Attack', third_party_failure: 'Third Party Failure',
  process_failure: 'Process Failure', unknown: 'Unknown',
};

const EMPTY_FORM = {
  title: '', description: '', breachType: 'unauthorized_access', severity: 'medium',
  affectedDataTypes: '', estimatedAffectedUsers: '', discoveredAt: '', actionsTaken: '',
  harmLevel: '',
};

const EMPTY_HARM = {
  harmLevel: 'medium', financialHarm: false, reputationalHarm: false, physicalHarm: false,
  identityTheftRisk: false, discriminationRisk: false, explanation: '',
};

export default function BreachIncidents() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedIncident, setSelectedIncident] = useState<BreachIncident | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'update' | 'harm' | 'rca'>('update');

  // Update state
  const [updateStatus, setUpdateStatus] = useState('');
  const [timelineNote, setTimelineNote] = useState('');
  const [notifyAuth, setNotifyAuth] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [actionsTaken, setActionsTaken] = useState('');

  // Harm Assessment state
  const [harmForm, setHarmForm] = useState(EMPTY_HARM);

  // RCA state
  const [rcaForm, setRcaForm] = useState({ rootCauseAnalysis: '', rootCauseCategory: 'unknown', preventiveMeasures: '' });

  const params = new URLSearchParams({ limit: '50' });
  if (statusFilter) params.set('status', statusFilter);
  if (severityFilter) params.set('severity', severityFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['breach-incidents', statusFilter, severityFilter],
    queryFn: () => api.get(`/breaches?${params}`).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/breaches', body),
    onSuccess: () => {
      toast.success('Breach incident logged');
      queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      setShowCreate(false); setForm(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create incident'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/breaches/${id}`, body),
    onSuccess: (res) => {
      toast.success('Incident updated');
      queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      setSelectedIncident(res.data.data.incident);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update incident'),
  });

  const harmMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post(`/breaches/${id}/harm-assessment`, body),
    onSuccess: (res) => {
      const notif = res.data.data?.notificationRequirements;
      toast.success('Harm assessment recorded');
      if (notif?.notifyAuthorityRequired) {
        toast.error('SDAIA notification required within 72h (PDPL Art. 19)', { duration: 6000 });
      }
      queryClient.invalidateQueries({ queryKey: ['breach-incidents'] });
      setSelectedIncident(res.data.data.incident);
      setActiveTab('update');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Harm assessment failed'),
  });

  const handleCreate = () => {
    if (!form.title || !form.description) { toast.error('Title and description are required'); return; }
    const body: Record<string, unknown> = {
      title: form.title, description: form.description,
      breachType: form.breachType, severity: form.severity,
    };
    if (form.affectedDataTypes) body.affectedDataTypes = form.affectedDataTypes.split(',').map((s) => s.trim()).filter(Boolean);
    if (form.estimatedAffectedUsers) body.estimatedAffectedUsers = parseInt(form.estimatedAffectedUsers);
    if (form.discoveredAt) body.discoveredAt = form.discoveredAt;
    if (form.actionsTaken) body.actionsTaken = form.actionsTaken;
    if (form.harmLevel) body.harmLevel = form.harmLevel;
    createMutation.mutate(body);
  };

  const openDetail = (inc: BreachIncident) => {
    setSelectedIncident(inc);
    setUpdateStatus(inc.status);
    setTimelineNote(''); setNotifyAuth(inc.notifiedAuthority); setNotifyUsers(inc.notifiedUsers);
    setActionsTaken(inc.actionsTaken || ''); setActiveTab('update');
    setHarmForm({ ...EMPTY_HARM, harmLevel: inc.harmLevel || 'medium' });
    setRcaForm({ rootCauseAnalysis: inc.rootCauseAnalysis || '', rootCauseCategory: inc.rootCauseCategory || 'unknown', preventiveMeasures: inc.preventiveMeasures || '' });
  };

  const handleUpdate = () => {
    if (!selectedIncident) return;
    const body: Record<string, unknown> = {};
    if (updateStatus !== selectedIncident.status) body.status = updateStatus;
    if (timelineNote) body.timelineNote = timelineNote;
    if (notifyAuth && !selectedIncident.notifiedAuthority) body.notifiedAuthority = true;
    if (notifyUsers && !selectedIncident.notifiedUsers) body.notifiedUsers = true;
    if (actionsTaken !== (selectedIncident.actionsTaken || '')) body.actionsTaken = actionsTaken;
    if (Object.keys(body).length === 0) { toast('No changes to save'); return; }
    updateMutation.mutate({ id: selectedIncident.id, body });
  };

  const handleHarmAssessment = () => {
    if (!selectedIncident) return;
    harmMutation.mutate({ id: selectedIncident.id, body: harmForm });
  };

  const handleRca = () => {
    if (!selectedIncident) return;
    updateMutation.mutate({ id: selectedIncident.id, body: rcaForm });
  };

  const incidents: BreachIncident[] = data?.incidents || [];
  const summary = data?.summary;
  const authorityOverdue = incidents.filter((i) => i.isAuthorityOverdue).length;
  const pendingNotification = incidents.filter((i) => i.notifyAuthorityRequired && !i.notifiedAuthority).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breach & Incident Management</h1>
          <p className="text-sm text-gray-500 mt-1">PDPL Art. 19 — Notify SDAIA within 72h · Complete harm assessment for every incident</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Log Incident</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{summary?.total ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-600">{summary?.open ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Open / Investigating</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${authorityOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{authorityOverdue}</p>
          <p className="text-xs text-gray-500 mt-1">72h SLA Overdue</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${pendingNotification > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{pendingNotification}</p>
          <p className="text-xs text-gray-500 mt-1">Pending SDAIA Notif.</p>
        </div>
      </div>

      {/* Alerts */}
      {authorityOverdue > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-800">{authorityOverdue} incident{authorityOverdue > 1 ? 's' : ''} past 72-hour SDAIA notification deadline</p>
            <p className="text-xs text-red-600 mt-0.5">PDPL Art. 19 — Immediate notification to SDAIA required.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="contained">Contained</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input w-auto">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Incident List */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="text-gray-500 font-medium">No incidents recorded</p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>Log First Incident</button>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(inc)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{inc.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[inc.severity]}`}>{inc.severity}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inc.status]}`}>{inc.status}</span>
                    {inc.harmLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[inc.harmLevel]}`}>Harm: {inc.harmLevel}</span>
                    )}
                    {inc.isAuthorityOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-800">72h Overdue</span>
                    )}
                    {inc.notifyAuthorityRequired && !inc.notifiedAuthority && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">SDAIA Notif. Required</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {BREACH_TYPE_LABELS[inc.breachType] || inc.breachType}
                    {inc.estimatedAffectedUsers ? ` · ~${inc.estimatedAffectedUsers.toLocaleString()} users` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Discovered {format(new Date(inc.discoveredAt), 'MMM d, yyyy HH:mm')} ·{' '}
                    {inc.notifiedAuthority
                      ? <span className="text-green-600">SDAIA notified ✓</span>
                      : <span className="text-orange-500">SDAIA not notified</span>}
                  </p>
                </div>
                <span className="text-indigo-500 text-sm shrink-0">View →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Incident Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Log Breach Incident</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-700 font-medium">⚠ PDPL Art. 19: Notify SDAIA within 72 hours of discovering a breach.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. Customer Database Unauthorized Access" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breach Type</label>
                <select value={form.breachType} onChange={(e) => setForm({ ...form, breachType: e.target.value })} className="input">
                  {Object.entries(BREACH_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="input">
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Harm Level</label>
                <select value={form.harmLevel} onChange={(e) => setForm({ ...form, harmLevel: e.target.value })} className="input">
                  <option value="">Not assessed yet</option>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discovered At</label>
                <input type="datetime-local" value={form.discoveredAt} onChange={(e) => setForm({ ...form, discoveredAt: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected Data Types</label>
              <input value={form.affectedDataTypes} onChange={(e) => setForm({ ...form, affectedDataTypes: e.target.value })} className="input" placeholder="names, emails, health data (comma-separated)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Affected Users</label>
              <input type="number" min="0" value={form.estimatedAffectedUsers} onChange={(e) => setForm({ ...form, estimatedAffectedUsers: e.target.value })} className="input" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Actions Taken</label>
              <textarea value={form.actionsTaken} onChange={(e) => setForm({ ...form, actionsTaken: e.target.value })} rows={2} className="input resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Logging...' : 'Log Incident'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Update Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedIncident.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[selectedIncident.severity]}`}>{selectedIncident.severity}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedIncident.status]}`}>{selectedIncident.status}</span>
                  {selectedIncident.harmLevel && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[selectedIncident.harmLevel]}`}>Harm: {selectedIncident.harmLevel}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Notification requirement banner */}
            {selectedIncident.notifyAuthorityRequired && !selectedIncident.notifiedAuthority && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                <p className="text-sm font-bold text-red-800">SDAIA Notification Required (PDPL Art. 19)</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Deadline: {selectedIncident.authorityDeadline ? format(new Date(selectedIncident.authorityDeadline), 'MMM d, yyyy HH:mm') : '72h from discovery'}
                  {selectedIncident.isAuthorityOverdue && ' — OVERDUE'}
                </p>
              </div>
            )}

            {/* Incident summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <p className="text-gray-700">{selectedIncident.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Discovered</p>
                  <p className="font-medium">{format(new Date(selectedIncident.discoveredAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
                {selectedIncident.estimatedAffectedUsers && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Affected Users</p>
                    <p className="font-medium">{selectedIncident.estimatedAffectedUsers.toLocaleString()}</p>
                  </div>
                )}
                {selectedIncident.affectedDataTypes?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase">Affected Data Types</p>
                    <p className="font-medium">{selectedIncident.affectedDataTypes.join(', ')}</p>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex gap-4 text-sm">
                  <div className={selectedIncident.notifiedAuthority ? 'text-green-600' : 'text-orange-500'}>
                    {selectedIncident.notifiedAuthority ? '✓ SDAIA notified' : '○ SDAIA not notified'}
                  </div>
                  <div className={selectedIncident.notifiedUsers ? 'text-green-600' : 'text-gray-400'}>
                    {selectedIncident.notifiedUsers ? '✓ Users notified' : '○ Users not notified'}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {selectedIncident.timeline?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Timeline</p>
                <div className="space-y-2">
                  {selectedIncident.timeline.map((entry, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <div>
                        <p className="text-gray-700">{entry.action}</p>
                        {entry.note && <p className="text-xs text-gray-400">{entry.note}</p>}
                        <p className="text-xs text-gray-400">{format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            {selectedIncident.status !== 'resolved' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                  {(['update', 'harm', 'rca'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {tab === 'update' ? 'Update' : tab === 'harm' ? 'Harm Assessment' : 'Root Cause'}
                    </button>
                  ))}
                </div>

                {/* Update Tab */}
                {activeTab === 'update' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)} className="input text-sm">
                        <option value="open">Open</option><option value="investigating">Investigating</option>
                        <option value="contained">Contained</option><option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Actions Taken</label>
                      <textarea value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} rows={2} className="input resize-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Add Timeline Note</label>
                      <input value={timelineNote} onChange={(e) => setTimelineNote(e.target.value)} className="input text-sm" placeholder="e.g. Isolated affected systems" />
                    </div>
                    <div className="flex gap-6">
                      {!selectedIncident.notifiedAuthority && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={notifyAuth} onChange={(e) => setNotifyAuth(e.target.checked)} className="w-4 h-4 rounded" />
                          <span>Mark SDAIA as Notified</span>
                        </label>
                      )}
                      {!selectedIncident.notifiedUsers && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={notifyUsers} onChange={(e) => setNotifyUsers(e.target.checked)} className="w-4 h-4 rounded" />
                          <span>Mark Data Subjects Notified</span>
                        </label>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleUpdate} disabled={updateMutation.isPending} className="btn-primary flex-1">
                        {updateMutation.isPending ? 'Saving...' : 'Save Update'}
                      </button>
                      <button onClick={() => setSelectedIncident(null)} className="btn-secondary flex-1">Close</button>
                    </div>
                  </div>
                )}

                {/* Harm Assessment Tab */}
                {activeTab === 'harm' && (
                  <div className="space-y-4">
                    {selectedIncident.harmLevel && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p className="text-gray-500 text-xs mb-1">Current harm level</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[selectedIncident.harmLevel]}`}>{selectedIncident.harmLevel}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Harm Level *</label>
                      <select value={harmForm.harmLevel} onChange={(e) => setHarmForm({ ...harmForm, harmLevel: e.target.value })} className="input">
                        <option value="low">Low</option><option value="medium">Medium</option>
                        <option value="high">High</option><option value="critical">Critical</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {['high', 'critical'].includes(harmForm.harmLevel) ? '⚠ High/Critical harm triggers mandatory SDAIA notification + user notification' : 'Medium harm triggers SDAIA notification; Low has no mandatory notification'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Harm Indicators</p>
                      {[
                        { key: 'financialHarm', label: 'Financial Harm' },
                        { key: 'reputationalHarm', label: 'Reputational Harm' },
                        { key: 'physicalHarm', label: 'Physical Harm' },
                        { key: 'identityTheftRisk', label: 'Identity Theft Risk' },
                        { key: 'discriminationRisk', label: 'Discrimination Risk' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!(harmForm as any)[key]}
                            onChange={(e) => setHarmForm({ ...harmForm, [key]: e.target.checked })}
                            className="w-4 h-4 rounded"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                      <textarea value={harmForm.explanation} onChange={(e) => setHarmForm({ ...harmForm, explanation: e.target.value })} rows={3} className="input resize-none text-sm" placeholder="Describe the potential harm to data subjects..." />
                    </div>
                    <button onClick={handleHarmAssessment} disabled={harmMutation.isPending} className="btn-primary w-full">
                      {harmMutation.isPending ? 'Submitting...' : 'Submit Harm Assessment'}
                    </button>
                  </div>
                )}

                {/* RCA Tab */}
                {activeTab === 'rca' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Category</label>
                      <select value={rcaForm.rootCauseCategory} onChange={(e) => setRcaForm({ ...rcaForm, rootCauseCategory: e.target.value })} className="input">
                        {Object.entries(RCA_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Analysis</label>
                      <textarea value={rcaForm.rootCauseAnalysis} onChange={(e) => setRcaForm({ ...rcaForm, rootCauseAnalysis: e.target.value })} rows={4} className="input resize-none text-sm" placeholder="Describe what caused the breach and contributing factors..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Measures</label>
                      <textarea value={rcaForm.preventiveMeasures} onChange={(e) => setRcaForm({ ...rcaForm, preventiveMeasures: e.target.value })} rows={3} className="input resize-none text-sm" placeholder="Describe measures taken or planned to prevent recurrence..." />
                    </div>
                    <button onClick={handleRca} disabled={updateMutation.isPending} className="btn-primary w-full">
                      {updateMutation.isPending ? 'Saving...' : 'Save Root Cause Analysis'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedIncident.status === 'resolved' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
                  ✓ Incident resolved {selectedIncident.resolvedAt ? format(new Date(selectedIncident.resolvedAt), 'MMM d, yyyy') : ''}
                </div>
                {selectedIncident.rootCauseCategory && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-xs text-gray-500 mb-1">Root Cause</p>
                    <p className="font-medium">{RCA_CATEGORIES[selectedIncident.rootCauseCategory] || selectedIncident.rootCauseCategory}</p>
                    {selectedIncident.rootCauseAnalysis && <p className="text-gray-600 mt-1 text-xs">{selectedIncident.rootCauseAnalysis}</p>}
                  </div>
                )}
                <button onClick={() => setSelectedIncident(null)} className="btn-secondary w-full mt-3">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

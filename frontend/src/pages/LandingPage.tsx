import { useNavigate } from 'react-router-dom';

// ─── Shield / lock icon ───────────────────────────────────────────────────────
const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
    <span className="text-xl font-bold text-white tracking-tight">Privora</span>
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();

  const enterDashboard = () => {
    navigate('/admin/login');
  };

  const enterPortal = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <button onClick={enterPortal}
              className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block">
              User Portal
            </button>
            <button onClick={enterDashboard}
              className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors">
              Admin Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 pt-32 pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-40 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Trusted Data Governance &amp; Exchange Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Control Data. Enable Trust.<br />
            <span className="text-blue-400">Stay Compliant.</span>
          </h1>

          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Privora empowers organizations to manage consent, govern personal data, and securely
            exchange information across entities — aligned with Saudi PDPL.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={enterPortal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-600/30">
              User Portal
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={enterDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors border border-slate-600">
              Admin Dashboard
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: 'PDPL', label: 'Compliant by Design' },
              { value: 'AES-256', label: 'Data Encryption' },
              { value: '100%', label: 'Auditable' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">A complete data governance platform</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Purpose-built for Saudi organizations operating under PDPL — from consent collection
              to secure cross-entity data exchange with full auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                <div className={`w-11 h-11 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-3">
              A four-step flow from data request to verified, audited sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-blue-200 z-0" />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white border-2 border-blue-200 rounded-2xl flex flex-col items-center justify-center mx-auto mb-4 shadow-sm">
                  <span className="text-xs font-bold text-blue-400 mb-0.5">STEP {i + 1}</span>
                  {step.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Built for every sector</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Privora powers compliant data sharing across healthcare, finance, and government.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                <div className={`h-2 ${uc.accent}`} />
                <div className="p-6">
                  <div className={`w-10 h-10 ${uc.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    {uc.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{uc.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{uc.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {uc.tags.map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust & Compliance ────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">Enterprise-grade trust &amp; compliance</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Built to align with Saudi PDPL, Privora helps organizations operationalize compliance
              through automation and control — not just documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((t) => (
              <div key={t.title} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {t.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{t.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{t.description}</p>
              </div>
            ))}
          </div>

          {/* Compliance badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {['Saudi PDPL Aligned', 'SHA-256 Integrity Hashing', 'Immutable Audit Logs',
              'Data Minimization Enforced', 'Role-Based Access Control'].map((badge) => (
              <span key={badge}
                className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-4 py-2 rounded-full">
                <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Access ───────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50" id="access">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Access the Platform</h2>
            <p className="text-gray-500 mt-3">Choose your access level to explore Privora.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Portal card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">User Portal</h3>
                  <p className="text-xs text-gray-500">Data subject access</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">Username</span>
                  <span className="text-gray-800 font-medium">M.alharbi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Password</span>
                  <span className="text-gray-800 font-medium">Mpass#4x4@see</span>
                </div>
              </div>

              <button
                onClick={enterPortal}
                className="mt-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors w-full"
              >
                Sign In to User Portal
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Admin Dashboard card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Admin Dashboard</h3>
                  <p className="text-xs text-gray-500">Organization admin access</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">Username</span>
                  <span className="text-gray-800 font-medium">b.alanazi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Password</span>
                  <span className="text-gray-800 font-medium">Ba$$am@4321##</span>
                </div>
              </div>

              <button
                onClick={enterDashboard}
                className="mt-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors w-full"
              >
                Sign In to Admin Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact Us ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed">
            Interested in deploying Privora for your organization or have questions about
            PDPL compliance? We're here to help.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-3">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Email</p>
              <a href="mailto:contact@privora.sa" className="text-sm font-medium text-blue-600 hover:underline">
                contact@privora.sa
              </a>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-3">
              <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Location</p>
              <p className="text-sm font-medium text-gray-700 text-center">Riyadh, Saudi Arabia</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center gap-3">
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Response</p>
              <p className="text-sm font-medium text-gray-700">Within 24 hours</p>
            </div>
          </div>

          <a
            href="mailto:contact@privora.sa"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Send us a message
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <Logo />
              <p className="text-slate-400 text-sm mt-3 max-w-sm leading-relaxed">
                Privora is the trusted data governance and consent-based data exchange platform
                that enables organizations to comply with PDPL while securely sharing personal data.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">Platform operational</span>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'User Portal', action: enterPortal },
                  { label: 'Organization Dashboard', action: enterDashboard },
                  { label: 'Consent Management', action: enterPortal },
                  { label: 'Data Sharing Gateway', action: enterDashboard },
                ].map((l) => (
                  <li key={l.label}>
                    <button onClick={l.action} className="text-sm text-slate-400 hover:text-white transition-colors text-left">{l.label}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Use', 'PDPL Compliance Statement', 'Cookie Policy'].map((l) => (
                  <li key={l}>
                    <span className="text-sm text-slate-500 cursor-default">{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">Contact</h4>
                <p className="text-sm text-slate-400">contact@privora.sa</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Privora. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Aligned with Saudi Personal Data Protection Law (PDPL) — Royal Decree No. M/19
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Consent Management',
    description: 'Collect, track, and manage user consent with full lifecycle control — pending, approved, withdrawn.',
    color: 'bg-blue-100',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Secure Data Exchange',
    description: 'Enable data exchange between organizations through explicit user consent, purpose validation, and full audit traceability.',
    color: 'bg-indigo-100',
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Audit & Compliance Logs',
    description: 'Every action is recorded in an immutable, SHA-256 hashed audit trail — ready for regulatory review.',
    color: 'bg-green-100',
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'PDPL Compliance',
    description: 'Built to align with Saudi PDPL. Operationalize compliance through automation — purpose control, retention enforcement, and data rights management.',
    color: 'bg-amber-100',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
];

const HOW_IT_WORKS = [
  {
    title: 'Organization Requests',
    description: 'Entity X creates a data sharing request specifying purpose, legal basis, data types, and duration.',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </svg>
    ),
  },
  {
    title: 'User Reviews & Decides',
    description: 'The data subject reviews the request with full transparency and approves or rejects it.',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: 'Data Shared Securely',
    description: 'Only the approved minimal fields are released. A SHA-256 hash verifies payload integrity.',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Audit Trail Recorded',
    description: 'An immutable transaction record is created — who shared what, when, and why. Cannot be deleted.',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const USE_CASES = [
  {
    title: 'Healthcare Data Sharing',
    description: 'Hospitals and insurance providers share patient data for pre-authorization and claims processing — with patient consent verified at every step.',
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-100',
    tags: ['Hospital ↔ Insurance', 'Patient Consent', 'Health Records'],
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: 'Financial Verification',
    description: 'Banks and fintech entities verify customer identity and financial history for credit scoring, KYC, and loan applications.',
    accent: 'bg-green-500',
    iconBg: 'bg-green-100',
    tags: ['Bank ↔ Fintech', 'KYC / AML', 'Credit Scoring'],
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Government Data Access',
    description: 'Government agencies access citizen data for benefits eligibility, subsidy verification, and public services — with full legal basis documentation.',
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-100',
    tags: ['Ministry ↔ Citizen', 'Benefits Eligibility', 'Legal Obligation'],
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
];

const TRUST_ITEMS = [
  {
    title: 'Aligned with Saudi PDPL',
    description: 'Built around the Personal Data Protection Law — purpose limitation, legal basis, data subject rights, and more.',
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    title: 'Secure Data Governance',
    description: 'Every data sharing action is gated by explicit user consent, role-based access control, and cryptographic hashing.',
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Full Auditability',
    description: 'Immutable transaction records that cannot be modified or deleted — giving regulators and auditors complete traceability.',
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

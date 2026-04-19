import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { IS_DEMO } from '@/lib/demoMode';
import { DEMO_USER, DEMO_ADMIN, DEMO_TOKENS } from '@/lib/demoData';

type Tab = 'user' | 'org';
type OtpStep = 'email' | 'otp';

interface OtpEmailForm  { email: string }
interface OtpCodeForm   { otp: string }
interface OrgLoginForm  { email: string; password: string }
interface DemoLoginForm { username: string; password: string }

const DEMO_CREDENTIALS: Record<Tab, { username: string; password: string }> = {
  user: { username: 'M.alharbi',  password: 'Mpass#4x4@see' },
  org:  { username: 'b.alanazi', password: 'Ba$$am@4321##' },
};

// ─── Left brand panel ─────────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-10 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Privora</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400">Identity Gateway v1.1</span>
        </div>
      </div>

      {/* Main copy */}
      <div className="relative space-y-4">
        <h2 className="text-3xl font-bold text-white leading-tight">
          Secure Consent &<br />Data Sharing Platform
        </h2>
        <p className="text-slate-400 leading-relaxed text-sm max-w-xs">
          Manage and control how your data is shared across organizations —
          with full transparency, user consent, and PDPL-aligned governance.
        </p>

        {/* Feature bullets */}
        <ul className="space-y-3 pt-2">
          {[
            'Consent lifecycle management',
            'Entity-to-entity data sharing',
            'Immutable audit trail',
            'Saudi PDPL compliant',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-blue-600/30 border border-blue-500/40 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-slate-300">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Security indicators */}
      <div className="relative space-y-2">
        {[
          { label: 'Encrypted Session (TLS 1.3)', icon: '🔒' },
          { label: 'PDPL Compliant Platform', icon: '✅' },
          { label: 'Secure Login', icon: '🛡️' },
        ].map((ind) => (
          <div key={ind.label}
            className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2">
            <span className="text-sm">{ind.icon}</span>
            <span className="text-xs text-slate-400">{ind.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IdentityGateway({ defaultTab = 'user' }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <BrandPanel />

      {/* Right: form panel */}
      <div className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12 xl:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Privora</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Identity Gateway</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Privora account</p>
          </div>


          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setTab('user')}
              className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all ${
                tab === 'user'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              User Login
            </button>
            <button
              onClick={() => setTab('org')}
              className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all ${
                tab === 'org'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Organization
            </button>
          </div>

          {tab === 'user'
            ? IS_DEMO ? <DemoLoginForm tab="user" /> : <UserOtpForm />
            : IS_DEMO ? <DemoLoginForm tab="org"  /> : <OrgLoginForm />
          }

          {/* Nafath */}
          <div className="mt-4">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              disabled
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium cursor-not-allowed bg-gray-50"
            >
              <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">ن</span>
              </div>
              Login with Nafath
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>
            </button>
          </div>

          {/* Security strip */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: '🔒', label: 'Secure Login' },
              { icon: '🛡️', label: 'TLS Encrypted' },
              { icon: '✅', label: 'PDPL Compliant' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>

          {/* Back to landing */}
          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Privora.sa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Demo credential form (replaces both forms when IS_DEMO=true) ─────────────
function DemoLoginForm({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<DemoLoginForm>();

  const onSubmit = ({ username, password }: DemoLoginForm) => {
    const expected = DEMO_CREDENTIALS[tab];
    if (username === expected.username && password === expected.password) {
      setError('');
      if (tab === 'org') {
        setAuth(DEMO_ADMIN, DEMO_TOKENS.accessToken, DEMO_TOKENS.refreshToken);
        toast.success(`Welcome back, ${DEMO_ADMIN.name}!`);
        navigate('/dashboard');
      } else {
        setAuth(DEMO_USER, DEMO_TOKENS.accessToken, DEMO_TOKENS.refreshToken);
        toast.success('Signed in successfully');
        navigate('/portal');
      }
    } else {
      setError('Invalid username or password');
    }
  };

  const eyeOpen = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  const eyeOff = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Username</label>
        <input
          type="text"
          autoComplete="username"
          className={`input h-11 ${errors.username ? 'border-red-400' : ''}`}
          placeholder="Username"
          {...register('username', { required: 'Username is required' })}
        />
        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
      </div>

      <div>
        <label className="label">Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            className={`input h-11 pr-10 ${errors.password ? 'border-red-400' : ''}`}
            placeholder="Password"
            {...register('password', { required: 'Password is required' })}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPw ? eyeOff : eyeOpen}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-lg py-2 px-3">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full h-11">
        Sign In
      </button>
    </form>
  );
}

// ─── User OTP form ────────────────────────────────────────────────────────────
function UserOtpForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<OtpStep>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<OtpEmailForm>();
  const otpForm   = useForm<OtpCodeForm>();

  const requestOtp = async (data: OtpEmailForm) => {
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { email: data.email });
      setEmail(data.email);
      setStep('otp');
      toast.success(IS_DEMO ? 'Demo: enter any 6 digits' : 'Login code sent to your email');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: OtpCodeForm) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: data.otp });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Signed in successfully');
      navigate(user.role === 'user' ? '/portal' : '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setStep('email')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-500 mt-1">
            {IS_DEMO
              ? <><span className="font-medium text-blue-600">Demo:</span> type any 6 digits (e.g. 123456)</>
              : <>Code sent to <strong>{email}</strong></>
            }
          </p>
        </div>

        <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
          <div>
            <label className="label">One-time code</label>
            <input
              type="text"
              inputMode="numeric"
              className="input text-center text-3xl tracking-[0.5em] font-mono h-14"
              placeholder="000000"
              maxLength={6}
              {...otpForm.register('otp', {
                required: 'Code is required',
                minLength: { value: 4, message: 'Code is too short' },
              })}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-red-500 text-xs mt-1">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full h-11" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Didn't receive it?{' '}
          <button
            onClick={() => { setStep('email'); emailForm.setValue('email', email); }}
            className="text-blue-600 hover:underline font-medium"
          >
            Resend code
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={emailForm.handleSubmit(requestOtp)} className="space-y-4">
      <div>
        <label className="label">Email address</label>
        <input
          type="email"
          className={`input h-11 ${emailForm.formState.errors.email ? 'border-red-400' : ''}`}
          placeholder="you@example.com"
          {...emailForm.register('email', { required: 'Email is required' })}
        />
        {emailForm.formState.errors.email && (
          <p className="text-red-500 text-xs mt-1">{emailForm.formState.errors.email.message}</p>
        )}
      </div>
      <button type="submit" className="btn-primary w-full h-11" disabled={loading}>
        {loading ? 'Sending code...' : 'Send Login Code'}
      </button>
      <p className="text-center text-xs text-gray-500">
        We'll send a one-time code — no password needed.
      </p>
    </form>
  );
}

// ─── Org password form ────────────────────────────────────────────────────────
function OrgLoginForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<OrgLoginForm>();

  const onSubmit = async (data: OrgLoginForm) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Organization email</label>
        <input
          type="email"
          className={`input h-11 ${errors.email ? 'border-red-400' : ''}`}
          placeholder="admin@organization.com"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Password</label>
          <button type="button" className="text-xs text-blue-600 hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className={`input h-11 pr-10 ${errors.password ? 'border-red-400' : ''}`}
            placeholder="Your password"
            {...register('password', { required: 'Password is required' })}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPw ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      <button type="submit" className="btn-primary w-full h-11" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In to Dashboard'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Data subject?{' '}
        <button
          type="button"
          onClick={() => {/* handled by tab switch above */}}
          className="text-blue-600 hover:underline font-medium"
        >
          Use User Login tab
        </button>
      </p>
    </form>
  );
}

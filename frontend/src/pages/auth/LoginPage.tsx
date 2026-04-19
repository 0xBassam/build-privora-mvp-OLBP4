import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { IS_DEMO } from '@/lib/demoMode';
import { DEMO_USER, DEMO_TOKENS } from '@/lib/demoData';

type Step = 'email' | 'otp';
interface EmailForm { email: string }
interface OtpForm { otp: string }

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<EmailForm>();
  const otpForm = useForm<OtpForm>();

  const loginAsDemo = () => {
    setAuth(DEMO_USER, DEMO_TOKENS.accessToken, DEMO_TOKENS.refreshToken);
    toast.success('Welcome to Privora Demo!');
    navigate('/portal');
  };

  const requestOtp = async (data: EmailForm) => {
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { email: data.email });
      setEmail(data.email);
      setStep('otp');
      if (IS_DEMO) {
        toast.success('Demo: enter any 6 digits to continue');
      } else {
        toast.success('OTP sent to your email!');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: OtpForm) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: data.otp });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Login successful!');
      navigate(user.role === 'user' ? '/portal' : '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Privora</h1>
          <p className="text-gray-500 text-sm mt-1">Consent Management Platform</p>
        </div>

        {IS_DEMO && (
          <div className="mb-4 bg-blue-600 text-white rounded-xl p-4 text-sm text-center">
            <p className="font-semibold mb-3">Live Demo — no account needed</p>
            <div className="flex gap-2">
              <button onClick={loginAsDemo}
                className="flex-1 bg-white text-blue-700 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors">
                User Portal
              </button>
              <Link to="/admin/login"
                className="flex-1 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-400 transition-colors text-center">
                Admin Dashboard
              </Link>
            </div>
            <p className="text-blue-200 text-xs mt-2">Or sign in below with any email + any 6-digit code</p>
          </div>
        )}

        <div className="card">
          {step === 'email' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email to receive a login code</p>
              <form onSubmit={emailForm.handleSubmit(requestOtp)} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@example.com"
                    {...emailForm.register('email', { required: 'Email is required' })} />
                  {emailForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Login Code'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/admin/login" className="text-sm text-blue-600 hover:underline">
                  Organization Admin? Sign in here
                </Link>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setStep('email')} className="flex items-center text-sm text-gray-500 mb-4 hover:text-gray-700">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">
                {IS_DEMO
                  ? <><strong>Demo:</strong> enter any 6 digits (e.g. 123456)</>
                  : <>We sent a 6-digit code to <strong>{email}</strong></>}
              </p>
              <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
                <div>
                  <label className="label">One-time code</label>
                  <input type="text" className="input text-center text-2xl tracking-widest font-mono"
                    placeholder="000000" maxLength={6}
                    {...otpForm.register('otp', { required: 'OTP is required', minLength: { value: 4, message: 'OTP too short' } })} />
                  {otpForm.formState.errors.otp && (
                    <p className="text-red-500 text-xs mt-1">{otpForm.formState.errors.otp.message}</p>
                  )}
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                Didn't receive it?{' '}
                <button onClick={() => { setStep('email'); emailForm.setValue('email', email); }}
                  className="text-blue-600 hover:underline">Resend code</button>
              </p>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Protected by Saudi PDPL-aligned security practices</p>
      </div>
    </div>
  );
}

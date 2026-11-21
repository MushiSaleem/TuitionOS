import React, { useState } from 'react';
import { ArrowLeft, Lock, QrCode } from 'lucide-react';
import { useTuition } from '@/src/context/TuitionContext';

interface LoginPageProps {
  onBackHome: () => void;
}

export function LoginPage({ onBackHome }: LoginPageProps) {
  const {
    signInWithGoogle,
    signInWithEmail,
    loginDemoStudent,
    logout,
    enterDemoSandbox,
    authError,
    userProfile,
    firebaseUser,
    clientConfig,
    demoSandboxEnabled,
  } = useTuition();

  const brandName = clientConfig.branding.academyName;
  const [tab, setTab] = useState<'staff' | 'student'>('staff');
  const activeTab = demoSandboxEnabled ? tab : 'staff';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [studentCode, setStudentCode] = useState('');
  const [pinOrPhone, setPinOrPhone] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password, displayName.trim(), isSignUp);
    } catch {
      // authError is already captured in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // authError captured in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    const res = loginDemoStudent(studentCode, pinOrPhone);
    if (!res.ok) {
      setStudentError(res.error || 'Unable to verify student credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {brandName}
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Sign in to {brandName}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Your workspace and institute access are loaded automatically after verification.
            </p>
          </div>

          {/* Segmented Tab (Student demo login tab only shown when demo sandbox is enabled) */}
          {demoSandboxEnabled && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setTab('staff')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Institute &amp; Staff
              </button>
              <button
                type="button"
                onClick={() => setTab('student')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student / Parent Portal
              </button>
            </div>
          )}

          {activeTab === 'staff' ? (
            <div className="space-y-5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Kamal Perera"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institute.lk"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {authError && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5 leading-relaxed">
                    {authError}
                  </div>
                )}

                {firebaseUser && !userProfile && !authError && (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
                    Verifying your tenant membership...
                  </div>
                )}

                {firebaseUser && !userProfile && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      Sign out ({firebaseUser.email})
                    </button>
                    {demoSandboxEnabled && (
                      <button
                        type="button"
                        onClick={() => enterDemoSandbox(clientConfig.demo.defaultPortal)}
                        className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover cursor-pointer"
                      >
                        Try Live Demo Sandbox →
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {submitting
                    ? 'Signing In...'
                    : isSignUp
                    ? 'Create Staff Account'
                    : 'Sign In'}
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover cursor-pointer"
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : 'Invited by an institute? Create email login'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <QrCode className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  Enter the Student ID printed on your class card along with your 4-digit portal PIN
                  or registered parent mobile number.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student ID
                </label>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="STU-2026-1001"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  4-Digit PIN or Registered Phone
                </label>
                <input
                  type="password"
                  required
                  value={pinOrPhone}
                  onChange={(e) => setPinOrPhone(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {studentError && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                  {studentError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors cursor-pointer"
              >
                Open Student Portal
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

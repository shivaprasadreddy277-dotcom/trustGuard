import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Mail, AlertTriangle, UserPlus, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Module-level singleton guard to ensure GIS is initialized ONLY ONCE across renders, mounts, and page transitions
let isGsiInitialized = false;
let currentGoogleCallback = null;

function initializeGsiOnce(clientId) {
  if (isGsiInitialized || !window.google?.accounts?.id || !clientId) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (currentGoogleCallback) {
        currentGoogleCallback(response);
      }
    },
  });
  isGsiInitialized = true;
}

const Login = () => {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('signin');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const googleButtonRef = useRef(null);

  // Keep currentGoogleCallback pointing to the latest component handler
  const handleGoogleCredentialResponse = async (r) => {
    if (r?.credential) {
      setIsLoading(true);
      setError(null);
      try {
        await loginWithGoogle({ credential: r.credential });
        navigate('/overview');
      } catch (err) {
        setError(err.message || 'Google auth failed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    currentGoogleCallback = handleGoogleCredentialResponse;
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/overview', { replace: true });
  }, [isAuthenticated, navigate]);

  const renderGoogleButton = () => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid || !window.google?.accounts?.id || !googleButtonRef.current) return;

    initializeGsiOnce(cid);

    // Clear previous children to prevent accumulating duplicate rendered buttons on remounts
    googleButtonRef.current.innerHTML = '';

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: '100%',
    });
  };

  useEffect(() => {
    if (!document.getElementById('google-gsi-client')) {
      const s = document.createElement('script');
      s.id = 'google-gsi-client';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => {
        renderGoogleButton();
      };
      document.head.appendChild(s);
    } else if (window.google?.accounts?.id) {
      renderGoogleButton();
    }
  }, [mode]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try { await login(loginIdentifier, loginPassword); navigate('/overview'); }
    catch (err) { setError(err.status === 401 || err.code === 'INVALID_CREDENTIALS' ? 'Invalid credentials. Check your email/username and password.' : err.message || 'Authentication failed.'); }
    finally { setIsLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    if (regPassword !== confirmPassword) { setError('Passwords do not match.'); setIsLoading(false); return; }
    if (regPassword.length < 8) { setError('Password must be at least 8 characters.'); setIsLoading(false); return; }
    try { await register({ name: fullName, username: regUsername, email: regEmail, password: regPassword, confirmPassword }); navigate('/overview'); }
    catch (err) {
      const msgs = { EMAIL_ALREADY_EXISTS: 'Email already registered.', USERNAME_ALREADY_EXISTS: 'Username taken.', PASSWORD_MISMATCH: 'Passwords do not match.', VALIDATION_ERROR: err.message };
      setError(msgs[err.code] || err.message || 'Account creation failed.');
    }
    finally { setIsLoading(false); }
  };

  const inputCls = "w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-orange-200 bg-white/80 text-slate-900 placeholder-orange-300/60 text-sm font-medium outline-none transition-all duration-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:bg-white hover:border-orange-300";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF5EB 0%, #FFE8E0 20%, #F5E6FF 45%, #E8FFF5 65%, #FFF8EB 100%)' }}>
      {/* Floating colorful orbs */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-orange-400/30 to-rose-400/20 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-gradient-to-br from-violet-400/25 to-pink-400/15 blur-3xl pointer-events-none" style={{ animation: 'float 4s ease-in-out infinite 1s' }} />
      <div className="absolute top-1/2 left-1/3 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-300/15 blur-3xl pointer-events-none" style={{ animation: 'float 5s ease-in-out infinite 0.5s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="rounded-3xl p-8 sm:p-10 bg-white/90 backdrop-blur-2xl border-2 border-orange-200/80 shadow-[0_20px_60px_rgba(255,107,53,0.12),0_8px_20px_rgba(139,92,246,0.06)]">
          {/* Accent bar */}
          <div className="w-16 h-1.5 rounded-full mx-auto mb-7" style={{ background: 'linear-gradient(90deg, #FF6B35, #F43F5E, #8B5CF6, #10B981)' }} />

          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30" style={{ background: 'linear-gradient(135deg, #FF6B35, #F43F5E, #8B5CF6)' }}>
              <Shield size={30} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>TrustGuard</h1>
            <p className="text-xs font-bold text-violet-600 mt-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Autonomous AI Fleet Security
            </p>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {mode === 'signin' ? 'Welcome back' : 'Create your workspace'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'signin' ? 'Sign in to your AI security operations center.' : 'Start protecting your AI agent fleet today.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1.5">Email / Username</label>
                <div className="relative">
                  <input type="text" className={inputCls} placeholder="alex@novacorp.com" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} required />
                  <User size={17} className="absolute left-3.5 top-3.5 text-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1.5">Password</label>
                <div className="relative">
                  <input type="password" className={inputCls} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  <Lock size={17} className="absolute left-3.5 top-3.5 text-orange-500" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 disabled:opacity-50 cursor-pointer" style={{ background: 'linear-gradient(135deg, #FF6B35, #F43F5E, #8B5CF6)' }}>
                <span>{isLoading ? 'Signing in...' : 'Sign in to TrustGuard'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Full Name</label>
                <div className="relative">
                  <input type="text" className={inputCls} placeholder="Alex Vance" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <User size={16} className="absolute left-3.5 top-3.5 text-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Username</label>
                  <div className="relative">
                    <input type="text" className={inputCls} placeholder="alex_dev" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
                    <UserPlus size={15} className="absolute left-3 top-3.5 text-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Email</label>
                  <div className="relative">
                    <input type="email" className={inputCls} placeholder="alex@company.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                    <Mail size={15} className="absolute left-3 top-3.5 text-orange-500" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Password</label>
                  <div className="relative">
                    <input type="password" className={inputCls} placeholder="••••••••" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                    <Lock size={15} className="absolute left-3 top-3.5 text-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Confirm</label>
                  <div className="relative">
                    <input type="password" className={inputCls} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    <Lock size={15} className="absolute left-3 top-3.5 text-orange-500" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 disabled:opacity-50 cursor-pointer" style={{ background: 'linear-gradient(135deg, #FF6B35, #F43F5E, #8B5CF6)' }}>
                <span>{isLoading ? 'Creating...' : 'Create account'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-orange-100" /></div>
            <span className="relative px-3 text-[11px] font-mono font-bold uppercase tracking-wider bg-white text-orange-400">OR</span>
          </div>

          {/* Google GIS Rendered Button */}
          <div className="w-full flex justify-center min-h-[44px]">
            <div ref={googleButtonRef} className="w-full flex justify-center" />
          </div>

          {/* Switch */}
          <div className="mt-5 text-center text-sm">
            {mode === 'signin' ? (
              <span className="text-slate-500">New here? <button type="button" className="font-bold text-orange-600 hover:text-rose-600 hover:underline cursor-pointer" onClick={() => { setMode('create'); setError(null); }}>Create account</button></span>
            ) : (
              <span className="text-slate-500">Have an account? <button type="button" className="font-bold text-orange-600 hover:text-rose-600 hover:underline cursor-pointer" onClick={() => { setMode('signin'); setError(null); }}>Sign in</button></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

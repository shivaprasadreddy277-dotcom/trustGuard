import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('alex_dev');
  const [password, setPassword] = useState('dev12345');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // If already authenticated, redirect to overview
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/overview', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(username, password);
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Invalid operator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-canvas-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background organic glow */}
      <div className="w-96 h-96 rounded-full bg-indigo-100/50 blur-3xl absolute -top-20 -left-20 pointer-events-none" />
      <div className="w-96 h-96 rounded-full bg-rose-100/40 blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-md bg-surface border-2 border-slate-900 rounded-3xl shadow-tactile p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 border-2 border-slate-900 text-indigo-700 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
            <Shield size={30} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
            TrustGuard
          </h1>
          <div className="inline-flex items-center gap-1.5 bg-yellow-soft text-yellow-ink font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-yellow-border mt-1">
            <Sparkles size={11} />
            <span>AI Security Console</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Multi-engine continuous behavioral security for AI agent fleets.
          </p>
        </div>

        {error && (
          <div className="error-banner mb-4 text-xs">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Operator Username
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-9"
                placeholder="Enter operator username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={15} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                className="w-full pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full mt-2"
            disabled={isLoading}
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Security Console'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Quick Fill Helper for Jury */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            ⚡ Quick-Fill Hackathon Jury Accounts
          </span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono"
              onClick={() => handleQuickFill('alex_dev', 'dev12345')}
            >
              alex_dev (Lead)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono"
              onClick={() => handleQuickFill('sec_analyst', 'analyst12345')}
            >
              sec_analyst (SOC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

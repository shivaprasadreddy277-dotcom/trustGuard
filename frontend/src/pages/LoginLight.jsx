import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginLight = () => {
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TrustGuard</h1>
          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
            AI Security Operations Console
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Autonomous multi-engine security & intent drift control for AI agent fleets.
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
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Hackathon Jury Demo Accounts
          </span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => handleQuickFill('alex_dev', 'dev12345')}
            >
              alex_dev (Dev Lead)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
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

export default LoginLight;

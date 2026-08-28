import React, { useState, useEffect } from 'react';
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
  useEffect(() => {
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
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Shield size={28} />
          </div>
          <h1 className="login-title-h1">TrustGuard</h1>
          <div className="login-brand-tagline">
            <Sparkles size={11} />
            <span>AI Security Console</span>
          </div>
          <p className="login-subtitle">
            Autonomous multi-engine security & intent drift control for AI agent fleets.
          </p>
        </div>

        {error && (
          <div className="error-banner mb-4">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label">Operator Username</label>
            <div className="login-input-wrap">
              <input
                type="text"
                placeholder="Enter operator username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User size={16} className="login-input-icon" />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <div className="login-input-wrap">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={16} className="login-input-icon" />
            </div>
          </div>

          <button
            type="submit"
            className="btn-signin-cta"
            disabled={isLoading}
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Security Console'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Quick Fill Helper for Jury */}
        <div className="login-jury-helper">
          <span className="jury-helper-label">
            ⚡ Quick-Fill Hackathon Jury Accounts
          </span>
          <div className="jury-quick-buttons">
            <button
              type="button"
              className="jury-quick-btn"
              onClick={() => handleQuickFill('alex_dev', 'dev12345')}
            >
              alex_dev (Lead)
            </button>
            <button
              type="button"
              className="jury-quick-btn"
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

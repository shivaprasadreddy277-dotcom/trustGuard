import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const from = location.state?.from?.pathname || '/overview';

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (!formData.username || !formData.name || !formData.email || !formData.password) {
          setErrorMsg('All fields are required.');
          setIsLoading(false);
          return;
        }
        await register(formData);
        setSuccessMsg('Account registered successfully! Redirecting...');
        setTimeout(() => navigate(from, { replace: true }), 800);
      } else {
        if (!formData.email || !formData.password) {
          setErrorMsg('Please enter your email and password.');
          setIsLoading(false);
          return;
        }
        await login(formData.email, formData.password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo shortcut helper for jury test convenience
  const fillDemoAccount = () => {
    setIsRegisterMode(false);
    setFormData({
      username: 'alex_dev',
      name: 'Alex Dev',
      email: 'alex@novacorp.com',
      password: 'SuperSecretPassword123!',
    });
    setErrorMsg('');
  };

  return (
    <div className="login-container">
      <div className="login-grid-bg" />

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-badge">
            <Shield className="brand-icon" size={32} />
          </div>
          <h2>TrustGuard</h2>
          <p className="login-subtitle">AI Security, Privacy & Trust Control Center</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
            }}
          >
            Operator Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMsg('');
            }}
          >
            Register Profile
          </button>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegisterMode && (
            <>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="e.g. alex_dev"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">Display Name</label>
                <div className="input-with-icon">
                  <User size={18} className="field-icon" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Alex Dev"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="operator@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" />
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-loading">Authenticating...</span>
            ) : (
              <>
                <span>{isRegisterMode ? 'Create Security Account' : 'Authenticate & Access SOC'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button type="button" className="demo-fill-btn" onClick={fillDemoAccount}>
            Prefill Demo Operator Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

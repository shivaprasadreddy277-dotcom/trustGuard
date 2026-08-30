import React, { useState, useEffect } from 'react';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

const Header = () => {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState({ status: 'healthy', version: '1.0.0' });

  // Theme support
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('trustguard_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    localStorage.setItem('trustguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await authApi.getHealth();
        if (isMounted) {
          setHealthStatus(res);
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ status: 'offline', error: err.message });
        }
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      {/* Left: Engine Health Status */}
      <div className="flex items-center gap-3">
        <div className="header-engine-pill">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>SYSTEM OPERATIONAL · 5/5 ENGINES ACTIVE</span>
        </div>
      </div>

      {/* Right: Theme Switcher, Operator Profile & Sign Out */}
      <div className="header-actions">
        {/* Theme Switcher */}
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-orange-600" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Operator Profile */}
        <div className="operator-profile">
          <div className="operator-avatar">
            <User size={15} />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="operator-name">
              {user?.name || user?.username || 'Security Analyst'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SOC Operator</span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          type="button"
          className="btn-header-logout"
          onClick={logout}
          title="Sign Out of TrustGuard Console"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

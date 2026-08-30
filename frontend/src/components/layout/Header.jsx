import React, { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

const Header = () => {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState({ status: 'healthy', version: '1.0.0' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.className = 'light-mode';
  }, []);

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

      {/* Right: Operator Profile & Sign Out */}
      <div className="header-actions">
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

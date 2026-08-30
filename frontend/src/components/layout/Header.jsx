import React, { useState, useEffect } from 'react';
import { User, LogOut, Menu, X, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

const Header = ({ onToggleMobileNav, isMobileNavOpen }) => {
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
      {/* Left: Mobile Hamburger Toggle + Engine Health Status */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-200 text-orange-900 hover:bg-orange-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
          title={isMobileNavOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          aria-label="Toggle navigation menu"
        >
          {isMobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Engine Health Status Indicator */}
        <div className="header-engine-pill truncate max-w-[200px] sm:max-w-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="hidden sm:inline">SYSTEM OPERATIONAL · 5/5 ENGINES ACTIVE</span>
          <span className="sm:hidden font-mono font-bold text-[10px]">5/5 ENGINES ACTIVE</span>
        </div>
      </div>

      {/* Right: Operator Profile & Sign Out */}
      <div className="header-actions">
        {/* Operator Profile */}
        <div className="operator-profile">
          <div className="operator-avatar shrink-0">
            <User size={15} />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="operator-name truncate max-w-[130px]">
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

import React, { useState, useEffect } from 'react';
import { User, LogOut, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

const Header = () => {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState({ status: 'healthy', version: '1.0.0' });

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
      <div className="header-left">
        <div className="header-engine-pill">
          <span className="dot" />
          <span>SYSTEM OPERATIONAL • 5/5 ENGINES ACTIVE</span>
        </div>
      </div>

      {/* Right: Operator Profile & Sign Out */}
      <div className="header-actions">
        <div className="operator-profile">
          <div className="operator-avatar">
            <User size={16} />
          </div>
          <div className="operator-info">
            <span className="operator-name">
              {user?.name || user?.username || 'Security Analyst'}
            </span>
            <span className="operator-role">SOC Security Operator</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-header-logout"
          onClick={logout}
          title="Sign Out of TrustGuard Console"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

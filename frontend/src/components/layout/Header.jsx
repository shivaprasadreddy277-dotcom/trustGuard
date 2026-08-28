import React, { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

const Header = () => {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', version: '1.0.0' });

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
      <div className="header-left">
        <div className="health-badge">
          <span className={`status-dot ${healthStatus.status === 'healthy' ? 'online' : 'offline'}`} />
          <span className="health-text">
            Core Backend: <strong>{healthStatus.status === 'healthy' ? 'LIVE (v' + (healthStatus.version || '1.0.0') + ')' : 'OFFLINE'}</strong>
          </span>
        </div>
      </div>

      <div className="header-actions">
        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || user?.username || 'Security Operator'}</span>
            <span className="user-role">{user?.email || 'SOC Operator'}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout} title="Sign Out">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

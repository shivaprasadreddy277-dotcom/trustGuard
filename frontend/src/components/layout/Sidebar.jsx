import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ShieldCheck,
  Search,
  Bell,
  Users,
  Radio,
  Zap,
  Layers,
  PlaySquare,
} from 'lucide-react';

const Sidebar = () => {
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/overview', label: 'Command Center', icon: LayoutDashboard },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        { path: '/decisions', label: 'Security Decisions', icon: ShieldCheck },
        { path: '/investigations', label: 'Investigation Lab', icon: Search },
        { path: '/alerts', label: 'Security Alerts', icon: Bell },
      ],
    },
    {
      title: 'MONITORING',
      items: [
        { path: '/agents', label: 'Agent Fleet', icon: Users },
        { path: '/sessions', label: 'Session Registry', icon: Radio },
        { path: '/events', label: 'Live Telemetry', icon: Zap },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { path: '/attack-chains', label: 'Attack Chains', icon: Layers },
        { path: '/simulations', label: 'Simulation Lab', icon: PlaySquare },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-shield">
          <Shield size={20} />
        </div>
        <div className="brand-meta">
          <h1>TrustGuard</h1>
          <span className="brand-tagline">AI Agent SOC</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-nav-container">
        {navSections.map((sec) => (
          <div key={sec.title}>
            <div className="nav-section-title">{sec.title}</div>
            <ul className="nav-list">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        isActive ? 'nav-item-link active' : 'nav-item-link'
                      }
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="sidebar-footer-card">
        <div className="system-status-indicator">
          <span className="status-dot-pulse" />
          <span>All 5 Engines Active</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  Users,
  Radio,
  Zap,
  ShieldAlert,
  Search,
  Link,
  PlaySquare,
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/overview', label: 'Overview', icon: Shield },
    { path: '/agents', label: 'Agents', icon: Users },
    { path: '/sessions', label: 'Sessions', icon: Radio },
    { path: '/events', label: 'Events & Telemetry', icon: Zap },
    { path: '/decisions', label: 'Security Decisions', icon: ShieldAlert },
    { path: '/investigations', label: 'Investigations', icon: Search },
    { path: '/attack-chains', label: 'Attack Chains', icon: Link },
    { path: '/simulations', label: 'Simulations', icon: PlaySquare },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <Shield className="brand-icon" size={26} />
        <div className="brand-title-wrap">
          <h1>TrustGuard</h1>
          <span className="brand-tag">SOC Control</span>
        </div>
      </div>

      <nav className="nav-menu">
        <ul>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="engine-status-pill">
          <span className="pulse-indicator" />
          <span>Continuous Security Active</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

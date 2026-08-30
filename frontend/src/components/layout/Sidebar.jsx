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
  BookOpen,
  X
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
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
    <>
      {/* Mobile Dimmed Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop Fixed + Mobile Slide-Over Drawer) */}
      <aside 
        className={`sidebar ${
          isMobileOpen 
            ? 'fixed inset-y-0 left-0 z-50 flex w-[280px] shadow-2xl animate-slide-in-left' 
            : 'hidden lg:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-icon-shield">
              <Shield size={20} />
            </div>
            <div className="brand-meta">
              <h1>TrustGuard</h1>
              <span className="brand-tagline">AI Agent SOC</span>
            </div>
          </div>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center bg-orange-100/60 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav-container overflow-y-auto">
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
                        onClick={onCloseMobile}
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

          {/* ── RESOURCES & GUIDE: Positioned at the very bottom of the sidebar ── */}
          <div className="pt-3 pb-1">
            <div className="nav-section-title">RESOURCES & HELP</div>
            <ul className="nav-list">
              <li>
                <NavLink
                  to="/guide"
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    isActive ? 'nav-item-link active' : 'nav-item-link'
                  }
                >
                  <BookOpen size={16} />
                  <span>Platform Guide</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="sidebar-footer-card shrink-0">
          <div className="system-status-indicator">
            <span className="status-dot-pulse" />
            <span>All 5 Engines Active</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

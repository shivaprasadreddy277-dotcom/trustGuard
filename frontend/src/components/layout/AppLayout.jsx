import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, NavLink } from 'react-router-dom';
import { LayoutDashboard, PlaySquare, Layers, Bell, Zap, BookOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

const AppLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner" />
        <p>Initializing TrustGuard Security Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar with Desktop Fixed + Mobile Drawer */}
      <Sidebar 
        isMobileOpen={isMobileNavOpen} 
        onCloseMobile={() => setIsMobileNavOpen(false)} 
      />

      <div className="main-wrapper">
        <Header 
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)} 
          isMobileNavOpen={isMobileNavOpen} 
        />
        
        {/* Main scrollable content area with padding bottom on mobile for bottom bar */}
        <main className="content-area pb-16 lg:pb-0">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Quick Navigation Bar (phones & small tablets) ── */}
        <nav 
          className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t-2 border-orange-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
          aria-label="Mobile bottom navigation"
        >
          <NavLink
            to="/overview"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-orange-600 font-black' : 'text-slate-500 hover:text-orange-500'
              }`
            }
          >
            <LayoutDashboard size={17} />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/simulations"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-rose-600 font-black' : 'text-slate-500 hover:text-rose-500'
              }`
            }
          >
            <PlaySquare size={17} />
            <span>Simulate</span>
          </NavLink>

          <NavLink
            to="/attack-chains"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-violet-600 font-black' : 'text-slate-500 hover:text-violet-500'
              }`
            }
          >
            <Layers size={17} />
            <span>Chains</span>
          </NavLink>

          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-rose-600 font-black' : 'text-slate-500 hover:text-rose-500'
              }`
            }
          >
            <Bell size={17} />
            <span>Alerts</span>
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-sky-600 font-black' : 'text-slate-500 hover:text-sky-500'
              }`
            }
          >
            <Zap size={17} />
            <span>Telemetry</span>
          </NavLink>

          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                isActive ? 'text-orange-600 font-black' : 'text-slate-500 hover:text-orange-500'
              }`
            }
          >
            <BookOpen size={17} />
            <span>Guide</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;

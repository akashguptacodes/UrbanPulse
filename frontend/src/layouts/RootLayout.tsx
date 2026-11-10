import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Building2,
  PlusCircle,
  Activity,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ShieldAlert,
  CheckCircle,
  FileText,
  Home as HomeIcon,
} from 'lucide-react';

export const RootLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-civic-bg text-civic-text font-sans antialiased selection:bg-emerald-100 selection:text-forest-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 glass-header border-b border-civic-border transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand Mark */}
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="group flex items-center space-x-3 text-forest-900 font-extrabold text-xl tracking-tight transition-transform duration-150 active:scale-95"
            >
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-forest-900 via-forest-800 to-emerald-700 flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-102 transition-all">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight text-forest-900 leading-none">
                  Urban<span className="text-emerald-700">Pulse</span>
                </span>
                <span className="text-[10px] font-medium tracking-wider uppercase text-civic-muted mt-0.5">
                  Civic Infrastructure
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 text-sm font-semibold">
              <Link
                to="/"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-150 ${
                  isActive('/') && location.pathname === '/'
                    ? 'text-forest-900 bg-forest-50/80 shadow-xs'
                    : 'text-civic-muted hover:text-forest-900 hover:bg-white/80'
                }`}
              >
                <HomeIcon className="w-4 h-4 opacity-70" />
                <span>Home</span>
              </Link>
              <Link
                to="/complaints"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-150 ${
                  isActive('/complaints') && location.pathname !== '/complaints/new'
                    ? 'text-forest-900 bg-forest-50/80 shadow-xs'
                    : 'text-civic-muted hover:text-forest-900 hover:bg-white/80'
                }`}
              >
                <FileText className="w-4 h-4 opacity-70" />
                <span>Complaints</span>
              </Link>
              <Link
                to="/complaints/new"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-150 ${
                  isActive('/complaints/new')
                    ? 'text-forest-900 bg-forest-50/80 shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Report Issue</span>
              </Link>
              <Link
                to="/dev-status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-civic-muted hover:text-forest-900 rounded transition-colors ${
                  isActive('/dev-status') ? 'font-bold text-forest-900 bg-forest-50/60' : ''
                }`}
              >
                <Activity className="w-3.5 h-3.5 opacity-60" />
                <span>Diagnostics</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3 text-sm">
            {/* Live Status Pill */}
            <div className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="tracking-tight">Sprint 4: Active</span>
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 pl-2 sm:pl-3 sm:border-l sm:border-civic-border">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="font-semibold text-xs text-forest-950 truncate max-w-[130px] lg:max-w-none">
                    {user.full_name}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-forest-100 border border-forest-200 text-forest-900 flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.full_name?.charAt(0)?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>

                <button
                  onClick={() => logout()}
                  title="Sign out of your account"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-civic-muted hover:text-red-700 border border-civic-border hover:border-red-200 rounded transition-all bg-white hover:bg-red-50/50 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-2 sm:pl-3 sm:border-l sm:border-civic-border">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-forest-900 hover:text-emerald-700 hover:bg-white rounded transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-forest-900 hover:bg-forest-800 text-white rounded shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded text-forest-900 hover:bg-forest-50 border border-civic-border focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-civic-border bg-white/98 backdrop-blur-md px-4 py-3 space-y-2 shadow-lg animate-fadeIn">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-semibold ${
                isActive('/') && location.pathname === '/'
                  ? 'text-forest-900 bg-forest-50'
                  : 'text-civic-muted hover:text-forest-900'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link
              to="/complaints"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-semibold ${
                isActive('/complaints') && location.pathname !== '/complaints/new'
                  ? 'text-forest-900 bg-forest-50'
                  : 'text-civic-muted hover:text-forest-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Complaints</span>
            </Link>
            <Link
              to="/complaints/new"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-semibold ${
                isActive('/complaints/new')
                  ? 'text-forest-900 bg-forest-50'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Report Issue</span>
            </Link>
            <Link
              to="/dev-status"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-semibold ${
                isActive('/dev-status') ? 'text-forest-900 bg-forest-50 font-bold' : 'text-civic-muted'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Diagnostics</span>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <Outlet />
      </main>

      {/* Civic Tech Footer */}
      <footer className="mt-auto bg-white border-t border-civic-border/80 text-civic-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Brand Info */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-md bg-forest-900 flex items-center justify-center text-lime-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-display font-extrabold text-lg text-forest-900">
                  Urban<span className="text-emerald-700">Pulse</span>
                </span>
              </div>
              <p className="text-xs text-civic-muted max-w-md leading-relaxed">
                UrbanPulse is a next-generation civic infrastructure platform empowering citizens and municipal teams
                to identify, report, and track neighborhood issues with complete transparency and AI-assisted triage.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-forest-50 text-forest-800 border border-forest-100">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Verified Civic Data Pipeline
                </span>
              </div>
            </div>

            {/* Column 2: Platform Navigation */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-display font-bold uppercase tracking-wider text-forest-950 text-[11px]">
                Platform Navigation
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:text-forest-900 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/complaints" className="hover:text-forest-900 transition-colors">
                    Complaints Queue
                  </Link>
                </li>
                <li>
                  <Link to="/complaints/new" className="hover:text-forest-900 transition-colors">
                    + Report Issue
                  </Link>
                </li>
                <li>
                  <Link to="/dev-status" className="hover:text-forest-900 transition-colors">
                    Diagnostics & Health
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Emergency & Public Service */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-display font-bold uppercase tracking-wider text-forest-950 text-[11px]">
                Emergency Protocols
              </h4>
              <div className="p-3 rounded-md bg-amber-50/70 border border-amber-200/60 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  For urgent, life-threatening civic emergencies, immediate fires, or gas leaks, please call emergency
                  dispatchers (<strong>112 / 911</strong>) immediately.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Divider & Credits */}
          <div className="pt-6 border-t border-civic-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-civic-muted">
            <p className="font-semibold text-civic-heading">
              UrbanPulse — Civic Issue Reporting &amp; Triage Platform
            </p>
            <p className="text-[11px] text-civic-muted">
              Sprint 4: Full Frontend Web Application &amp; Main Backend Integration. PostgreSQL, Prisma &amp; Express Active.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

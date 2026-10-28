import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export const RootLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Navigation links */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2 text-sky-600 font-extrabold text-xl tracking-tight">
              <span className="text-2xl select-none">🏙️</span>
              <span>UrbanPulse</span>
            </Link>

            <nav className="hidden sm:flex items-center space-x-1 text-xs font-semibold">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/') && location.pathname === '/'
                    ? 'text-sky-700 bg-sky-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Home
              </Link>
              <Link
                to="/complaints"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/complaints') && location.pathname !== '/complaints/new'
                    ? 'text-sky-700 bg-sky-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Complaints
              </Link>
              <Link
                to="/complaints/new"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/complaints/new')
                    ? 'text-sky-700 bg-sky-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                + Report Issue
              </Link>
              <Link
                to="/dev-status"
                className={`px-2 py-1 text-[11px] text-slate-400 hover:text-slate-700 rounded transition-colors ${
                  isActive('/dev-status') ? 'font-bold text-slate-700' : ''
                }`}
              >
                Diagnostics
              </Link>
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3 text-sm">
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Sprint 4: Active
            </span>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <div className="font-semibold text-xs text-slate-800 truncate max-w-[120px] sm:max-w-none">
                    {user.full_name}
                  </div>
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-colors bg-white hover:bg-red-50/50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-600 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Subnavigation */}
        <div className="sm:hidden flex items-center justify-around border-t border-slate-100 px-4 py-2 bg-slate-50 text-xs font-semibold">
          <Link
            to="/"
            className={`py-1 px-2 rounded ${isActive('/') && location.pathname === '/' ? 'text-sky-600 font-bold' : 'text-slate-600'}`}
          >
            Home
          </Link>
          <Link
            to="/complaints"
            className={`py-1 px-2 rounded ${isActive('/complaints') && location.pathname !== '/complaints/new' ? 'text-sky-600 font-bold' : 'text-slate-600'}`}
          >
            Complaints
          </Link>
          <Link
            to="/complaints/new"
            className={`py-1 px-2 rounded ${isActive('/complaints/new') ? 'text-sky-600 font-bold' : 'text-slate-600'}`}
          >
            + Report
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-700">UrbanPulse — Civic Issue Reporting & Triage Platform</p>
          <p className="text-[11px] text-slate-400">
            Sprint 4: Full Frontend Web Application & Main Backend Integration. PostgreSQL, Prisma & Express Active.
          </p>
        </div>
      </footer>
    </div>
  );
};

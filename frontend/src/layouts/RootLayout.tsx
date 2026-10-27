import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export const RootLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-sky-600 font-bold text-xl">
            <span className="text-2xl">🏙️</span>
            <span>UrbanPulse</span>
          </Link>
          <div className="flex items-center space-x-3 text-sm">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              Sprint 2: Auth Active
            </span>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <div className="font-semibold text-xs text-slate-800">{user.full_name}</div>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
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
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-sky-600 rounded transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white rounded transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>UrbanPulse Platform — Sprint 2: PostgreSQL, Prisma & Authentication. Local Development Active.</p>
      </footer>
    </div>
  );
};

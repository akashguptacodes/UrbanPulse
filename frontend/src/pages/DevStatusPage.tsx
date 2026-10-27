import React, { useState } from 'react';
import { checkBackendHealth } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Link } from 'react-router-dom';

interface BackendHealthData {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export const DevStatusPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [healthData, setHealthData] = useState<BackendHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Backend unreachable. Ensure backend service is running on port 4000.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">UrbanPulse Development Console</h1>
        <p className="text-slate-600 text-sm">
          Welcome to the UrbanPulse development environment. Sprint 2 has activated PostgreSQL
          persistence, Prisma ORM, and HttpOnly cookie-based authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Service Topology Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-800 text-base">Service Topology & Ports</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-700">Frontend (Vite + React)</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                Port 5173
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-700">Backend API (Express)</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                Port 4000
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-700">Duplicate Service (FastAPI)</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                Port 8001
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="font-medium text-slate-700">Priority Service (FastAPI)</span>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                Port 8002
              </span>
            </div>
          </div>
        </div>

        {/* Live Connectivity Test Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-800 text-base">Backend Connectivity Test</h2>
          <p className="text-xs text-slate-500">
            Probe the Express backend health check endpoint (<code className="bg-slate-100 px-1 py-0.5 rounded">/api/health</code>).
          </p>

          <button
            onClick={handleTestBackend}
            disabled={loading}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Probing Backend...' : 'Test Backend Health'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {healthData && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs space-y-1">
              <div>
                <span className="font-bold">Status:</span> {healthData.status}
              </div>
              <div>
                <span className="font-bold">Service:</span> {healthData.service} (v{healthData.version})
              </div>
              <div>
                <span className="font-bold">Environment:</span> {healthData.environment}
              </div>
              <div className="text-emerald-600">
                <span className="font-bold">Timestamp:</span> {healthData.timestamp}
              </div>
            </div>
          )}
        </div>

        {/* Sprint 2 Auth Session Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-800 text-base">Authentication Session</h2>
          {isLoading ? (
            <div className="text-xs text-slate-500 animate-pulse">Checking session status...</div>
          ) : isAuthenticated && user ? (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div>
                  <span className="text-slate-500">Logged in as:</span>{' '}
                  <span className="font-semibold text-slate-800">{user.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="font-mono text-slate-800">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-500">Role:</span>{' '}
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                No active session found. Register a new account or sign in with your credentials.
              </p>
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { checkBackendHealth } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import {
  Server,
  Network,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  LogOut,
} from 'lucide-react';

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
    <div className="space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-civic-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-forest-950">
              UrbanPulse Development Console
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-200 uppercase">
              Diagnostics
            </span>
          </div>
          <p className="text-civic-muted text-xs sm:text-sm max-w-2xl">
            Welcome to the UrbanPulse development environment. Sprint 2 has activated PostgreSQL
            persistence, Prisma ORM, and HttpOnly cookie-based authentication.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-forest-50 text-forest-900 border border-forest-200 text-xs font-semibold">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Telemetry Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Service Topology Card */}
        <div className="bg-white p-5 rounded-lg border border-civic-border shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-forest-50 text-forest-800 flex items-center justify-center border border-forest-100">
              <Network className="w-4 h-4 text-emerald-700" />
            </div>
            <h2 className="font-display font-bold text-forest-950 text-sm">Service Topology &amp; Ports</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-civic-border">
              <span className="font-medium text-civic-heading">Frontend (Vite + React)</span>
              <span className="font-mono text-[11px] px-2 py-0.5 bg-forest-50 rounded text-forest-900 font-semibold border border-forest-100">
                Port 5173
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-civic-border">
              <span className="font-medium text-civic-heading">Backend API (Express)</span>
              <span className="font-mono text-[11px] px-2 py-0.5 bg-forest-50 rounded text-forest-900 font-semibold border border-forest-100">
                Port 4000
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-civic-border">
              <span className="font-medium text-civic-heading">Duplicate Service (FastAPI)</span>
              <span className="font-mono text-[11px] px-2 py-0.5 bg-forest-50 rounded text-forest-900 font-semibold border border-forest-100">
                Port 8001
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="font-medium text-civic-heading">Priority Service (FastAPI)</span>
              <span className="font-mono text-[11px] px-2 py-0.5 bg-forest-50 rounded text-forest-900 font-semibold border border-forest-100">
                Port 8002
              </span>
            </div>
          </div>
        </div>

        {/* Live Connectivity Test Card */}
        <div className="bg-white p-5 rounded-lg border border-civic-border shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
              <Server className="w-4 h-4 text-emerald-700" />
            </div>
            <h2 className="font-display font-bold text-forest-950 text-sm">Backend Connectivity Test</h2>
          </div>

          <p className="text-xs text-civic-muted">
            Probe the Express backend health check endpoint (<code className="bg-forest-50 px-1 py-0.5 rounded text-forest-900 font-mono text-[11px]">/api/health</code>).
          </p>

          <button
            onClick={handleTestBackend}
            disabled={loading}
            className="w-full px-3.5 py-2 bg-forest-900 hover:bg-forest-800 text-white rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-98"
          >
            {loading ? 'Probing Backend...' : 'Test Backend Health'}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error:</span> {error}
              </div>
            </div>
          )}

          {healthData && (
            <div className="p-3 bg-forest-50 border border-forest-200 text-forest-900 rounded-md text-xs space-y-1.5 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Healthy &amp; Reachable</span>
              </div>
              <div>
                <span className="font-bold">Status:</span> {healthData.status}
              </div>
              <div>
                <span className="font-bold">Service:</span> {healthData.service} (v{healthData.version})
              </div>
              <div>
                <span className="font-bold">Environment:</span> {healthData.environment}
              </div>
              <div className="text-civic-muted text-[11px] font-mono">
                <span className="font-bold">Timestamp:</span> {healthData.timestamp}
              </div>
            </div>
          )}
        </div>

        {/* Sprint 2 Auth Session Card */}
        <div className="bg-white p-5 rounded-lg border border-civic-border shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-mint-100 text-forest-900 flex items-center justify-center border border-mint-200">
              <ShieldCheck className="w-4 h-4 text-forest-800" />
            </div>
            <h2 className="font-display font-bold text-forest-950 text-sm">Authentication Session</h2>
          </div>

          {isLoading ? (
            <div className="text-xs text-civic-muted animate-pulse">Checking session status...</div>
          ) : isAuthenticated && user ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-forest-50/50 rounded-md border border-civic-border space-y-1.5">
                <div>
                  <span className="text-civic-muted">Logged in as:</span>{' '}
                  <span className="font-bold text-forest-950">{user.full_name}</span>
                </div>
                <div>
                  <span className="text-civic-muted">Email:</span>{' '}
                  <span className="font-mono text-civic-heading">{user.email}</span>
                </div>
                <div>
                  <span className="text-civic-muted">Role:</span>{' '}
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-red-50 hover:text-red-700 text-civic-muted border border-civic-border rounded-md font-semibold transition-all shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="text-civic-muted leading-relaxed">
                No active session found. Register a new account or sign in with your credentials.
              </p>
              <div className="flex space-x-2 pt-1">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 px-3 bg-forest-900 hover:bg-forest-800 text-white rounded-md font-bold transition-all shadow-2xs"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 px-3 bg-forest-50 hover:bg-forest-100 text-forest-900 border border-forest-200 rounded-md font-bold transition-all"
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

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { CIVIC_VISUALS } from '../constants/visuals.ts';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client validation (strict string matching with tests)
    if (!email.trim() || !password) {
      setError('Please provide both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Redirect back to original destination or to /complaints
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/complaints';
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Invalid email or password. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 md:my-10 rounded-xl overflow-hidden bg-white border border-civic-border shadow-lg grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
      {/* Visual Editorial Left Side */}
      <div className="relative hidden md:flex md:col-span-5 bg-forest-950 text-white flex-col justify-between p-8 overflow-hidden">
        <img
          src={CIVIC_VISUALS.authCivicSquare}
          alt="Civic square and modern municipal plaza"
          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/80 to-forest-950/50" />

        <div className="relative z-10 space-y-2.5">
          <div className="w-9 h-9 rounded-md bg-forest-900 border border-forest-700 flex items-center justify-center text-lime-400 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-lime-400">
            Citizen &amp; Official Gateway
          </span>
          <h2 className="font-display font-extrabold text-2xl text-white leading-tight">
            Transparent public governance.
          </h2>
        </div>

        <div className="relative z-10 space-y-2.5 pt-6 border-t border-forest-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Autonomous multi-signal triage</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Immutable complaint timeline logs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct municipal dispatch routing</span>
          </div>
        </div>
      </div>

      {/* Form Right Side */}
      <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6 space-y-1">
          <div className="inline-block md:hidden mb-2">
            <div className="w-8 h-8 rounded-md bg-forest-900 flex items-center justify-center text-lime-400 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-950">
            Sign In to UrbanPulse
          </h1>
          <p className="text-xs sm:text-sm text-civic-muted">
            Access your civic complaints or administrative dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-forest-900 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="resident@example.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-white border border-civic-border rounded-md text-sm text-civic-text placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-900 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-9 py-2 bg-white border border-civic-border rounded-md text-sm text-civic-text placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-civic-muted hover:text-forest-900 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-forest-900 hover:bg-forest-800 text-white font-semibold text-sm rounded-md shadow-sm transition-all duration-150 disabled:opacity-50 mt-2 inline-flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4 opacity-80" />}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-civic-muted">
          Don&apos;t have an account yet?{' '}
          <Link to="/register" className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

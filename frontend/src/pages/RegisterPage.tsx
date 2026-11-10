import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { CIVIC_VISUALS } from '../constants/visuals.ts';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least 1 uppercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least 1 number';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must contain at least 1 special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full name (minimum 2 characters).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/complaints');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Registration failed. An account with this email may already exist.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 md:my-10 rounded-xl overflow-hidden bg-white border border-civic-border shadow-lg grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
      {/* Visual Editorial Left Side */}
      <div className="relative hidden md:flex md:col-span-5 bg-forest-950 text-white flex-col justify-between p-8 overflow-hidden">
        <img
          src={CIVIC_VISUALS.authCivicSquare}
          alt="Civic community square"
          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/80 to-forest-950/50" />

        <div className="relative z-10 space-y-2.5">
          <div className="w-9 h-9 rounded-md bg-forest-900 border border-forest-700 flex items-center justify-center text-lime-400 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-lime-400">
            Citizen Registration
          </span>
          <h2 className="font-display font-extrabold text-2xl text-white leading-tight">
            Be the pulse of your city.
          </h2>
        </div>

        <div className="relative z-10 space-y-2.5 pt-6 border-t border-forest-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant ticket geocoding &amp; tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Real-time status transition alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct link with municipal public works</span>
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
            Create Citizen Account
          </h1>
          <p className="text-xs sm:text-sm text-civic-muted">
            Join UrbanPulse to report and track neighborhood civic issues
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
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-civic-muted">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Citizen"
                required
                className="w-full pl-9 pr-3 py-2 bg-white border border-civic-border rounded-md text-sm text-civic-text placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 transition-all shadow-2xs"
              />
            </div>
          </div>

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
                placeholder="jane@example.com"
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
                placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
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
            <p className="text-[11px] text-civic-muted mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Must contain 8+ characters, uppercase letter, number, and special character.</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-forest-900 hover:bg-forest-800 text-white font-semibold text-sm rounded-md shadow-sm transition-all duration-150 disabled:opacity-50 mt-2 inline-flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{isSubmitting ? 'Creating Account...' : 'Register'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4 opacity-80" />}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-civic-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

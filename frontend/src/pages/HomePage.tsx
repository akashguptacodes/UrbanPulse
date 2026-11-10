import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { COMPLAINT_CATEGORIES, DISASTER_TYPES } from '../types/complaint.ts';
import { CIVIC_VISUALS } from '../constants/visuals.ts';
import { CivicGlobe } from '../components/CivicGlobe.tsx';
import {
  ArrowRight,
  Sparkles,
  MapPin,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-12 pb-10">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-forest-950 text-white shadow-xl border border-forest-800">
        {/* Background glow and subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-900/90 to-transparent z-10" />
        <img
          src={CIVIC_VISUALS.heroCityscape}
          alt="Modern sustainable city street and infrastructure"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-35 mix-blend-luminosity scale-102 transition-transform duration-700 hover:scale-100"
          loading="eager"
        />

        <div className="relative z-20 max-w-4xl px-6 py-14 sm:px-10 sm:py-20 md:py-24 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-lime-300 border border-emerald-400/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span className="tracking-wide uppercase text-[11px] font-bold">Next-Gen Civic Infrastructure</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
              Better cities begin with <br />
              <span className="bg-gradient-to-r from-lime-300 via-emerald-300 to-mint-300 bg-clip-text text-transparent">
                people who care.
              </span>
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Report neighborhood hazards, track live municipal progress, and help build safer, cleaner, and more resilient
              communities with verified audit trails and autonomous AI triage.
            </p>
          </div>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
            <Link
              to={isAuthenticated ? '/complaints/new' : '/login'}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-lime-400 hover:bg-lime-300 text-forest-950 font-bold text-sm tracking-tight transition-all duration-150 shadow-md hover:shadow-lg active:scale-98"
            >
              <span>Report a Civic Issue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to={isAuthenticated ? '/complaints' : '/login'}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 backdrop-blur-sm transition-all duration-150"
            >
              <span>{isAuthenticated ? 'View Complaints Queue' : 'Sign In to Track Reports'}</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </Link>
          </div>

          {isAuthenticated && user && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                Signed in as <strong className="text-white font-semibold">{user.full_name}</strong> ({user.role})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Interactive 3D Earth Globe — Global Civic Network in Motion */}
      <section className="space-y-4">
        <CivicGlobe />
      </section>

      {/* Trust & Live Metrics Ribbon */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-lg bg-white border border-civic-border shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-md bg-forest-50 text-forest-800 flex items-center justify-center shrink-0 border border-forest-100">
            <MapPin className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h3 className="font-display font-bold text-forest-950 text-sm">Hyperlocal Accuracy</h3>
            <p className="text-xs text-civic-muted mt-1 leading-relaxed">
              Pinpoint geolocation, reverse-geocoded landmarks, and high-resolution photographic evidence for swift municipal dispatch.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-civic-border shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
            <Cpu className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-display font-bold text-forest-950 text-sm">Autonomous AI Triage</h3>
            <p className="text-xs text-civic-muted mt-1 leading-relaxed">
              Multi-signal duplicate detection and NLP urgency scoring automatically prevent ticket flood and prioritize critical hazards.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-civic-border shadow-xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-md bg-lime-50 text-forest-900 flex items-center justify-center shrink-0 border border-lime-200">
            <ShieldCheck className="w-5 h-5 text-forest-800" />
          </div>
          <div>
            <h3 className="font-display font-bold text-forest-950 text-sm">Complete Transparency</h3>
            <p className="text-xs text-civic-muted mt-1 leading-relaxed">
              Immutable audit histories with public status updates from initial submission through field verification and resolution.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Supported Categories with Real Civic Photography */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Four Core Domains</div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-forest-950 mt-1">
              Supported Civic Categories
            </h2>
            <p className="text-xs sm:text-sm text-civic-muted mt-1 max-w-2xl">
              UrbanPulse routes community complaints directly to dedicated municipal response teams across four specialized domains.
            </p>
          </div>

          <Link
            to={isAuthenticated ? '/complaints/new' : '/login'}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>Submit a report in any domain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COMPLAINT_CATEGORIES.map((cat) => {
            const visual = CIVIC_VISUALS.categories[cat.key];
            const isDisaster = cat.key === 'DISASTERS';

            return (
              <div
                key={cat.key}
                className={`group relative rounded-lg overflow-hidden border bg-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  isDisaster ? 'border-red-200 ring-1 ring-red-100' : 'border-civic-border hover:border-forest-300'
                }`}
              >
                {/* Photo Thumbnail */}
                <div className="relative h-40 w-full overflow-hidden bg-forest-950">
                  <img
                    src={visual.image}
                    alt={cat.label}
                    className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                        isDisaster
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white/95 text-forest-900 shadow-xs'
                      }`}
                    >
                      {cat.key}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 text-white">
                    <span className="text-[11px] font-medium opacity-90">{visual.tagline}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-sm text-forest-950 group-hover:text-emerald-700 transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-civic-muted leading-relaxed line-clamp-3">{cat.description}</p>
                  </div>

                  {isDisaster ? (
                    <div className="pt-2.5 border-t border-red-100 text-[11px] space-y-1.5 bg-red-50/60 p-2 rounded">
                      <div className="font-bold text-red-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        Required Emergency Subtypes:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {DISASTER_TYPES.map((dt) => (
                          <span
                            key={dt.key}
                            className="px-1.5 py-0.5 bg-red-100 text-red-900 font-mono text-[10px] rounded font-semibold border border-red-200"
                          >
                            {dt.key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2.5 border-t border-civic-border flex items-center justify-between text-xs font-semibold text-emerald-700">
                      <span>Report in this category</span>
                      <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How UrbanPulse Operates — 3-Step Process */}
      <section className="rounded-xl bg-white border border-civic-border p-6 sm:p-10 shadow-xs space-y-6">
        <div className="max-w-2xl space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Workflow &amp; Triage</div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-forest-950">
            How UrbanPulse Operates
          </h2>
          <p className="text-xs sm:text-sm text-civic-muted">
            Complaints move through verified administrative state transitions with an immutable history log:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="relative space-y-3 p-5 rounded-lg bg-forest-50/30 border border-forest-100 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-forest-900 text-lime-400 font-bold font-display text-sm flex items-center justify-center shadow-xs">
                1
              </div>
              <h4 className="font-display font-bold text-sm text-forest-950">
                Submit with Exact Location
              </h4>
              <p className="text-xs text-civic-muted leading-relaxed">
                Provide a descriptive title, category details, and GPS coordinates so municipal workers can find the issue.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-forest-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Geocoded Ticket</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative space-y-3 p-5 rounded-lg bg-emerald-50/30 border border-emerald-100 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-emerald-700 text-white font-bold font-display text-sm flex items-center justify-center shadow-xs">
                2
              </div>
              <h4 className="font-display font-bold text-sm text-forest-950">
                Administrative Triage
              </h4>
              <p className="text-xs text-civic-muted leading-relaxed">
                Authorized municipal administrators review submissions, moving reports from Submitted to Under Review or In Progress.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Duplication &amp; Urgency Check</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative space-y-3 p-5 rounded-lg bg-mint-50/40 border border-mint-200/80 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-md bg-forest-800 text-mint-300 font-bold font-display text-sm flex items-center justify-center shadow-xs">
                3
              </div>
              <h4 className="font-display font-bold text-sm text-forest-950">
                Resolution &amp; Audit Trail
              </h4>
              <p className="text-xs text-civic-muted leading-relaxed">
                Every status update commits to the complaint timeline. View the exact transition reason and timestamp.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-semibold text-forest-900">
              <Clock className="w-3.5 h-3.5 text-forest-700" />
              <span>Verified Civic Resolution</span>
            </div>
          </div>
        </div>
      </section>

      {/* Community Participation Banner */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl text-center md:text-left">
          <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">
            Ready to improve your neighborhood?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Join thousands of active citizens who contribute daily to cleaner streets, well-lit pedestrian pathways, and rapid disaster alerts.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            to={isAuthenticated ? '/complaints/new' : '/register'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-lime-400 hover:bg-lime-300 text-forest-950 font-bold text-xs sm:text-sm tracking-tight transition-all duration-150 shadow-md active:scale-95"
          >
            <span>{isAuthenticated ? 'Report an Issue Now' : 'Create Free Citizen Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { COMPLAINT_CATEGORIES, DISASTER_TYPES } from '../types/complaint.ts';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-12 pb-8">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 md:p-12 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            UrbanPulse Civic Infrastructure Platform
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Report Neighborhood Issues. <br className="hidden sm:inline" />
            <span className="text-sky-600">Track Real Municipal Progress.</span>
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            UrbanPulse connects local citizens with city service departments. Submit reports for road craters,
            unlit streetlights, illegal trash accumulation, and civic emergencies with full audit transparency.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 justify-center md:justify-start">
            <Link
              to={isAuthenticated ? '/complaints/new' : '/login'}
              className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors text-center"
            >
              Report a Civic Issue
            </Link>
            <Link
              to={isAuthenticated ? '/complaints' : '/login'}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors text-center"
            >
              {isAuthenticated ? 'View Complaints Queue' : 'Sign In to Track Reports'}
            </Link>
          </div>

          {isAuthenticated && user && (
            <div className="text-xs text-slate-500 pt-1">
              Signed in as <span className="font-semibold text-slate-800">{user.full_name}</span> ({user.role})
            </div>
          )}
        </div>

        {/* Hero Visual Card */}
        <div className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3 shadow-inner">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Intake Categories</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <span className="font-semibold text-slate-800">Potholes & Roads</span>
              <span className="text-[11px] font-mono text-slate-500">POTHOLES</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <span className="font-semibold text-slate-800">Street Lighting</span>
              <span className="text-[11px] font-mono text-slate-500">STREET_LIGHTS</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <span className="font-semibold text-slate-800">Garbage & Waste</span>
              <span className="text-[11px] font-mono text-slate-500">GARBAGE</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <span className="font-semibold text-rose-700">Disasters / Emergencies</span>
              <span className="text-[11px] font-mono text-rose-600">DISASTERS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Fixed Categories Detailed Overview */}
      <section className="space-y-4">
        <div className="text-center md:text-left">
          <h2 className="text-xl font-bold text-slate-900">Supported Complaint Categories</h2>
          <p className="text-xs text-slate-500 mt-1">
            UrbanPulse currently routes complaints across four fixed civic domains:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLAINT_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col justify-between ${
                cat.key === 'DISASTERS' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{cat.label}</h3>
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {cat.key}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>
              </div>

              {cat.key === 'DISASTERS' && (
                <div className="mt-4 pt-3 border-t border-rose-100 text-[11px] space-y-1.5">
                  <div className="font-semibold text-rose-800">Required Emergency Subtypes:</div>
                  <div className="flex flex-wrap gap-1">
                    {DISASTER_TYPES.map((dt) => (
                      <span
                        key={dt.key}
                        className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-mono text-[10px] rounded font-medium"
                      >
                        {dt.key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How the Process Works */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">How UrbanPulse Operates</h2>
          <p className="text-xs text-slate-500 mt-1">
            Complaints move through verified administrative state transitions with an immutable history log:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">Submit with Exact Location</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide a descriptive title, category details, and GPS coordinates so municipal workers can find the issue.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">Administrative Triage</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized municipal administrators review submissions, moving reports from Submitted to Under Review or In Progress.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">Resolution & Audit Trail</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every status update commits to the complaint timeline. View the exact transition reason and timestamp.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

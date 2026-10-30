import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { getComplaintById, updateComplaintStatus } from '../services/complaintApi.ts';
import {
  ComplaintDetail,
  ComplaintStatus,
  ALLOWED_STATUS_TRANSITIONS,
  COMPLAINT_STATUSES,
} from '../types/complaint.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CategoryBadge } from '../components/CategoryBadge.tsx';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Admin status update state
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus | ''>('');
  const [reasonNotes, setReasonNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getComplaintById(id);
      setComplaint(data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Complaint could not be found or you do not have permission to view it.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  const isAdmin = user?.role === 'ADMIN';
  const allowedNextStatuses: ComplaintStatus[] = complaint
    ? ALLOWED_STATUS_TRANSITIONS[complaint.current_status] || []
    : [];

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !targetStatus) return;

    setStatusUpdateError(null);
    setStatusSuccessMessage(null);

    if (targetStatus === 'REJECTED' && (!reasonNotes.trim() || reasonNotes.trim().length === 0)) {
      setStatusUpdateError('A reason or administrative note is mandatory when rejecting a complaint.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const updated = await updateComplaintStatus(id, {
        new_status: targetStatus,
        reason_or_notes: reasonNotes.trim() ? reasonNotes.trim() : null,
      });

      setComplaint(updated);
      setTargetStatus('');
      setReasonNotes('');
      setStatusSuccessMessage(`Status successfully updated to '${targetStatus}'.`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update complaint status.';
      setStatusUpdateError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading complaint details...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="text-3xl text-slate-400 select-none">🔍</div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Complaint Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'The requested complaint does not exist or access is restricted.'}</p>
        </div>
        <Link
          to="/complaints"
          className="inline-block px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors"
        >
          Return to Complaints List
        </Link>
      </div>
    );
  }

  const createdDate = new Date(complaint.created_at).toLocaleString();
  const updatedDate = new Date(complaint.updated_at).toLocaleString();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation breadcrumb */}
      <div>
        <Link to="/complaints" className="text-xs font-semibold text-sky-600 hover:underline inline-block">
          ← Back to Complaints Queue
        </Link>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={complaint.primary_category} disasterType={complaint.disaster_type} />
              <StatusBadge status={complaint.current_status} size="md" />
              {complaint.is_duplicate ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  DUPLICATE REPORT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ORIGINAL REPORT
                </span>
              )}
              <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                ID: {complaint.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 pt-1">{complaint.title}</h1>
          </div>
        </div>

        {/* Duplicate & Original Clustering Banners */}
        {complaint.is_duplicate && complaint.parent_complaint_id && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <span>
                <strong>Duplicate Report:</strong> This complaint matches an earlier reported issue at the same location.
              </span>
            </div>
            <Link
              to={`/complaints/${complaint.parent_complaint_id}`}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs whitespace-nowrap shadow-sm transition-colors text-center"
            >
              View Original Complaint →
            </Link>
          </div>
        )}

        {!complaint.is_duplicate && (complaint.duplicate_count ?? 0) > 0 && (
          <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-lg flex items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2">
              <span className="text-base">📌</span>
              <span>
                <strong>Primary (Original) Report:</strong> {complaint.duplicate_count} subsequent citizen report{complaint.duplicate_count === 1 ? '' : 's'} {complaint.duplicate_count === 1 ? 'has' : 'have'} been consolidated with this issue.
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Description</h2>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-lg border border-slate-100">
            {complaint.description}
          </p>
        </div>

        {/* Location & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Location Coordinates</span>
            <div className="font-mono text-slate-800 font-medium">
              Lat: {Number(complaint.latitude).toFixed(6)} <br />
              Lng: {Number(complaint.longitude).toFixed(6)}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Street / Landmark</span>
            <div className="text-slate-800 font-medium line-clamp-2">
              {complaint.address_text || 'No landmark specified'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Reported By & Timestamps</span>
            <div className="text-slate-800 font-medium truncate">
              {complaint.citizen_name}
            </div>
            <div className="text-[10px] text-slate-400">
              Submitted: {createdDate} <br />
              Updated: {updatedDate}
            </div>
          </div>
        </div>
      </div>

      {/* AI Decision Support & Diagnostic Insights */}
      {complaint.ai_assessment && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 rounded-xl border border-indigo-200/80 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h2 className="font-bold text-sm text-indigo-950">AI Diagnostics & Priority Assessment</h2>
                <p className="text-[11px] text-slate-500">Autonomous multi-signal duplicate detection & NLP severity scoring</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
              Decision Support
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 1. Priority & Urgency Assessment */}
            <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Urgency & Priority Band</span>
                {complaint.ai_assessment.priority_assessment?.priority_level ? (
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      complaint.ai_assessment.priority_assessment.priority_level === 'CRITICAL'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : complaint.ai_assessment.priority_assessment.priority_level === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : complaint.ai_assessment.priority_assessment.priority_level === 'MEDIUM'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {complaint.ai_assessment.priority_assessment.priority_level} PRIORITY
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Evaluating...</span>
                )}
              </div>

              {complaint.ai_assessment.priority_assessment?.safety_override_applied && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-bold flex items-center gap-2">
                  <span>🚨</span>
                  <span>Safety Override Triggered: Immediate Hazard Detected</span>
                </div>
              )}

              {complaint.ai_assessment.priority_assessment?.severity_score !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Severity Score</span>
                    <span className="font-mono font-bold text-slate-900">
                      {complaint.ai_assessment.priority_assessment.severity_score.toFixed(1)} / 100.0
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        complaint.ai_assessment.priority_assessment.severity_score >= 75
                          ? 'bg-red-600'
                          : complaint.ai_assessment.priority_assessment.severity_score >= 50
                          ? 'bg-amber-500'
                          : complaint.ai_assessment.priority_assessment.severity_score >= 25
                          ? 'bg-sky-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, complaint.ai_assessment.priority_assessment.severity_score))}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                {complaint.ai_assessment.priority_assessment?.explanation || 'Awaiting priority assessment evaluation.'}
              </p>

              {isAdmin && complaint.ai_assessment.priority_assessment?.detected_indicators && complaint.ai_assessment.priority_assessment.detected_indicators.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Extracted Risk Indicators (Admin Only):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {complaint.ai_assessment.priority_assessment.detected_indicators.map((ind, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          ind.is_negated
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}
                      >
                        {ind.matched_phrase} (+{ind.severity_contribution})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Duplicate Detection Insights */}
            <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Duplicate Check</span>
                {complaint.is_duplicate || complaint.ai_assessment.duplicate_check?.has_potential_duplicate ? (
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Potential Duplicate
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Original Issue
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
                {complaint.is_duplicate
                  ? `This complaint is flagged as a duplicate of an earlier issue at this location.`
                  : (complaint.ai_assessment.duplicate_check?.citizen_advisory || 'Original complaint registered for this location.')}
              </div>

              {complaint.ai_assessment.duplicate_check?.top_match && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Nearest Match Distance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {complaint.ai_assessment.duplicate_check.top_match.distance_meters.toFixed(1)} meters
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Similarity Match Score:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(complaint.ai_assessment.duplicate_check.top_match.combined_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    &ldquo;{complaint.ai_assessment.duplicate_check.top_match.explanation}&rdquo;
                  </p>
                </div>
              )}

              {complaint.ai_assessment.duplicate_check?.candidates_evaluated !== undefined && (
                <div className="text-[11px] text-slate-400">
                  Evaluated against {complaint.ai_assessment.duplicate_check.candidates_evaluated} nearby active complaint(s).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Status Management Console */}
      {isAdmin && (
        <div className="bg-purple-50/50 rounded-xl border border-purple-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠️</span>
              <h2 className="font-bold text-sm text-purple-950">Administrative Status Management</h2>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Admin Authorized
            </span>
          </div>

          {statusSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
              {statusSuccessMessage}
            </div>
          )}

          {statusUpdateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
              {statusUpdateError}
            </div>
          )}

          {allowedNextStatuses.length === 0 ? (
            <div className="p-4 bg-white rounded-lg border border-purple-100 text-xs text-slate-600">
              This complaint is in terminal status <span className="font-bold text-slate-900">{complaint.current_status}</span>. Per municipal policy, no further state transitions are permitted.
            </div>
          ) : (
            <form onSubmit={handleStatusUpdate} className="space-y-4 bg-white p-4 rounded-lg border border-purple-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Target Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Choose Next Status --</option>
                    {allowedNextStatuses.map((st) => {
                      const desc = COMPLAINT_STATUSES.find((s) => s.key === st)?.label || st;
                      return (
                        <option key={st} value={st}>
                          {desc} ({st})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Administrative Reason / Note{' '}
                    {targetStatus === 'REJECTED' && <span className="text-red-500 font-bold">* Required</span>}
                  </label>
                  <input
                    type="text"
                    value={reasonNotes}
                    onChange={(e) => setReasonNotes(e.target.value)}
                    placeholder={
                      targetStatus === 'REJECTED'
                        ? 'Mandatory: reason for rejection (e.g. duplicate of #123)'
                        : 'Optional note or dispatch instructions'
                    }
                    maxLength={1000}
                    required={targetStatus === 'REJECTED'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!targetStatus || isUpdatingStatus}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Committing Status Update...' : 'Commit Status Transition'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Status History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Resolution History & Audit Timeline</h2>
        <p className="text-xs text-slate-500">
          Append-only chronological record of every status transition committed to PostgreSQL.
        </p>

        {complaint.status_history && complaint.status_history.length > 0 ? (
          <div className="space-y-4 pt-2">
            {complaint.status_history.map((record, index) => {
              const recordDate = new Date(record.created_at).toLocaleString();
              return (
                <div key={record.id || index} className="flex gap-4 items-start text-xs border-l-2 border-slate-200 pl-4 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-600 absolute -left-[5px] top-1.5 ring-4 ring-white" />
                  <div className="space-y-1 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={record.new_status} />
                        {record.previous_status && (
                          <span className="text-slate-400 text-[11px]">
                            from <span className="font-semibold text-slate-600">{record.previous_status}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{recordDate}</span>
                    </div>

                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-800">{record.changed_by}</span>
                      {record.reason_or_notes && (
                        <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                          &ldquo;{record.reason_or_notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3">No status history records available.</div>
        )}
      </div>
    </div>
  );
};

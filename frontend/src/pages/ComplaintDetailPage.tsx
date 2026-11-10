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
import {
  ArrowLeft,
  MapPin,
  User,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

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
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-civic-muted font-medium">Loading complaint details...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white p-6 sm:p-8 rounded-lg border border-civic-border text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-md bg-forest-50 text-forest-800 flex items-center justify-center mx-auto border border-forest-100">
          <Search className="w-6 h-6 opacity-60" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-forest-950">Complaint Not Found</h2>
          <p className="text-xs text-civic-muted">{error || 'The requested complaint does not exist or access is restricted.'}</p>
        </div>
        <Link
          to="/complaints"
          className="inline-block px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs rounded-md shadow-xs transition-all"
        >
          Return to Complaints List
        </Link>
      </div>
    );
  }

  const createdDate = new Date(complaint.created_at).toLocaleString();
  const updatedDate = new Date(complaint.updated_at).toLocaleString();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Complaints Queue</span>
        </Link>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-lg border border-civic-border shadow-xs p-5 sm:p-8 space-y-5">
        {/* Top Header */}
        <div className="space-y-2.5 pb-5 border-b border-civic-border">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={complaint.primary_category} disasterType={complaint.disaster_type} />
            <StatusBadge status={complaint.current_status} size="md" />

            {complaint.is_duplicate ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                DUPLICATE REPORT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-900 bg-forest-50 px-2.5 py-0.5 rounded border border-forest-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ORIGINAL REPORT
              </span>
            )}

            <span className="font-mono text-[11px] text-civic-muted bg-forest-50/50 px-2 py-0.5 rounded border border-forest-100">
              ID: {complaint.id}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-950 tracking-tight">
            {complaint.title}
          </h1>
        </div>

        {/* Duplicate & Original Clustering Banners */}
        {complaint.is_duplicate && complaint.parent_complaint_id && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Duplicate Report:</strong> This complaint matches an earlier reported issue at the same location.
              </span>
            </div>
            <Link
              to={`/complaints/${complaint.parent_complaint_id}`}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-xs whitespace-nowrap shadow-2xs transition-colors text-center"
            >
              View Original Complaint →
            </Link>
          </div>
        )}

        {!complaint.is_duplicate && (complaint.duplicate_count ?? 0) > 0 && (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-md flex items-center justify-between gap-3 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Primary (Original) Report:</strong> {complaint.duplicate_count} subsequent citizen report
                {complaint.duplicate_count === 1 ? '' : 's'} {complaint.duplicate_count === 1 ? 'has' : 'have'} been consolidated with this issue.
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold text-forest-950 uppercase tracking-wider">Description</h2>
          <p className="text-sm text-civic-text leading-relaxed whitespace-pre-line bg-forest-50/30 p-4 rounded-md border border-civic-border">
            {complaint.description}
          </p>
        </div>

        {/* Location & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1 text-xs">
          <div className="p-3.5 bg-forest-50/40 rounded-md border border-forest-100 space-y-1">
            <div className="flex items-center gap-1.5 text-forest-900 font-bold uppercase tracking-wider text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Location Coordinates</span>
            </div>
            <div className="font-mono text-civic-heading font-medium">
              Lat: {Number(complaint.latitude).toFixed(6)} <br />
              Lng: {Number(complaint.longitude).toFixed(6)}
            </div>
          </div>

          <div className="p-3.5 bg-forest-50/40 rounded-md border border-forest-100 space-y-1">
            <div className="flex items-center gap-1.5 text-forest-900 font-bold uppercase tracking-wider text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Street / Landmark</span>
            </div>
            <div className="text-civic-heading font-medium line-clamp-2">
              {complaint.address_text || 'No landmark specified'}
            </div>
          </div>

          <div className="p-3.5 bg-forest-50/40 rounded-md border border-forest-100 space-y-1">
            <div className="flex items-center gap-1.5 text-forest-900 font-bold uppercase tracking-wider text-[10px]">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>Reported By &amp; Timestamps</span>
            </div>
            <div className="text-civic-heading font-medium truncate">
              {complaint.citizen_name}
            </div>
            <div className="text-[10px] text-civic-muted">
              Submitted: {createdDate} <br />
              Updated: {updatedDate}
            </div>
          </div>
        </div>

        {/* Attached Photographic Evidence */}
        {complaint.evidence && complaint.evidence.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-civic-border">
            <h2 className="text-xs font-bold text-forest-950 uppercase tracking-wider">
              Photographic Evidence ({complaint.evidence.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {complaint.evidence.map((ev) => (
                <div key={ev.id} className="p-2.5 bg-forest-50/30 rounded-md border border-civic-border space-y-2">
                  {ev.download_url ? (
                    <a
                      href={ev.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded group bg-forest-950 relative"
                    >
                      <img
                        src={ev.download_url}
                        alt={ev.original_filename}
                        className="w-full h-40 object-cover rounded group-hover:scale-103 transition-transform duration-200 opacity-95"
                      />
                      <div className="absolute inset-0 bg-forest-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ExternalLink className="w-5 h-5 drop-shadow-md" />
                      </div>
                    </a>
                  ) : (
                    <div className="w-full h-40 bg-forest-50 rounded flex items-center justify-center text-civic-muted text-sm">
                      No Preview
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-civic-muted px-1">
                    <span className="truncate font-semibold text-civic-heading" title={ev.original_filename}>
                      {ev.original_filename}
                    </span>
                    <span>{(ev.file_size_bytes / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Decision Support & Diagnostic Insights */}
      {complaint.ai_assessment && (
        <div className="bg-gradient-to-br from-forest-50/70 via-white to-emerald-50/40 rounded-lg border border-forest-200/80 p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-forest-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-forest-900 text-lime-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm sm:text-base text-forest-950">
                  AI Diagnostics &amp; Priority Assessment
                </h2>
                <p className="text-[11px] text-civic-muted">
                  Autonomous multi-signal duplicate detection &amp; NLP severity scoring
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-forest-100 text-forest-900 px-2.5 py-0.5 rounded border border-forest-200">
              Decision Support
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 1. Priority & Urgency Assessment */}
            <div className="bg-white p-4 rounded-md border border-civic-border space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
                  Urgency &amp; Priority Band
                </span>
                {complaint.ai_assessment.priority_assessment?.priority_level ? (
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      complaint.ai_assessment.priority_assessment.priority_level === 'CRITICAL'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : complaint.ai_assessment.priority_assessment.priority_level === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : complaint.ai_assessment.priority_assessment.priority_level === 'MEDIUM'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {complaint.ai_assessment.priority_assessment.priority_level} PRIORITY
                  </span>
                ) : (
                  <span className="text-xs text-civic-muted">Evaluating...</span>
                )}
              </div>

              {complaint.ai_assessment.priority_assessment?.safety_override_applied && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-900 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Safety Override Triggered: Immediate Hazard Detected</span>
                </div>
              )}

              {complaint.ai_assessment.priority_assessment?.severity_score !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-civic-muted">
                    <span className="font-medium">Severity Score</span>
                    <span className="font-mono font-bold text-forest-950">
                      {complaint.ai_assessment.priority_assessment.severity_score.toFixed(1)} / 100.0
                    </span>
                  </div>
                  <div className="w-full bg-forest-100/60 rounded h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded transition-all duration-300 ${
                        complaint.ai_assessment.priority_assessment.severity_score >= 75
                          ? 'bg-red-600'
                          : complaint.ai_assessment.priority_assessment.severity_score >= 50
                          ? 'bg-amber-500'
                          : complaint.ai_assessment.priority_assessment.severity_score >= 25
                          ? 'bg-emerald-600'
                          : 'bg-forest-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, complaint.ai_assessment.priority_assessment.severity_score)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-civic-muted leading-relaxed">
                {complaint.ai_assessment.priority_assessment?.explanation ||
                  'Awaiting priority assessment evaluation.'}
              </p>

              {isAdmin &&
                complaint.ai_assessment.priority_assessment?.detected_indicators &&
                complaint.ai_assessment.priority_assessment.detected_indicators.length > 0 && (
                  <div className="pt-2.5 border-t border-civic-border">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest-900 block mb-1">
                      Extracted Risk Indicators (Admin Only):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {complaint.ai_assessment.priority_assessment.detected_indicators.map((ind, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                            ind.is_negated
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : 'bg-forest-50 text-forest-800 border border-forest-200'
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
            <div className="bg-white p-4 rounded-md border border-civic-border space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest-900">Duplicate Check</span>
                {complaint.is_duplicate || complaint.ai_assessment.duplicate_check?.has_potential_duplicate ? (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Potential Duplicate
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-forest-100 text-forest-800 border border-forest-200">
                    Original Issue
                  </span>
                )}
              </div>

              <div className="p-3 bg-forest-50/40 rounded border border-forest-100 text-xs text-civic-text leading-relaxed">
                {complaint.is_duplicate
                  ? `This complaint is flagged as a duplicate of an earlier issue at this location.`
                  : complaint.ai_assessment.duplicate_check?.citizen_advisory ||
                    'Original complaint registered for this location.'}
              </div>

              {complaint.ai_assessment.duplicate_check?.top_match && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-civic-muted">
                    <span>Nearest Match Distance:</span>
                    <span className="font-mono font-bold text-forest-950">
                      {complaint.ai_assessment.duplicate_check.top_match.distance_meters.toFixed(1)} meters
                    </span>
                  </div>
                  <div className="flex justify-between text-civic-muted">
                    <span>Similarity Match Score:</span>
                    <span className="font-mono font-bold text-forest-950">
                      {(complaint.ai_assessment.duplicate_check.top_match.combined_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-civic-muted italic mt-1 bg-forest-50/30 p-2 rounded border border-forest-100">
                    &ldquo;{complaint.ai_assessment.duplicate_check.top_match.explanation}&rdquo;
                  </p>
                </div>
              )}

              {complaint.ai_assessment.duplicate_check?.candidates_evaluated !== undefined && (
                <div className="text-[11px] text-civic-muted pt-1">
                  Evaluated against {complaint.ai_assessment.duplicate_check.candidates_evaluated} nearby active complaint(s).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Status Management Console */}
      {isAdmin && (
        <div className="bg-purple-50/40 rounded-lg border border-purple-200 p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-purple-700 text-white flex items-center justify-center shadow-2xs">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-display font-bold text-sm sm:text-base text-purple-950">
                Administrative Status Management
              </h2>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
              Admin Authorized
            </span>
          </div>

          {statusSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusSuccessMessage}</span>
            </div>
          )}

          {statusUpdateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{statusUpdateError}</span>
            </div>
          )}

          {allowedNextStatuses.length === 0 ? (
            <div className="p-3.5 bg-white rounded border border-purple-100 text-xs text-civic-muted">
              This complaint is in terminal status{' '}
              <span className="font-bold text-forest-950">{complaint.current_status}</span>. Per municipal policy, no
              further state transitions are permitted.
            </div>
          ) : (
            <form onSubmit={handleStatusUpdate} className="space-y-3.5 bg-white p-4 rounded-md border border-purple-100 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider mb-1">
                    Select Target Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                    required
                    className="w-full px-3 py-1.5 border border-purple-200 rounded-md text-xs bg-white text-forest-950 focus:outline-hidden focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-all shadow-2xs"
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
                  <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-1.5 border border-purple-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!targetStatus || isUpdatingStatus}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-md transition-all shadow-2xs disabled:opacity-50 active:scale-98"
                >
                  {isUpdatingStatus ? 'Committing Status Update...' : 'Commit Status Transition'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Status History Timeline */}
      <div className="bg-white rounded-lg border border-civic-border shadow-xs p-5 sm:p-8 space-y-3.5">
        <h2 className="font-display text-base font-bold text-forest-950">Resolution History &amp; Audit Timeline</h2>
        <p className="text-xs text-civic-muted">
          Append-only chronological record of every status transition committed to PostgreSQL.
        </p>

        {complaint.status_history && complaint.status_history.length > 0 ? (
          <div className="space-y-3.5 pt-3">
            {complaint.status_history.map((record, index) => {
              const recordDate = new Date(record.created_at).toLocaleString();
              return (
                <div key={record.id || index} className="flex gap-3.5 items-start text-xs border-l-2 border-forest-200 pl-3.5 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[6px] top-1.5 ring-2 ring-white" />
                  <div className="space-y-1 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={record.new_status} />
                        {record.previous_status && (
                          <span className="text-civic-muted text-[11px]">
                            from <span className="font-semibold text-civic-heading">{record.previous_status}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-civic-muted">{recordDate}</span>
                    </div>

                    <div className="text-civic-heading">
                      <span className="font-semibold text-forest-950">{record.changed_by}</span>
                      {record.reason_or_notes && (
                        <p className="mt-1 text-civic-muted bg-forest-50/50 p-2.5 rounded border border-civic-border italic">
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
          <div className="text-xs text-civic-muted py-2">No status history records available.</div>
        )}
      </div>
    </div>
  );
};

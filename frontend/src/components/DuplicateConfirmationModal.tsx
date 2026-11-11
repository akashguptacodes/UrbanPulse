import React from 'react';
import { DuplicateMatchItem } from '../types/complaint.ts';
import {
  AlertTriangle,
  ExternalLink,
  MapPin,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

interface DuplicateConfirmationModalProps {
  isOpen: boolean;
  matches: DuplicateMatchItem[];
  isSubmitting: boolean;
  onDiscard: () => void;
  onConfirmProceed: () => void;
  onClose: () => void;
}

export const DuplicateConfirmationModal: React.FC<DuplicateConfirmationModalProps> = ({
  isOpen,
  matches,
  isSubmitting,
  onDiscard,
  onConfirmProceed,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-amber-50/60 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-slate-900 font-heading">
                Similar Reports Found Nearby
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                We detected <span className="font-semibold text-slate-800">{matches.length} existing {matches.length === 1 ? 'complaint' : 'complaints'}</span> near this location. Review them below to avoid creating duplicate municipal tickets:
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Similar Complaints List */}
        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 flex-1">
          {matches.map((item, idx) => {
            const distance = item.distance_meters != null
              ? `${Math.round(item.distance_meters)}m away`
              : 'Nearby';

            const simPercent = Math.round((item.similarity_score || 0) * 100);

            return (
              <div
                key={item.id || idx}
                className="pt-3 first:pt-0 pb-1 flex flex-col gap-2 rounded-md hover:bg-slate-50/80 p-2.5 transition-colors border border-transparent hover:border-slate-200"
              >
                {/* Badges & Meta */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {distance}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      {simPercent}% Match
                    </span>
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {item.current_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Complaint Title */}
                <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                  {item.title}
                </h4>

                {/* Description Snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Address & View Details Link */}
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[280px]">
                    {item.address_text ? `📍 ${item.address_text}` : 'Coordinates on record'}
                  </span>
                  <a
                    href={`/complaints/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                  >
                    <span>Inspect Ticket</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Choice Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Is your report describing one of these existing issues?
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Option 1: Discard */}
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Yes, Discard Mine</span>
            </button>

            {/* Option 2: Keep Report */}
            <button
              type="button"
              onClick={onConfirmProceed}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>No, Mine is Different</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { PaginationMeta } from '../types/complaint.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (newPage: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange, disabled = false }) => {
  const { page, totalPages, total, limit } = meta;

  if (totalPages <= 1 && total === 0) {
    return null;
  }

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-civic-border text-xs text-civic-muted">
      <div className="font-medium">
        Showing <span className="font-semibold text-civic-heading">{startItem}</span> to{' '}
        <span className="font-semibold text-civic-heading">{endItem}</span> of{' '}
        <span className="font-semibold text-civic-heading">{total}</span> results
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          aria-label="Previous Page"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-civic-border bg-white hover:bg-forest-50/50 hover:border-forest-200 text-civic-heading disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-2xs active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-civic-muted" />
          <span>Previous</span>
        </button>

        <span className="px-3 py-1.5 font-semibold text-civic-heading bg-forest-50/70 border border-forest-100 rounded-md">
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
          aria-label="Next Page"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-civic-border bg-white hover:bg-forest-50/50 hover:border-forest-200 text-civic-heading disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-2xs active:scale-95"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5 text-civic-muted" />
        </button>
      </div>
    </div>
  );
};
